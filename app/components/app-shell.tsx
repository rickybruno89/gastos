import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  CircleHelp,
  CreditCard,
  HandCoins,
  LayoutGrid,
  LogOut,
  Settings2,
  Users,
} from "lucide-react";
import { Brand } from "./brand";
import { Badge } from "./ui";

const sections = [
  { id: "mes", label: "Mi mes", icon: LayoutGrid },
  { id: "tarjetas", label: "Tarjetas", icon: CreditCard },
  { id: "compartidos", label: "Compartidos", icon: Users },
  { id: "deudas", label: "Deudas", icon: HandCoins },
];
export function AppShell({
  children,
  preview = false,
  section = "mes",
  onSection,
  name,
  email,
  signingOut,
  onSignOut,
  error,
}: {
  children: ReactNode;
  preview?: boolean;
  section?: string;
  onSection?: (id: string) => void;
  name?: string;
  email?: string;
  signingOut?: boolean;
  onSignOut?: () => void;
  error?: string;
}) {
  const navigation = preview ? (
    sections.map(({ id, label, icon: Icon }) => (
      <button
        key={id}
        className={section === id ? "nav-item active" : "nav-item"}
        onClick={() => onSection?.(id)}
        aria-current={section === id ? "page" : undefined}
      >
        <Icon size={19} />
        <span>{label}</span>
        {section === id && <span className="nav-indicator" />}
      </button>
    ))
  ) : (
    <>
      <NavLink className="nav-item" end to="/">
        <LayoutGrid size={19} />
        <span>Mi mes</span>
      </NavLink>
      <NavLink className="nav-item" to="/cuenta">
        <Settings2 size={19} />
        <span>Tu cuenta</span>
      </NavLink>
    </>
  );
  return (
    <div className="workspace">
      <a className="skip-link" href="#contenido">
        Saltar al contenido
      </a>
      <aside className="sidebar">
        <Brand />
        <div className="workspace-label">
          <span className="workspace-dot" />
          {preview ? "Espacio de ejemplo" : "Espacio personal"}
        </div>
        <p className="nav-label">PRINCIPAL</p>
        <nav aria-label="Navegación principal">{navigation}</nav>
        <div className="sidebar-support">
          <CircleHelp size={20} />
          <strong>
            {preview ? "Probá sin preocupaciones" : "Todo a tu ritmo"}
          </strong>
          <p>
            {preview
              ? "Los cambios de esta demo se reinician al recargar."
              : "Creá tus gastos una vez; cada mes aparecen solos."}
          </p>
          <Link to={preview ? "/acceso" : "/vista-previa"}>
            {preview ? "Volver al acceso" : "Conocer el nuevo diseño"}
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom">
          <div className="identity">
            <span className="avatar">
              {preview ? "G" : name?.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{preview ? "GastApp V2" : name}</strong>
              <small>{preview ? "Vista previa del diseño" : email}</small>
            </div>
          </div>
          {!preview && (
            <button
              className="logout-button"
              disabled={signingOut}
              onClick={onSignOut}
            >
              <LogOut size={16} />
              {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            </button>
          )}
          {error && (
            <p role="alert" className="error-message">
              {error}
            </p>
          )}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar">
          <div className="desktop-breadcrumb">
            Mi espacio <span>/</span>{" "}
            <strong>
              {preview
                ? sections.find((s) => s.id === section)?.label
                : "GastApp"}
            </strong>
          </div>
          <div className="mobile-brand">
            <Brand />
          </div>
          <div className="topbar-right">
            {preview ? (
              <>
                <Badge tone="blue">Vista previa · datos de ejemplo</Badge>
                <Link className="back-link" to="/acceso">
                  <ArrowLeft size={15} /> Acceso
                </Link>
              </>
            ) : (
              <Link className="account-link" to="/cuenta">
                <span className="avatar small">
                  {name?.slice(0, 1).toUpperCase()}
                </span>
                <span>Mi cuenta</span>
              </Link>
            )}
          </div>
        </header>
        <main id="contenido" className="workspace-main" tabIndex={-1}>
          {children}
        </main>
        <nav className="mobile-nav" aria-label="Navegación móvil">
          {navigation}
          {!preview && (
            <button
              className="nav-item"
              disabled={signingOut}
              onClick={onSignOut}
            >
              <LogOut size={19} />
              <span>{signingOut ? "Cerrando…" : "Cerrar sesión"}</span>
            </button>
          )}
          {!preview && error && (
            <p className="mobile-session-error" role="alert">
              {error}
            </p>
          )}
        </nav>
      </div>
    </div>
  );
}
