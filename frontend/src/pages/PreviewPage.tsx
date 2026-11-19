import {
  BookOpen,
  Building2,
  CalendarDays,
  Check,
  ClipboardList,
  DoorOpen,
  Eye,
  Layers3,
  Search,
  Users,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import type { UserRole } from "../types";
import { StatusBadge } from "../components/StatusBadge";

const rooms = [
  { id: 1, nome: "Laboratório 01", bloco: "A", andar: 1, tipo: "Laboratório", capacidade: 30, disponivel: true },
  { id: 2, nome: "Sala Multiuso", bloco: "B", andar: 2, tipo: "Sala de aula", capacidade: 45, disponivel: true },
  { id: 3, nome: "Laboratório de Redes", bloco: "C", andar: 1, tipo: "Informática", capacidade: 24, disponivel: false },
  { id: 4, nome: "Sala 204", bloco: "A", andar: 2, tipo: "Sala de aula", capacidade: 36, disponivel: true },
];

const reservations = [
  { id: 101, sala_id: 1, professor: "João Silva", data: "2026-11-20", inicio: "08:00", fim: "10:00", status: "pendente" },
  { id: 102, sala_id: 2, professor: "Maria Santos", data: "2026-11-20", inicio: "10:30", fim: "12:00", status: "aprovada" },
  { id: 103, sala_id: 4, professor: "Carlos Oliveira", data: "2026-11-21", inicio: "13:30", fim: "15:30", status: "rejeitada" },
];

type PreviewSection = "visao" | "salas" | "reservas";

export function PreviewPage() {
  const [role, setRole] = useState<UserRole>("professor");
  const [section, setSection] = useState<PreviewSection>("visao");
  const [query, setQuery] = useState("");
  const isSecretary = role === "secretaria";

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return rooms.filter((room) =>
      !normalized || `${room.nome} ${room.bloco} ${room.tipo}`.toLowerCase().includes(normalized),
    );
  }, [query]);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"><BookOpen size={21} /></div>
          <div><strong>Devs Soluntions</strong><span>Modo de prévia</span></div>
        </div>
        <div className="sidebar-section-label">MENU PRINCIPAL</div>
        <nav className="sidebar-nav" aria-label="Prévia do menu">
          <button className={section === "visao" ? "active" : ""} onClick={() => setSection("visao")}><ClipboardList size={19} /><span>Visão geral</span></button>
          <button className={section === "salas" ? "active" : ""} onClick={() => setSection("salas")}><Building2 size={19} /><span>Salas</span></button>
          <button className={section === "reservas" ? "active" : ""} onClick={() => setSection("reservas")}><CalendarDays size={19} /><span>{isSecretary ? "Reservas" : "Minhas reservas"}</span></button>
        </nav>
        <div className="sidebar-footer">
          <div className="preview-role-switch" aria-label="Perfil da prévia">
            <button className={role === "professor" ? "active" : ""} onClick={() => setRole("professor")}>Professor</button>
            <button className={role === "secretaria" ? "active" : ""} onClick={() => setRole("secretaria")}>Secretaria</button>
          </div>
          <div className="sidebar-user">
            <div className="avatar">{isSecretary ? "S" : "J"}</div>
            <div className="sidebar-user-meta">
              <strong>{isSecretary ? "Secretaria" : "João Silva"}</strong>
              <span>Dados demonstrativos</span>
            </div>
          </div>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <div>
            <p className="topbar-eyebrow">Devs Soluntions</p>
            <h1>{section === "visao" ? "Visão geral" : section === "salas" ? "Salas" : "Reservas"}</h1>
          </div>
          <div className="preview-top-badge"><Eye size={16} /> Prévia visual</div>
        </header>

        <main className="page-content">
          {section === "visao" && <PreviewDashboard role={role} goTo={setSection} />}
          {section === "salas" && (
            <div className="page-stack">
              <section className="page-intro-row">
                <div><p className="eyebrow">ESPAÇOS ACADÊMICOS</p><h2>Salas</h2><p className="muted">Consulte os espaços disponíveis para suas atividades.</p></div>
                <div className="room-count"><Building2 size={18} /><strong>{rooms.filter((room) => room.disponivel).length}</strong><span>salas disponíveis</span></div>
              </section>
              <section className="panel">
                <div className="list-toolbar">
                  <div><h3>Todos os espaços</h3><span className="toolbar-subtitle">{rooms.length} salas cadastradas</span></div>
                  <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por sala, bloco ou tipo" /></label>
                </div>
                <div className="room-grid">
                  {filteredRooms.map((room) => (
                    <article className="room-card" key={room.id}>
                      <div className="room-card-top"><div className="room-icon"><Building2 size={22} /></div><span className={`availability ${room.disponivel ? "available" : "unavailable"}`}><i />{room.disponivel ? "Disponível" : "Indisponível"}</span></div>
                      <p className="room-type">{room.tipo}</p>
                      <h3>{room.nome}</h3>
                      <div className="room-details"><span><Layers3 size={15} /> Bloco {room.bloco} · {room.andar}º andar</span><span><Users size={15} /> Capacidade para {room.capacidade} pessoas</span></div>
                      {room.disponivel && <button className="room-action" onClick={() => setSection("reservas")}>Solicitar reserva <span>→</span></button>}
                    </article>
                  ))}
                </div>
              </section>
            </div>
          )}
          {section === "reservas" && <PreviewReservations role={role} />}
        </main>
      </div>
    </div>
  );
}

function PreviewDashboard({ role, goTo }: { role: UserRole; goTo: (section: PreviewSection) => void }) {
  const isSecretary = role === "secretaria";
  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div><p className="eyebrow">PAINEL DE CONTROLE</p><h2>Olá, {isSecretary ? "Secretaria" : "João"} <span className="wave">✦</span></h2><p className="muted">{isSecretary ? "Acompanhe as reservas e a ocupação das salas." : "Confira sua agenda e encontre o espaço ideal para sua próxima aula."}</p></div>
        <button className="button button-primary" onClick={() => goTo("reservas")}>{isSecretary ? "Gerenciar reservas" : "Nova reserva"}</button>
      </section>
      <section className="metric-grid">
        <Metric label="Salas cadastradas" value={4} tone="blue" foot="Espaços disponíveis" />
        <Metric label="Total de reservas" value={12} tone="purple" foot="Registros no sistema" />
        <Metric label="Aguardando aprovação" value={3} tone="orange" foot="Solicitações pendentes" />
        <Metric label="Reservas aprovadas" value={8} tone="green" foot="Horários confirmados" />
      </section>
      <section className="panel">
        <div className="panel-heading"><div><p className="eyebrow">AÇÃO NECESSÁRIA</p><h3>{isSecretary ? "Reservas aguardando aprovação" : "Suas reservas recentes"}</h3></div><button className="inline-link" onClick={() => goTo("reservas")}>Ver todas →</button></div>
        <div className="table-wrap"><table><thead><tr><th>SALA</th><th>DATA</th><th>HORÁRIO</th><th>STATUS</th></tr></thead><tbody>{reservations.map((reservation) => <tr key={reservation.id}><td><strong>{rooms.find((room) => room.id === reservation.sala_id)?.nome}</strong><small className="cell-subtitle">{reservation.professor}</small></td><td>{reservation.data}</td><td>{reservation.inicio} – {reservation.fim}</td><td><StatusBadge status={reservation.status} /></td></tr>)}</tbody></table></div>
      </section>
    </div>
  );
}

function PreviewReservations({ role }: { role: UserRole }) {
  const isProfessor = role === "professor";
  return (
    <div className="page-stack">
      <section className="page-intro-row"><div><p className="eyebrow">{isProfessor ? "AGENDA ACADÊMICA" : "GESTÃO DE SOLICITAÇÕES"}</p><h2>{isProfessor ? "Minhas reservas" : "Reservas"}</h2><p className="muted">{isProfessor ? "Solicite um espaço e acompanhe o andamento das suas reservas." : "Analise solicitações e acompanhe as reservas do campus."}</p></div></section>
      {isProfessor && <section className="panel booking-panel"><div className="panel-heading"><div><p className="eyebrow">NOVA SOLICITAÇÃO</p><h3>Reservar uma sala</h3></div><div className="booking-icon"><CalendarDays size={21} /></div></div><div className="booking-form"><div className="form-field form-field-wide"><label>Sala</label><select defaultValue=""><option value="">Selecione uma sala</option>{rooms.filter((room) => room.disponivel).map((room) => <option key={room.id}>{room.nome}</option>)}</select></div><div className="form-field"><label>Data</label><input type="date" /></div><div className="form-field"><label>Horário de início</label><input type="time" /></div><div className="form-field"><label>Horário de término</label><input type="time" /></div><div className="booking-submit"><span>Reserva enviada para aprovação</span><button className="button button-primary">Enviar solicitação</button></div></div></section>}
      <section className="panel"><div className="list-toolbar"><div><h3>Solicitações e reservas</h3><span className="toolbar-subtitle">3 registros encontrados</span></div></div><div className="table-wrap"><table><thead><tr><th>SALA / SOLICITANTE</th><th>DATA</th><th>HORÁRIO</th><th>STATUS</th>{!isProfessor && <th>AÇÕES</th>}</tr></thead><tbody>{reservations.map((reservation) => <tr key={reservation.id}><td><strong>{rooms.find((room) => room.id === reservation.sala_id)?.nome}</strong><small className="cell-subtitle">{reservation.professor}</small></td><td>{reservation.data}</td><td>{reservation.inicio} – {reservation.fim}</td><td><StatusBadge status={reservation.status} /></td>{!isProfessor && <td><div className="row-actions">{reservation.status === "pendente" ? <><button className="button button-approve"><Check size={16} /> Aprovar</button><button className="button button-reject"><X size={16} /> Rejeitar</button></> : <span className="muted">—</span>}</div></td>}</tr>)}</tbody></table></div></section>
    </div>
  );
}

function Metric({ label, value, tone, foot }: { label: string; value: number; tone: string; foot: string }) {
  return <article className="metric-card"><div className="metric-card-top"><div className={`metric-icon tone-${tone}`}><DoorOpen /></div></div><p>{label}</p><strong className="metric-value">{value}</strong><span className="metric-foot">{foot}</span></article>;
}
