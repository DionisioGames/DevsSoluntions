import { Building2, Users, Layers3, Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { ErrorState, EmptyState, LoadingState } from "../components/Feedback";
import type { Room } from "../types";

export function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    api.get<Room[]>("/salas", { params: { limit: 100 } })
      .then(({ data }) => { if (active) setRooms(data); })
      .catch((requestError: unknown) => { if (active) setError(getErrorMessage(requestError)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filteredRooms = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("pt-BR");
    if (!normalized) return rooms;
    return rooms.filter((room) =>
      `${room.nome} ${room.bloco} ${room.tipo}`.toLocaleLowerCase("pt-BR").includes(normalized),
    );
  }, [query, rooms]);

  return (
    <div className="page-stack">
      <section className="page-intro-row">
        <div><p className="eyebrow">ESPAÇOS ACADÊMICOS</p><h2>Salas</h2><p className="muted">Consulte os espaços disponíveis para suas atividades.</p></div>
        <div className="room-count"><Building2 size={18} /><strong>{rooms.filter((room) => room.disponivel).length}</strong><span>salas disponíveis</span></div>
      </section>
      <section className="panel">
        <div className="list-toolbar">
          <div><h3>Todos os espaços</h3><span className="toolbar-subtitle">{rooms.length} salas cadastradas</span></div>
          <label className="search-field"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar por sala, bloco ou tipo" aria-label="Buscar salas" /></label>
        </div>
        {error && <ErrorState message={error} />}
        {loading ? <LoadingState /> : filteredRooms.length === 0 ? (
          <EmptyState title="Nenhuma sala encontrada" description={query ? "Tente buscar por outro nome, bloco ou tipo." : "As salas aparecerão aqui quando forem cadastradas."} />
        ) : (
          <div className="room-grid">
            {filteredRooms.map((room) => (
              <article className="room-card" key={room.id}>
                <div className="room-card-top">
                  <div className="room-icon"><Building2 size={22} /></div>
                  <span className={`availability ${room.disponivel ? "available" : "unavailable"}`}><i />{room.disponivel ? "Disponível" : "Indisponível"}</span>
                </div>
                <p className="room-type">{room.tipo}</p>
                <h3>{room.nome}</h3>
                <div className="room-details">
                  <span><Layers3 size={15} /> Bloco {room.bloco} · {room.andar}º andar</span>
                  <span><Users size={15} /> Capacidade para {room.capacidade} pessoas</span>
                </div>
                {room.disponivel && <Link className="room-action" to="/reservas">Solicitar reserva <span>→</span></Link>}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
