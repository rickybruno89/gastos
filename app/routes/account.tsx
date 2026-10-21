import { LockKeyhole, UserRound } from "lucide-react";
import { Workspace } from "../components/workspace";
import { Badge } from "../components/ui";
import { GoogleMark } from "../components/brand";
import type { CurrentUser } from "../../shared/contracts/account";

function AccountDetails({ user }: { user: CurrentUser }) {
  return (
    <>
      <div className="page-heading flex items-center justify-between mb-4.5 flex-wrap gap-3.5 desktop:mb-[25px] [&_h1]:text-[1.875rem] desktop:[&_h1]:text-[2rem]">
        <div>
          <p className="eyebrow text-muted tracking-[1.45px] text-[11px] font-[650] mb-[11px]">
            A TU MANERA
          </p>
          <h1>Tu cuenta</h1>
          <p className="page-description text-muted text-[0.8125rem] leading-[1.7] mt-2.5">
            Tu información y el acceso a tu espacio personal.
          </p>
        </div>
      </div>
      <div className="settings-layout grid grid-cols-1 max-w-[1000px] gap-[3px] min-[701px]:gap-7.5 min-[1251px]:grid-cols-[minmax(0,_1fr)_235px]">
        <div>
          <section className="card settings-card [background:white] shadow-[0_3px_10px_#1b2d4f02] mb-[23px] p-5.5 border border-solid border-line rounded-card [&_header]:flex [&_header]:items-center [&_header]:mb-6.5 [&_header]:gap-3.5 [&_header_h2]:text-[1rem] [&_header_p]:text-muted [&_header_p]:text-[0.8125rem] [&_header_p]:mt-1">
            <header>
              <span className="tile-icon blue inline-flex items-center justify-center h-[39px] w-[39px] shrink-0 [background:#edf3ff] text-[#4b70d9] rounded-[11px]">
                <UserRound size={21} />
              </span>
              <div>
                <h2>Información personal</h2>
                <p>Los datos de tu cuenta de Google.</p>
              </div>
            </header>
            <dl className="profile-details m-0 [&>div]:grid [&>div]:grid-cols-[85px_minmax(0,_1fr)] [&>div]:border-t [&>div]:[border-top-style:solid] [&>div]:border-t-line [&>div]:text-[0.8125rem] [&>div]:px-0 [&>div]:py-[17px] [&>div]:gap-2.5 min-[701px]:[&>div]:gap-[15px] [&>div:last-child]:pb-0 [&_dt]:text-muted [&_dd]:wrap-anywhere [&_dd]:m-0">
              <div>
                <dt>Nombre</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Forma de ingreso</dt>
                <dd className="provider flex items-center flex-wrap gap-2 [&>svg]:w-4 [&>svg]:h-4 [&_.badge]:ml-0 [&_.badge]:text-[11px] min-[701px]:[&_.badge]:ml-auto">
                  <GoogleMark />
                  Google<Badge tone="green">Conectado</Badge>
                </dd>
              </div>
            </dl>
          </section>
        </div>
        <aside className="account-aside max-[1251px]:max-w-[400px] px-1 py-0 [&_h3]:text-[12px] [&_h3]:mt-4.5 [&_h3]:mb-2.5 [&_h3]:text-muted [&_h3]:mx-0 [&_p]:text-muted [&_p]:text-[0.8125rem] [&_p]:leading-[1.9] max-[1251px]:[&_.tile-icon]:hidden">
          <span className="tile-icon green inline-flex items-center justify-center h-[39px] w-[39px] shrink-0 [background:#eaf8f1] text-[#2e9278] rounded-[11px]">
            <LockKeyhole size={23} />
          </span>
          <h3>Tu espacio es privado</h3>
          <p>
            Conectar con alguien no le da acceso a toda tu cuenta. Vos elegís
            qué gastos compartir.
          </p>
        </aside>
      </div>
    </>
  );
}
export default function Account() {
  return <Workspace>{(user) => <AccountDetails user={user} />}</Workspace>;
}
