import { ArrowLeft, ArrowRight, BookOpen, CheckCircle2, KeyRound, Mail } from "lucide-react";
import { useEffect, useState, type FormEvent } from "react";
import { Navigate } from "react-router-dom";
import { api, getErrorMessage } from "../api/client";
import { useAuth } from "../auth/AuthContext";
import type { AuthResponse, LoginChallenge } from "../types";

export function LoginPage() {
  const { user, signIn } = useAuth();
  const [challenge, setChallenge] = useState<LoginChallenge | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [resendWait, setResendWait] = useState(0);

  useEffect(() => {
    if (resendWait <= 0) return;
    const timeout = window.setTimeout(() => setResendWait((value) => value - 1), 1000);
    return () => window.clearTimeout(timeout);
  }, [resendWait]);

  if (user) return <Navigate to="/" replace />;

  async function submitCredentials(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post<LoginChallenge>("/auth/login", { email, senha: password });
      setChallenge(data);
      setPassword("");
      setResendWait(60);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function submitCode(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!challenge) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post<AuthResponse>("/auth/verificar-2fa", {
        challenge_id: challenge.challenge_id,
        codigo: code,
      });
      signIn(data.token, data.usuario);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
    } finally {
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!challenge) return;
    setError("");
    setBusy(true);
    try {
      const { data } = await api.post<LoginChallenge>("/auth/reenviar-codigo", {
        challenge_id: challenge.challenge_id,
      });
      setChallenge(data);
      setCode("");
      setResendWait(60);
    } catch (requestError) {
      setError(getErrorMessage(requestError));
      setResendWait(60);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-panel">
        <div className="auth-brand">
          <div className="brand-mark"><BookOpen size={23} /></div>
          <div><strong>Devs Soluntions</strong><span>Gestão acadêmica</span></div>
        </div>
        <div className="auth-content">
          <div className="auth-step-icon">
            {challenge ? <KeyRound size={25} /> : <Mail size={25} />}
          </div>
          {challenge ? (
            <>
              <div className="auth-overline">ETAPA 2 DE 2</div>
              <h1>Confirme sua identidade</h1>
              <p className="auth-description">
                Enviamos um código de seis dígitos para o e-mail associado a <strong>{email}</strong>.
                Informe-o abaixo para concluir o acesso.
              </p>
              <form className="auth-form" onSubmit={submitCode}>
                <label htmlFor="verification-code">Código de verificação</label>
                <input
                  id="verification-code"
                  className="code-input"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="000000"
                  value={code}
                  onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
                  required
                  autoFocus
                />
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button button-primary button-wide" disabled={busy || code.length !== 6}>
                  {busy ? "Verificando…" : "Verificar e entrar"} <ArrowRight size={17} />
                </button>
              </form>
              <div className="resend-row">
                <span>Não recebeu o código?</span>
                <button className="text-button" onClick={resendCode} disabled={busy || resendWait > 0}>
                  {resendWait > 0 ? `Reenviar em ${resendWait}s` : "Reenviar código"}
                </button>
              </div>
              <button className="back-link" onClick={() => { setChallenge(null); setCode(""); setError(""); }}>
                <ArrowLeft size={16} /> Voltar para o login
              </button>
            </>
          ) : (
            <>
              <div className="auth-overline">ÁREA RESTRITA</div>
              <h1>Bem-vindo de volta</h1>
              <p className="auth-description">Entre com suas credenciais institucionais para continuar.</p>
              <form className="auth-form" onSubmit={submitCredentials}>
                <label htmlFor="email">E-mail</label>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="nome@instituicao.edu.br"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  required
                />
                <label htmlFor="password">Senha</label>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Sua senha"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                {error && <p className="form-error" role="alert">{error}</p>}
                <button className="button button-primary button-wide" disabled={busy}>
                  {busy ? "Validando…" : "Entrar"} <ArrowRight size={17} />
                </button>
              </form>
              <div className="auth-security-note">
                <CheckCircle2 size={17} />
                <span>A autenticação em duas etapas protege sua conta.</span>
              </div>
            </>
          )}
        </div>
        <div className="auth-footer">© {new Date().getFullYear()} Devs Soluntions. Acesso seguro.</div>
      </section>
      <aside className="auth-aside">
        <div className="auth-aside-shape auth-shape-one" />
        <div className="auth-aside-shape auth-shape-two" />
        <div className="auth-aside-content">
          <span className="auth-aside-kicker">CAMPUS ORGANIZADO, TEMPO BEM APROVEITADO</span>
          <h2>O espaço certo para cada grande ideia.</h2>
          <p>Encontre salas, organize horários e acompanhe suas reservas em um só lugar.</p>
          <div className="auth-aside-proof">
            <div className="proof-icon"><CheckCircle2 size={22} /></div>
            <span><strong>Simples e seguro</strong><small>Controle de acesso por perfil e autenticação em duas etapas.</small></span>
          </div>
        </div>
        <span className="auth-aside-caption">PLATAFORMA DE GESTÃO DE ESPAÇOS</span>
      </aside>
    </main>
  );
}
