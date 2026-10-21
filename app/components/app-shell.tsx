import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
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

export function AppShell({
  children,
  name,
  email,
  signingOut,
  onSignOut,
  error,
}: {
  children: ReactNode;
  name?: string;
  email?: string;
  signingOut?: boolean;
  onSignOut?: () => void;
  error?: string;
}) {
  const navigation = (
    <>
      <NavLink
        className="nav-item [background:transparent] text-left flex items-center text-[12px] font-medium text-muted px-3 py-[13px] border-0 border-none border-current rounded-[9px] gap-3 hover:[background:#f6f8fc] [&.active]:[background:#edf2ff] [&.active]:text-brand [&.active]:font-[650]"
        end
        to="/"
      >
        <LayoutGrid size={19} />
        <span>Mi mes</span>
      </NavLink>
      <NavLink
        className="nav-item [background:transparent] text-left flex items-center text-[12px] font-medium text-muted px-3 py-[13px] border-0 border-none border-current rounded-[9px] gap-3 hover:[background:#f6f8fc] [&.active]:[background:#edf2ff] [&.active]:text-brand [&.active]:font-[650]"
        to="/tarjetas"
      >
        <CreditCard size={19} />
        <span>Tarjetas</span>
      </NavLink>
      <NavLink
        className="nav-item [background:transparent] text-left flex items-center text-[12px] font-medium text-muted px-3 py-[13px] border-0 border-none border-current rounded-[9px] gap-3 hover:[background:#f6f8fc] [&.active]:[background:#edf2ff] [&.active]:text-brand [&.active]:font-[650]"
        to="/compartidos"
      >
        <Users size={19} />
        <span>Compartidos</span>
      </NavLink>
      <NavLink
        className="nav-item [background:transparent] text-left flex items-center text-[12px] font-medium text-muted px-3 py-[13px] border-0 border-none border-current rounded-[9px] gap-3 hover:[background:#f6f8fc] [&.active]:[background:#edf2ff] [&.active]:text-brand [&.active]:font-[650]"
        to="/deudas"
      >
        <HandCoins size={19} />
        <span className="desktop:hidden">Deudas</span>
        <span className="hidden desktop:inline">Deudas con personas</span>
      </NavLink>
      <NavLink
        className="nav-item [background:transparent] text-left flex items-center text-[12px] font-medium text-muted px-3 py-[13px] border-0 border-none border-current rounded-[9px] gap-3 hover:[background:#f6f8fc] [&.active]:[background:#edf2ff] [&.active]:text-brand [&.active]:font-[650]"
        to="/cuenta"
      >
        <Settings2 size={19} />
        <span>Tu cuenta</span>
      </NavLink>
    </>
  );
  return (
    <div className="workspace min-h-svh block grid-cols-[180px_minmax(0,_1fr)] desktop:grid desktop:grid-cols-[205px_minmax(0,_1fr)] min-[1251px]:grid-cols-[230px_minmax(0,_1fr)]">
      <a
        className="skip-link fixed left-[15px] top-[-100px] z-[100] [background:white] p-3 border-[2px] border-solid border-brand rounded-[8px] [&:focus]:top-[15px]"
        href="#contenido"
      >
        Saltar al contenido
      </a>
      <aside className="sidebar [background:white] border-r [border-right-style:solid] border-r-line pt-[31px] pb-5.5 hidden flex-col h-svh sticky top-0 w-[180px] px-[13px] desktop:pr-4 desktop:pl-4 desktop:flex desktop:w-auto min-[1251px]:pr-5.5 min-[1251px]:pl-5.5 max-desktop:[&_.brand]:text-[23px] [&_.brand]:ml-[7px] [&_nav]:grid [&_nav]:gap-[5px]">
        <Brand />
        <div className="workspace-label flex items-center mt-[25px] mb-0 border-t [border-top-style:solid] border-t-line text-[11px] text-muted mx-[7px] px-0 py-[11px] gap-2">
          <span className="workspace-dot w-1.5 h-1.5 [background:#6f91e4] rounded-full" />
          Espacio personal
        </div>
        <p className="nav-label text-[11px] font-semibold text-muted tracking-[1.6px] mt-[31px] mb-[13px] mx-3">
          PRINCIPAL
        </p>
        <nav aria-label="Navegación principal">{navigation}</nav>
        <div className="sidebar-support [background:#f7f9fd] mt-auto text-muted p-4 border border-solid border-[#edf0f7] rounded-[12px] [&>svg]:mb-2.5 [&_strong]:block [&_strong]:text-[11px] [&_strong]:text-[#4b5d7b] [&_p]:text-[11px] [&_p]:leading-[1.8] [&_p]:mt-1.5 [&_p]:mb-3 [&_p]:mx-0 [&_a]:flex [&_a]:items-center [&_a]:justify-between [&_a]:text-[#4662b8] [&_a]:text-[11px] [&_a]:font-semibold">
          <CircleHelp size={20} />
          <strong>Todo a tu ritmo</strong>
          <p>Creá tus gastos una vez; cada mes aparecen solos.</p>
          <Link to="/cuenta">
            Tu cuenta
            <ArrowUpRight size={15} />
          </Link>
        </div>
        <div className="sidebar-bottom border-t [border-top-style:solid] border-t-line mt-5.5 pt-[21px]">
          <div className="identity flex items-center min-w-0 gap-2.5 [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[11px] [&_strong]:font-[650] [&_small]:block [&_small]:text-[11px] [&_small]:text-muted [&_small]:mt-[3px] [&_small]:wrap-anywhere">
            <span className="avatar w-[35px] h-[35px] [background:#e9effe] text-[#4f6bbd] inline-grid place-content-center text-[11px] font-semibold shrink-0 border-[3px] border-solid border-[#f4f7ff] rounded-full [&.small]:w-7.5 [&.small]:h-7.5">
              {name?.slice(0, 1).toUpperCase()}
            </span>
            <div>
              <strong>{name}</strong>
              <small>{email}</small>
            </div>
          </div>
          <button
            className="logout-button [background:transparent] text-muted text-[11px] flex items-center min-h-9 mt-[13px] border-0 border-none border-current rounded-[6px] gap-2 hover:text-brand hover:[background:var(--color-brand-soft)]"
            disabled={signingOut}
            onClick={onSignOut}
          >
            <LogOut size={16} />
            {signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
          </button>
          {error && (
            <p
              role="alert"
              className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
            >
              {error}
            </p>
          )}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar min-h-16 [background:white] border-b [border-bottom-style:solid] border-b-line pt-[calc(12px_+_env(safe-area-inset-top))] pr-[max(16px,_env(safe-area-inset-right))] pb-3 pl-[max(16px,_env(safe-area-inset-left))] flex justify-between items-center flex-wrap gap-4 desktop:min-h-[77px] desktop:flex-nowrap desktop:px-6.5 desktop:py-[15px] min-[1251px]:pr-[35px] min-[1251px]:pl-[35px]">
          <div className="desktop-breadcrumb text-[11px] text-muted hidden gap-3.5 desktop:flex [&_strong]:text-[#52627a] [&_strong]:font-medium">
            Mi espacio <span>/</span> <strong>GastApp</strong>
          </div>
          <div className="mobile-brand block desktop:hidden [&_.brand]:text-[1.5rem] max-[701px]:[&_.brand-mark]:mr-[7px] [&_.brand-mark]:w-[31px] [&_.brand-mark]:h-[31px]">
            <Brand />
          </div>
          <div className="topbar-right flex items-center gap-2 [&_.badge]:text-[0.6875rem] [&_.badge]:max-w-[145px] [&_.badge]:text-center">
            <Link
              className="account-link flex items-center text-[11px] text-[#52627a] min-h-11 gap-[9px]"
              to="/cuenta"
            >
              <span className="avatar small w-[35px] h-[35px] [background:#e9effe] text-[#4f6bbd] inline-grid place-content-center text-[11px] font-semibold shrink-0 border-[3px] border-solid border-[#f4f7ff] rounded-full [&.small]:w-7.5 [&.small]:h-7.5">
                {name?.slice(0, 1).toUpperCase()}
              </span>
              <span>Mi cuenta</span>
            </Link>
            <button
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-lg text-muted hover:bg-brand-soft hover:text-brand desktop:hidden"
              disabled={signingOut}
              onClick={onSignOut}
              aria-label={signingOut ? "Cerrando sesión…" : "Cerrar sesión"}
            >
              <LogOut size={19} />
            </button>
          </div>
        </header>
        <main
          id="contenido"
          className="workspace-main max-w-[760px] pt-5 pr-[max(16px,_env(safe-area-inset-right))] pb-[calc(190px_+_env(safe-area-inset-bottom))] pl-[max(16px,_env(safe-area-inset-left))] [outline:none] m-auto desktop:max-w-[1430px] desktop:pt-[29px] desktop:pb-[45px] desktop:px-6.5 min-[1251px]:pt-8.5 min-[1251px]:pr-[35px] min-[1251px]:pl-[35px]"
          tabIndex={-1}
        >
          {children}
        </main>
        <nav
          className="mobile-nav max-[701px]:[justify-content:space-around] flex flex-wrap items-center fixed bottom-0 left-0 right-0 [background:#fffffff5] [backdrop-filter:blur(12px)] border-t [border-top-style:solid] border-t-line z-[30] pt-1.5 pr-[max(8px,_env(safe-area-inset-right))] pb-[calc(6px_+_env(safe-area-inset-bottom))] pl-[max(8px,_env(safe-area-inset-left))] desktop:hidden [&_.nav-item]:flex [&_.nav-item]:flex-col [&_.nav-item]:items-center [&_.nav-item]:text-[0.6875rem] [&_.nav-item]:min-w-0 [&_.nav-item]:flex-1 [&_.nav-item]:justify-center [&_.nav-item]:min-h-14.5 [&_.nav-item]:px-[3px] [&_.nav-item]:py-[7px] [&_.nav-item]:rounded-[10px] [&_.nav-item]:gap-[5px] [&_.nav-indicator]:hidden [&_.nav-item_span]:whitespace-nowrap"
          aria-label="Navegación móvil"
        >
          {navigation}
          {error && (
            <p
              className="mobile-session-error w-full text-[#a74849] text-center text-[12px] p-2"
              role="alert"
            >
              {error}
            </p>
          )}
        </nav>
      </div>
    </div>
  );
}
