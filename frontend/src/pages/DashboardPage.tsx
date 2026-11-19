import {
  ArrowRight,
  CalendarCheck2,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock3,
  DoorOpen,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, LoadingState } from "../components/Feedback";
import { StatusBadge } from "../components/StatusBadge";
import type { ReportSummary, Reservation, Room } from "../types";
import { formatDate, formatTime } from "../utils";

export function DashboardPage() {
  const { user } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [report, setReport] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const isSecretary = user?.tipo === "secretaria";

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const [reservationResponse, roomResponse] = await Promise.all([
          api.get<Reservation[]>("/reservas", { params: { limit: 100 } }),
          api.get<Room[]>("/salas", { params: { limit: 100 } }),
        ]);
        if (!active) return;
        setReservations(reservationResponse.data);
        setRooms(roomResponse.data);
        if (isSecretary) {
          const { data } = await api.get<ReportSummary>("/relatorios");
          if (active) setReport(data);
        }
      } catch (requestError) {
        if (active) setError(getErrorMessage(requestError));
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => { active = false; };
  }, [isSecretary]);

  const pending = reservations.filter((item) => item.status === "pendente");
  const approved = reservations.filter((item) => item.status === "aprovada");
  const roomNames = new Map(rooms.map((room) => [room.id, room.nome]));
  const visibleReservations = (isSecretary ? pending : reservations)
    .slice()
    .sort((a, b) => `${a.data}T${a.hora_inicio}`.localeCompare(`${b.data}T${b.hora_inicio}`))
    .slice(0, 5);

  return (
    <div className="page-stack">
      <section className="welcome-row">
        <div>
          <p className="eyebrow">PAINEL DE CONTROLE</p>
          <h2>Olá, {user?.nome.split(" ")[0]} <span className="wave">✦</span></h2>
          <p className="muted">{isSecretary ? "Acompanhe as reservas e a ocupação das salas." : "Confira sua agenda e encontre o espaço ideal para sua próxima aula."}</p>
        </div>
        <Link className="button button-primary" to="/reservas">
          {isSecretary ? "Gerenciar reservas" : "Nova reserva"} <ArrowRight size={17} />
        </Link>
      </section>

      {error && <ErrorState message={error} />}
      {loading ? <LoadingState /> : (
        <>
          <section className="metric-grid">
            {isSecretary ? (
              <>
                <MetricCard icon={<DoorOpen />} label="Salas cadastradas" value={report?.total_salas ?? rooms.length} tone="blue" foot="Espaços disponíveis na unidade" />
                <MetricCard icon={<CalendarDays />} label="Total de reservas" value={report?.total_reservas ?? reservations.length} tone="purple" foot="Registros em todos os status" />
                <MetricCard icon={<CalendarClock />} label="Aguardando aprovação" value={report?.reservas_pendentes ?? pending.length} tone="orange" foot="Solicitações para analisar" />
                <MetricCard icon={<CheckCircle2 />} label="Reservas aprovadas" value={report?.reservas_aprovadas ?? approved.length} tone="green" foot="Horários já confirmados" />
              </>
            ) : (
              <>
                <MetricCard icon={<CalendarDays />} label="Minhas reservas" value={reservations.length} tone="blue" foot="No seu histórico" />
                <MetricCard icon={<CalendarClock />} label="Aguardando aprovação" value={pending.length} tone="orange" foot="Solicitações em análise" />
                <MetricCard icon={<CalendarCheck2 />} label="Confirmadas" value={approved.length} tone="green" foot="Reservas aprovadas" />
                <MetricCard icon={<DoorOpen />} label="Salas disponíveis" value={rooms.filter((room) => room.disponivel).length} tone="purple" foot="Prontas para reservar" />
              </>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">{isSecretary ? "AÇÃO NECESSÁRIA" : "ACOMPANHAMENTO"}</p>
                <h3>{isSecretary ? "Reservas aguardando aprovação" : "Suas reservas recentes"}</h3>
              </div>
              <Link to="/reservas" className="inline-link">Ver todas <ArrowRight size={16} /></Link>
            </div>
            {visibleReservations.length === 0 ? (
              <EmptyState
                title={isSecretary ? "Tudo em dia" : "Sua agenda está livre"}
                description={isSecretary ? "Não há reservas pendentes de aprovação." : "Suas solicitações e reservas aparecerão aqui."}
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead><tr><th>SALA</th><th>DATA</th><th>HORÁRIO</th><th>STATUS</th></tr></thead>
                  <tbody>{visibleReservations.map((reservation) => (
                    <tr key={reservation.id}>
                      <td><strong>{roomNames.get(reservation.sala_id) ?? `Sala #${reservation.sala_id}`}</strong><small className="cell-subtitle">Reserva #{reservation.id}{isSecretary ? ` · Professor #${reservation.professor_id}` : ""}</small></td>
                      <td>{formatDate(reservation.data)}</td>
                      <td>{formatTime(reservation.hora_inicio)} – {formatTime(reservation.hora_fim)}</td>
                      <td><StatusBadge status={reservation.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <section className="dashboard-tip">
            <div className="tip-icon"><TrendingUp size={20} /></div>
            <div><strong>{isSecretary ? "Gestão em um só lugar" : "Planeje sua próxima aula"}</strong><p>{isSecretary ? "Mantenha a agenda do campus organizada. Revise solicitações pendentes regularmente." : "Consulte salas e horários disponíveis antes de enviar sua solicitação."}</p></div>
            <Link to={isSecretary ? "/reservas" : "/salas"} className="inline-link">{isSecretary ? "Revisar agora" : "Explorar salas"} <ArrowRight size={16} /></Link>
          </section>
        </>
      )}
    </div>
  );
}

function MetricCard({ icon, label, value, tone, foot }: { icon: ReactNode; label: string; value: number; tone: string; foot: string }) {
  return (
    <article className="metric-card">
      <div className="metric-card-top"><div className={`metric-icon tone-${tone}`}>{icon}</div><span className="metric-period"><Clock3 size={13} /> Geral</span></div>
      <p>{label}</p>
      <strong className="metric-value">{value}</strong>
      <span className="metric-foot">{foot}</span>
    </article>
  );
}
