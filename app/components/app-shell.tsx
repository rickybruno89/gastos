import type { ReactNode } from "react";
import { Link, NavLink } from "react-router";
import {
  ArrowUpRight,
  CreditCard,
  HandCoins,
  LayoutGrid,
  Users,
} from "lucide-react";
import { Brand } from "./brand";
import { Avatar } from "./avatar";

export function AppShell({
  children,
  name,
  email,
  image,
}: {
  children: ReactNode;
  name?: string;
  email?: string;
  image?: string | null;
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
    </>
  );
  // Tarjeta del sidebar: abre la página de cuenta. La flecha acompaña al nombre.
  const accountLink = (
    <Link
      to="/cuenta"
      aria-label={`Abrir tu cuenta, ${name ?? ""}`}
      className="identity group flex min-w-0 flex-col gap-3 rounded-[12px] border border-solid border-[#edf0f7] [background:#f7f9fd] p-3.5 transition-colors hover:border-[#cfdaf5] hover:[background:#f1f5fe]"
    >
      <Avatar name={name} image={image} className="size-10" />
      <div className="min-w-0">
        <span className="flex items-center justify-between gap-2 text-[12px] font-[650] text-ink">
          <span className="truncate">{name}</span>
          <ArrowUpRight
            size={15}
            aria-hidden="true"
            className="shrink-0 text-muted transition-transform group-hover:translate-x-px group-hover:-translate-y-px group-hover:text-brand"
          />
        </span>
        <small className="mt-[3px] block wrap-anywhere text-[11px] text-muted">
          {email}
        </small>
      </div>
    </Link>
  );
  return (
    <div className="workspace min-h-svh block grid-cols-[180px_minmax(0,_1fr)] desktop:grid desktop:grid-cols-[230px_minmax(0,_1fr)]">
      <a
        className="skip-link fixed left-[15px] top-[-100px] z-[100] [background:white] p-3 border-[2px] border-solid border-brand rounded-[8px] [&:focus]:top-[15px]"
        href="#contenido"
      >
        Saltar al contenido
      </a>
      <aside className="sidebar [background:white] border-r [border-right-style:solid] border-r-line pt-[31px] pb-5.5 hidden flex-col h-svh sticky top-0 w-[180px] px-[13px] desktop:pr-5.5 desktop:pl-5.5 desktop:flex desktop:w-auto max-desktop:[&_.brand]:text-[23px] [&_.brand]:ml-[7px] [&_nav]:grid [&_nav]:gap-[5px]">
        <Brand />
        <div className="workspace-label flex items-center mt-[25px] mb-0 border-t [border-top-style:solid] border-t-line text-[11px] text-muted mx-[7px] px-0 py-[11px] gap-2">
          <span className="workspace-dot w-1.5 h-1.5 [background:#6f91e4] rounded-full" />
          Espacio personal
        </div>
        <p className="nav-label text-[11px] font-semibold text-muted tracking-[1.6px] mt-[31px] mb-[13px] mx-3">
          PRINCIPAL
        </p>
        <nav aria-label="Navegación principal">{navigation}</nav>
        <div className="sidebar-bottom border-t [border-top-style:solid] border-t-line mt-auto pt-[21px]">
          {accountLink}
        </div>
      </aside>
      <div className="workspace-body">
        <header className="topbar desktop:hidden min-h-16 [background:white] border-b [border-bottom-style:solid] border-b-line pt-[calc(12px_+_env(safe-area-inset-top))] pr-[max(16px,_env(safe-area-inset-right))] pb-3 pl-[max(16px,_env(safe-area-inset-left))] flex justify-between items-center flex-wrap gap-4 desktop:min-h-[77px] desktop:flex-nowrap desktop:px-6.5 desktop:py-[15px] min-[1251px]:pr-[35px] min-[1251px]:pl-[35px]">
          <div className="mobile-brand block desktop:hidden [&_.brand]:text-[1.5rem] max-[701px]:[&_.brand-mark]:mr-[7px] [&_.brand-mark]:w-[31px] [&_.brand-mark]:h-[31px]">
            <Brand />
          </div>
          <Link
            to="/cuenta"
            className="account-link flex min-h-11 items-center gap-2.5 rounded-[10px] px-1.5 text-[12px] font-medium text-[#52627a] hover:[background:#f6f8fc]"
          >
            <Avatar name={name} image={image} />
            Mi cuenta
          </Link>
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
        </nav>
      </div>
    </div>
  );
}
