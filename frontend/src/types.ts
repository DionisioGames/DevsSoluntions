export type UserRole = "professor" | "secretaria";

export interface User {
  id: number;
  nome: string;
  email: string;
  telefone?: string | null;
  tipo: UserRole;
  email_verificado?: boolean;
  ativo?: boolean;
}

export interface Room {
  id: number;
  nome: string;
  bloco: string;
  andar: number;
  tipo: string;
  capacidade: number;
  disponivel: boolean;
}

export interface Reservation {
  id: number;
  sala_id: number;
  professor_id: number;
  criado_por_id: number;
  data: string;
  hora_inicio: string;
  hora_fim: string;
  status: "pendente" | "aprovada" | "rejeitada" | "cancelada" | string;
  status_cancelamento?: string;
  motivo_rejeicao?: string | null;
  motivo_cancelamento?: string | null;
}

export interface ReportSummary {
  total_salas: number;
  total_reservas: number;
  reservas_pendentes: number;
  reservas_aprovadas: number;
  reservas_rejeitadas: number;
  reservas_canceladas: number;
}

export interface LoginChallenge {
  challenge_id: string;
  expira_em: string;
}

export interface AuthResponse {
  token: string;
  usuario: User;
}
