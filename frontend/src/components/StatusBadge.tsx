export function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pendente: "Pendente",
    aprovada: "Aprovada",
    rejeitada: "Rejeitada",
    cancelada: "Cancelada",
  };
  return (
    <span className={`status-badge status-${status}`}>
      <span className="status-dot" />
      {labels[status] ?? status}
    </span>
  );
}
