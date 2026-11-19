import {
  BookOpen,
  Building2,
  CalendarDays,
  ClipboardList,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";

const pageTitles: Record<string, string> = {
  "/": "Visão geral",
  "/salas": "Salas",
  "/reservas": "Reservas",
};

export function AppLayout() {
  const { user, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { pathname } = useLocation();
  const title = pageTitles[pathname] ?? "Área de gestão";
  const isProfessor = user?.tipo === "professor";
  const closeMenu = () => setMobileMenuOpen(false);

  return (
    <div className="app-shell">
      {mobileMenuOpen && (
        <button
          className="mobile-backdrop"
          aria-label="Fechar menu"
          onClick={closeMenu}
        />
      )}
      <aside className={`sidebar ${mobileMenuOpen ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><BookOpen size={21} /></div>
          <div>
            <strong>Devs Soluntions</strong>
            <span>Gestão acadêmica</span>
          </div>
          <button className="icon-button sidebar-close" aria-label="Fechar menu" onClick={closeMenu}>
            <X size={19} />
          </button>
        </div>
        <div className="sidebar-section-label">MENU PRINCIPAL</div>
        <nav className="sidebar-nav" aria-label="Navegação principal">
          <NavLink to="/" end onClick={closeMenu}>
            <ClipboardList size={19} /><span>Visão geral</span>
          </NavLink>
          <NavLink to="/salas" onClick={closeMenu}>
            <Building2 size={19} /><span>Salas</span>
          </NavLink>
          <NavLink to="/reservas" onClick={closeMenu}>
            <CalendarDays size={19} /><span>{isProfessor ? "Minhas reservas" : "Reservas"}</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sidebar-user">
            <div className="avatar">{user?.nome.slice(0, 1).toUpperCase() ?? "U"}</div>
            <div className="sidebar-user-meta">
              <strong>{user?.nome ?? "Usuário"}</strong>
              <span>{isProfessor ? "Professor(a)" : "Secretaria"}</span>
            </div>
          </div>
          <button className="logout-button" onClick={signOut}>
            <LogOut size={18} /><span>Sair da conta</span>
          </button>
        </div>
      </aside>

      <div className="main-column">
        <header className="topbar">
          <button
            className="icon-button menu-toggle"
            aria-label="Abrir menu"
            onClick={() => setMobileMenuOpen(true)}
          >
            <Menu size={21} />
          </button>
          <div>
            <p className="topbar-eyebrow">Devs Soluntions</p>
            <h1>{title}</h1>
          </div>
          <div className="topbar-user">
            <span className="topbar-user-name">{user?.nome}</span>
            <div className="avatar avatar-light">{user?.nome.slice(0, 1).toUpperCase()}</div>
          </div>
        </header>
        <main className="page-content"><Outlet /></main>
      </div>
    </div>
  );
}
