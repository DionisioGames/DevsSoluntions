import { ArrowRight, CalendarDays, Check, Clock3, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import { EmptyState, ErrorState, LoadingState } from "../components/Feedback";
import { StatusBadge } from "../components/StatusBadge";
import type { Reservation, Room, User } from "../types";
import { formatDate, formatTime } from "../utils";

export function ReservationsPage() {
  const { user } = useAuth();
  const isProfessor = user?.tipo === "professor";
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [professors, setProfessors] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [statusFilter, setStatusFilter] = useState("todas");
  const [roomId, setRoomId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [rejectingId, setRejectingId] = useState<number | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const params = statusFilter === "todas" ? { limit: 100 } : { limit: 100, status: statusFilter };
      const [reservationResponse, roomResponse] = await Promise.all([
        api.get<Reservation[]>("/reservas", { params }),
        api.get<Room[]>("/salas", { params: { limit: 100 } }),
      ]);
      setReservations(reservationResponse.data);
      setRooms(roomResponse.data);
      if (!isProfessor) {
        try {
          const { data } = await api.get<User[]>("/usuarios", { params: { limit: 100 } });
          setProfessors(data.filter((person) => person.tipo === "professor"));
        } catch {
          setProfessors([]);
        }
      }
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, [isProfessor, statusFilter]);

  useEffect(() => { void loadData(); }, [loadData]);

  const roomMap = useMemo(() => new Map(rooms.map((room) => [room.id, room])), [rooms]);
  const professorMap = useMemo(() => new Map(professors.map((person) => [person.id, person.nome])), [professors]);
  const availableRooms = rooms.filter((room) => room.disponivel);

  async function createReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setSaving(true);
    try {
      await api.post<Reservation>("/reservas", {
        sala_id: Number(roomId),
        data: date,
        hora_inicio: `${startTime}:00`,
        hora_fim: `${endTime}:00`,
      });
      setNotice("Solicitação de reserva enviada para análise.");
      setRoomId("");
      setDate("");
      setStartTime("");
      setEndTime("");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setSaving(false);
    }
  }

  async function approveReservation(reservationId: number) {
    setError("");
    setNotice("");
    try {
      await api.patch(`/reservas/${reservationId}/aprovar`);
      setNotice("Reserva aprovada com sucesso.");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    }
  }

  async function rejectReservation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (rejectingId === null) return;
    setError("");
    setNotice("");
    setRejecting(true);
    try {
      await api.patch(`/reservas/${rejectingId}/rejeitar`, { motivo: rejectionReason });
      setNotice("Reserva rejeitada.");
      setRejectingId(null);
      setRejectionReason("");
      await loadData();
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setRejecting(false);
    }
  }

  return (
    <div className="page-stack">
      <section className="page-intro-row">
        <div><p className="eyebrow">{isProfessor ? "AGENDA ACADÊMICA" : "GESTÃO DE SOLICITAÇÕES"}</p><h2>{isProfessor ? "Minhas reservas" : "Reservas"}</h2><p className="muted">{isProfessor ? "Solicite um espaço e acompanhe o andamento das suas reservas." : "Analise solicitações e acompanhe as reservas do campus."}</p></div>
        {isProfessor && <a className="button button-primary" href="#nova-reserva"><Plus size={18} /> Nova reserva</a>}
      </section>

      {error && <ErrorState message={error} />}
      {notice && <div className="success-banner" role="status"><Check size={18} />{notice}</div>}

      {isProfessor && (
        <section className="panel booking-panel" id="nova-reserva">
          <div className="panel-heading">
            <div><p className="eyebrow">NOVA SOLICITAÇÃO</p><h3>Reservar uma sala</h3></div>
            <div className="booking-icon"><CalendarDays size={21} /></div>
          </div>
          <p className="panel-description">Escolha uma sala e informe a data e o período desejados. A solicitação ficará pendente até ser analisada pela secretaria.</p>
          <form className="booking-form" onSubmit={createReservation}>
            <div className="form-field form-field-wide">
              <label htmlFor="room">Sala</label>
              <select id="room" value={roomId} onChange={(event) => setRoomId(event.target.value)} required>
                <option value="">Selecione uma sala</option>
                {availableRooms.map((room) => <option value={room.id} key={room.id}>{room.nome} · Bloco {room.bloco} · {room.tipo}</option>)}
              </select>
              {availableRooms.length === 0 && <span className="field-hint">Nenhuma sala disponível no momento.</span>}
            </div>
            <div className="form-field">
              <label htmlFor="reservation-date">Data</label>
              <input id="reservation-date" type="date" min={new Date().toISOString().slice(0, 10)} value={date} onChange={(event) => setDate(event.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="start-time">Horário de início</label>
              <input id="start-time" type="time" value={startTime} onChange={(event) => setStartTime(event.target.value)} required />
            </div>
            <div className="form-field">
              <label htmlFor="end-time">Horário de término</label>
              <input id="end-time" type="time" min={startTime || undefined} value={endTime} onChange={(event) => setEndTime(event.target.value)} required />
            </div>
            <div className="booking-submit">
              <span><Clock3 size={15} /> Reservas são enviadas para aprovação</span>
              <button className="button button-primary" disabled={saving || availableRooms.length === 0}>
                {saving ? "Enviando…" : "Enviar solicitação"} <ArrowRight size={17} />
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="panel">
        <div className="list-toolbar">
          <div><h3>{isProfessor ? "Histórico de reservas" : "Solicitações e reservas"}</h3><span className="toolbar-subtitle">{reservations.length} registros encontrados</span></div>
          <label className="filter-field"><span>Status</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option value="todas">Todos</option><option value="pendente">Pendentes</option><option value="aprovada">Aprovadas</option><option value="rejeitada">Rejeitadas</option><option value="cancelada">Canceladas</option></select></label>
        </div>
        {loading ? <LoadingState /> : reservations.length === 0 ? (
          <EmptyState title="Nenhuma reserva encontrada" description={statusFilter === "todas" ? "Ainda não há reservas para exibir." : "Não há reservas com o status selecionado."} />
        ) : (
          <div className="table-wrap">
            <table className="reservations-table">
              <thead><tr><th>SALA / SOLICITANTE</th><th>DATA</th><th>HORÁRIO</th><th>STATUS</th>{!isProfessor && <th className="actions-heading">AÇÕES</th>}</tr></thead>
              <tbody>{reservations.map((reservation) => {
                const room = roomMap.get(reservation.sala_id);
                const pending = reservation.status === "pendente";
                return (
                  <tr key={reservation.id}>
                    <td>
                      <strong>{room?.nome ?? `Sala #${reservation.sala_id}`}</strong>
                      <small className="cell-subtitle">{isProfessor ? `Reserva #${reservation.id}` : professorMap.get(reservation.professor_id) ?? `Professor #${reservation.professor_id}`}</small>
                    </td>
                    <td>{formatDate(reservation.data)}</td>
                    <td>{formatTime(reservation.hora_inicio)} – {formatTime(reservation.hora_fim)}</td>
                    <td><StatusBadge status={reservation.status} />{reservation.motivo_rejeicao && <small className="cell-subtitle reason-text">Motivo: {reservation.motivo_rejeicao}</small>}</td>
                    {!isProfessor && <td>
                      {pending ? <div className="row-actions">
                        <button className="button button-approve" onClick={() => void approveReservation(reservation.id)} aria-label={`Aprovar reserva ${reservation.id}`}><Check size={16} /> Aprovar</button>
                        <button className="button button-reject" onClick={() => { setRejectingId(reservation.id); setRejectionReason(""); }} aria-label={`Rejeitar reserva ${reservation.id}`}><X size={16} /> Rejeitar</button>
                      </div> : <span className="muted dash">—</span>}
                    </td>}
                  </tr>
                );
              })}</tbody>
            </table>
          </div>
        )}
      </section>

      {rejectingId !== null && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setRejectingId(null); }}>
          <section className="modal-card" role="dialog" aria-modal="true" aria-labelledby="reject-title">
            <div className="modal-heading"><div className="modal-icon"><X size={19} /></div><button className="icon-button" onClick={() => setRejectingId(null)} aria-label="Fechar"><X size={19} /></button></div>
            <h3 id="reject-title">Rejeitar reserva #{rejectingId}</h3>
            <p>Informe o motivo para que o professor entenda a decisão.</p>
            <form onSubmit={rejectReservation}>
              <label htmlFor="rejection-reason">Motivo da rejeição</label>
              <textarea id="rejection-reason" minLength={3} maxLength={500} rows={4} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Descreva o motivo…" required />
              <div className="modal-actions"><button type="button" className="button button-quiet" onClick={() => setRejectingId(null)}>Cancelar</button><button className="button button-danger" disabled={rejecting || rejectionReason.trim().length < 3}>{rejecting ? "Enviando…" : "Confirmar rejeição"}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
