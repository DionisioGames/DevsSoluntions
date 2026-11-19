import { CircleAlert, LoaderCircle } from "lucide-react";

export function LoadingState({ label = "Carregando dados…" }: { label?: string }) {
  return (
    <div className="feedback-state" role="status">
      <LoaderCircle className="spin" size={22} /> <span>{label}</span>
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="error-banner" role="alert">
      <CircleAlert size={18} /><span>{message}</span>
    </div>
  );
}

export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="empty-state">
      <div className="empty-state-icon"><CircleAlert size={22} /></div>
      <strong>{title}</strong>
      <p>{description}</p>
    </div>
  );
}
