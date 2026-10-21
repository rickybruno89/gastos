import { cn } from "../lib/cn";
import { useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Link2,
  Mail,
  Pencil,
  UserPlus,
  Users,
} from "lucide-react";
import { Workspace } from "../components/workspace";
import { FormField, Badge, Button, Modal } from "../components/ui";
import {
  useConnectionAction,
  useContacts,
  useCreateContact,
  useInvitations,
  useSharedMonth,
  useUpdateContact,
} from "../lib/sharing";
import { errorMessage } from "../lib/expenses";
import { formatMoney, formatShare, periodLabel } from "../lib/format";
import { periodSchema } from "../../shared/contracts/expenses";
import type { Contact, SharedMonth } from "../../shared/contracts/sharing";
import type { CurrentUser } from "../../shared/contracts/account";
import { addMonths, todayIn } from "../../shared/domain/periods";

type Notify = (text: string) => void;

function connectionBadge(contact: Contact) {
  const status = contact.connection?.status;
  if (status === "ACCEPTED")
    return (
      <Badge tone="green">
        <Link2 size={12} />
        Conectado
      </Badge>
    );
  if (status === "PENDING" && contact.connection?.direction === "SENT")
    return <Badge tone="amber">Invitación enviada</Badge>;
  return <Badge>Solo vos lo ves</Badge>;
}

function PersonCard({ person }: { person: SharedMonth["people"][number] }) {
  return (
    <article className="card person-card [background:white] shadow-[0_3px_10px_#1b2d4f02] p-5 border border-solid border-line rounded-card [&_header]:flex [&_header]:items-center [&_header]:mb-3.5 [&_header]:gap-3 [&_h3]:text-[14px] [&_header_small]:text-muted [&_header_small]:text-[11px]">
      <header>
        <span className="avatar w-[35px] h-[35px] [background:#e9effe] text-[#4f6bbd] inline-grid place-content-center text-[11px] font-semibold shrink-0 border-[3px] border-solid border-[#f4f7ff] rounded-full [&.small]:w-7.5 [&.small]:h-7.5">
          {person.name.slice(0, 1).toUpperCase()}
        </span>
        <div>
          <h3>{person.name}</h3>
          <small>
            {person.connected
              ? "Cuenta conectada: también ve su parte"
              : "Registro privado"}
          </small>
        </div>
      </header>
      <dl className="balance-list mt-0 mb-3 mx-0">
        {person.balances.map((balance) => (
          <div key={balance.currency}>
            {balance.theyOweMinor !== "0" && (
              <div className="balance-row owed flex justify-between items-center border-b [border-bottom-style:solid] border-b-[#f0f3f8] text-[0.875rem] px-0 py-2 desktop:text-[12px] [&_dt]:flex [&_dt]:items-center [&_dt]:text-muted [&_dt]:gap-1.5 [&_dd]:font-semibold [&_dd]:tabular-nums [&_dd]:m-0 [&.owed_dt_svg]:text-[#267354] [&.owing_dt_svg]:text-[#a5671b]">
                <dt>
                  <ArrowDownLeft size={15} aria-hidden="true" />
                  Te debe · {balance.currency}
                </dt>
                <dd>{formatMoney(balance.theyOweMinor, balance.currency)}</dd>
              </div>
            )}
            {balance.iOweMinor !== "0" && (
              <div className="balance-row owing flex justify-between items-center border-b [border-bottom-style:solid] border-b-[#f0f3f8] text-[0.875rem] px-0 py-2 desktop:text-[12px] [&_dt]:flex [&_dt]:items-center [&_dt]:text-muted [&_dt]:gap-1.5 [&_dd]:font-semibold [&_dd]:tabular-nums [&_dd]:m-0 [&.owed_dt_svg]:text-[#267354] [&.owing_dt_svg]:text-[#a5671b]">
                <dt>
                  <ArrowUpRight size={15} aria-hidden="true" />
                  Le debés · {balance.currency}
                </dt>
                <dd>{formatMoney(balance.iOweMinor, balance.currency)}</dd>
              </div>
            )}
          </div>
        ))}
      </dl>
      <details className="share-lines [&_summary]:cursor-pointer [&_summary]:text-[0.875rem] [&_summary]:text-brand [&_summary]:min-h-11 [&_summary]:flex [&_summary]:items-center desktop:[&_summary]:text-[12px] [&_ul]:list-none [&_ul]:mt-0 [&_ul]:mb-2.5 [&_ul]:mx-0 [&_ul]:p-0 [&_li]:flex [&_li]:justify-between [&_li]:text-[0.875rem] [&_li]:border-b [&_li]:[border-bottom-style:dashed] [&_li]:border-b-[#eef1f6] [&_li]:px-0 [&_li]:py-2 [&_li]:gap-2.5 desktop:[&_li]:text-[12px] [&_li_small]:block [&_li_small]:text-muted [&_li_small]:text-[0.75rem] [&_li_small]:mt-0.5 desktop:[&_li_small]:text-[11px]">
        <summary>
          Ver detalle ({person.theyOwe.length + person.iOwe.length})
        </summary>
        {[
          { title: "Tus gastos", lines: person.theyOwe },
          { title: `Gastos de ${person.name}`, lines: person.iOwe },
        ]
          .filter((group) => group.lines.length)
          .map((group) => (
            <div key={group.title}>
              <p className="lines-title text-[11px] font-semibold text-[#53637b] mt-2 mb-0.5 mx-0">
                {group.title}
              </p>
              <ul>
                {group.lines.map((line, index) => (
                  <li key={`${line.expenseName}-${index}`}>
                    <span>
                      {line.expenseName}
                      <small>
                        {formatShare(line.shareBps)} de{" "}
                        {formatMoney(line.totalMinor, line.currency)}
                      </small>
                    </span>
                    <strong>
                      {formatMoney(line.amountMinor, line.currency)}
                    </strong>
                  </li>
                ))}
              </ul>
            </div>
          ))}
      </details>
    </article>
  );
}

function ContactForm({
  userId,
  contact,
  onDone,
}: {
  userId: string;
  contact?: Contact;
  onDone: Notify;
}) {
  const create = useCreateContact(userId);
  const update = useUpdateContact(userId);
  const [error, setError] = useState("");
  const pending = create.isPending || update.isPending;
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const nickname = String(data.get("nickname")).trim();
    const email = String(data.get("email")).trim();
    setError("");
    const fail = (failure: unknown) => setError(errorMessage(failure));
    if (!contact)
      create.mutate(
        { nickname, ...(email && { email }) },
        { onSuccess: () => onDone(`${nickname} se agregó.`), onError: fail },
      );
    else
      update.mutate(
        {
          id: contact.id,
          version: contact.version,
          nickname,
          email: email || null,
        },
        { onSuccess: () => onDone(`${nickname} se actualizó.`), onError: fail },
      );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="contact-nickname">Apodo</label>
        <input
          id="contact-nickname"
          name="nickname"
          defaultValue={contact?.nickname}
          placeholder="Ej. Juan"
          required
          maxLength={60}
          pattern=".*\S.*"
          autoComplete="off"
        />
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          Privado: la otra persona no lo ve.
        </span>
      </FormField>
      <FormField>
        <label htmlFor="contact-email">Email (opcional)</label>
        <input
          id="contact-email"
          name="email"
          type="email"
          inputMode="email"
          defaultValue={contact?.email ?? ""}
          placeholder="Para conectarte con su cuenta de GastApp"
          maxLength={254}
          autoComplete="off"
        />
      </FormField>
      {error && (
        <p
          className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
          role="alert"
        >
          {error}
        </p>
      )}
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Guardando…" : contact ? "Guardar" : "Agregar persona"}
        </Button>
      </div>
    </form>
  );
}

function ContactRow({
  userId,
  contact,
  onEdit,
  onNotify,
}: {
  userId: string;
  contact: Contact;
  onEdit: () => void;
  onNotify: Notify;
}) {
  const action = useConnectionAction(userId);
  const update = useUpdateContact(userId);
  const connection = contact.connection;
  const active =
    connection && ["PENDING", "ACCEPTED"].includes(connection.status);
  function run(kind: "invite" | "disconnect", id: string, success: string) {
    action.mutate(
      { action: kind, id },
      {
        onSuccess: () => onNotify(success),
        onError: (failure) => onNotify(errorMessage(failure)),
      },
    );
  }
  return (
    <li
      className={cn(
        `contact-row grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center border-t [border-top-style:solid] border-t-[#f0f3f8] px-0 py-3 gap-3 desktop:grid-cols-[auto_minmax(0,_1fr)_auto_auto] [&.is-archived]:opacity-[0.65] ${contact.archived ? "is-archived" : ""} `,
      )}
    >
      <span className="avatar small w-[35px] h-[35px] [background:#e9effe] text-[#4f6bbd] inline-grid place-content-center text-[11px] font-semibold shrink-0 border-[3px] border-solid border-[#f4f7ff] rounded-full [&.small]:w-7.5 [&.small]:h-7.5">
        {contact.nickname.slice(0, 1).toUpperCase()}
      </span>
      <div className="contact-info [&_strong]:block [&_strong]:text-[13px] [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:wrap-anywhere desktop:[&_small]:text-[11px]">
        <strong>{contact.nickname}</strong>
        <small>
          {connection?.status === "ACCEPTED" && connection.otherName
            ? `Cuenta de ${connection.otherName}`
            : (contact.email ?? "Sin email")}
        </small>
      </div>
      {contact.archived ? <Badge>Archivado</Badge> : connectionBadge(contact)}
      <div className="contact-actions max-desktop:col-span-full max-desktop:flex-wrap flex items-center gap-1.5">
        <button
          className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
          aria-label={`Editar ${contact.nickname}`}
          onClick={onEdit}
        >
          <Pencil size={16} />
        </button>
        {!contact.archived && contact.email && !active && (
          <Button
            variant="secondary"
            disabled={action.isPending}
            onClick={() =>
              run(
                "invite",
                contact.id,
                `Invitaste a ${contact.nickname}. Va a ver la invitación al ingresar con ese email.`,
              )
            }
          >
            <Mail size={15} />
            Invitar
          </Button>
        )}
        {active && (
          <Button
            variant="ghost"
            disabled={action.isPending}
            onClick={() =>
              run(
                "disconnect",
                connection.id,
                connection.status === "PENDING"
                  ? "Cancelaste la invitación."
                  : `Te desconectaste de ${contact.nickname}.`,
              )
            }
          >
            {connection.status === "PENDING"
              ? "Cancelar invitación"
              : "Desconectar"}
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={update.isPending}
          onClick={() =>
            update.mutate(
              {
                id: contact.id,
                version: contact.version,
                archived: !contact.archived,
              },
              {
                onSuccess: () =>
                  onNotify(
                    contact.archived
                      ? `${contact.nickname} volvió a tus contactos.`
                      : `${contact.nickname} se archivó.`,
                  ),
                onError: (failure) => onNotify(errorMessage(failure)),
              },
            )
          }
        >
          {contact.archived ? "Restaurar" : "Archivar"}
        </Button>
      </div>
    </li>
  );
}

function SharedView({ user }: { user: CurrentUser }) {
  const [params, setParams] = useSearchParams();
  const requested = periodSchema.safeParse(params.get("periodo"));
  const period = requested.success
    ? requested.data
    : todayIn(user.preferences.timeZone).slice(0, 7);
  const shared = useSharedMonth(user.id, period);
  const contacts = useContacts(user.id);
  const invitations = useInvitations(user.id);
  const respond = useConnectionAction(user.id);
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState<Contact | "new" | null>(null);
  const label = periodLabel(period);
  const done: Notify = (text) => {
    setEditing(null);
    setNotice(text);
  };

  return (
    <>
      <div className="page-heading month-heading flex items-center justify-between mb-4.5 flex-wrap gap-3.5 desktop:mb-[25px] [&_h1]:text-[1.875rem] desktop:[&_h1]:text-[2rem] [&_.eyebrow]:hidden desktop:[&_.eyebrow]:block [&_.page-description]:hidden desktop:[&_.page-description]:block">
        <div>
          <p className="eyebrow text-muted tracking-[1.45px] text-[11px] font-[650] mb-[11px]">
            CUENTAS CLARAS
          </p>
          <h1>
            Compartidos<span className="title-dot text-brand">.</span>
          </h1>
          <p className="page-description text-muted text-[0.8125rem] leading-[1.7] mt-2.5">
            Lo que te corresponde a vos y a cada persona, mes a mes.
          </p>
        </div>
        <div className="heading-actions flex items-center w-full justify-between gap-2 min-[701px]:gap-3 min-[1251px]:w-auto max-[701px]:[&>.button]:text-[11px] max-[701px]:[&>.button]:pl-2.5 max-[701px]:[&>.button]:pr-2.5">
          <div className="month-switcher flex items-center [background:white] flex-1 justify-between p-0.5 border border-solid border-line rounded-[9px] desktop:flex-none [&>span]:flex [&>span]:items-center [&>span]:text-[0.875rem] [&>span]:font-semibold [&>span]:min-w-0 [&>span]:justify-center [&>span]:gap-2 desktop:[&>span]:text-[0.75rem] desktop:[&>span]:min-w-[138px] [&>span>svg]:text-muted [&>span>svg]:block [&_small]:text-muted [&_small]:text-[0.8125rem] [&_small]:font-[450] [&_small]:inline desktop:[&_small]:text-[0.6875rem] [&_.icon-button]:w-11 [&_.icon-button]:min-h-11">
            <button
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Mes anterior"
              onClick={() => setParams({ periodo: addMonths(period, -1) })}
            >
              <ChevronLeft size={17} />
            </button>
            <span aria-live="polite">
              <CalendarDays size={16} />
              {label} <small>{period.slice(0, 4)}</small>
            </span>
            <button
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Mes siguiente"
              onClick={() => setParams({ periodo: addMonths(period, 1) })}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {(invitations.data ?? []).map((invitation) => (
        <section
          className="card invitation-card max-desktop:flex-wrap [background:#f5f8ff] shadow-[0_3px_10px_#1b2d4f02] flex items-center mb-4 px-5 py-4.5 border border-solid border-[#c9d6fb] rounded-card gap-3.5 [&_h3]:text-[14px] [&_h3]:mb-1 [&_p]:text-[12px] [&_p]:text-muted [&_p]:leading-[1.6]"
          key={invitation.id}
        >
          <span className="tile-icon blue inline-flex items-center justify-center h-[39px] w-[39px] shrink-0 [background:#edf3ff] text-[#4b70d9] rounded-[11px]">
            <Users size={20} />
          </span>
          <div>
            <h3>{invitation.inviterName} te invitó a conectar</h3>
            <p>
              Vas a ver tu parte de todo lo que comparte con vos, desde que
              empezó cada gasto. No ve tu mes ni tus otros gastos.
            </p>
          </div>
          <div className="invitation-actions max-desktop:w-full flex ml-0 gap-2 desktop:ml-auto max-desktop:[&_.button]:flex-1">
            <Button
              disabled={respond.isPending}
              onClick={() =>
                respond.mutate(
                  { action: "accept", id: invitation.id },
                  {
                    onSuccess: () =>
                      setNotice(
                        `Ahora estás conectado con ${invitation.inviterName}.`,
                      ),
                    onError: (failure) => setNotice(errorMessage(failure)),
                  },
                )
              }
            >
              Aceptar
            </Button>
            <Button
              variant="ghost"
              disabled={respond.isPending}
              onClick={() =>
                respond.mutate(
                  { action: "reject", id: invitation.id },
                  {
                    onSuccess: () => setNotice("Rechazaste la invitación."),
                    onError: (failure) => setNotice(errorMessage(failure)),
                  },
                )
              }
            >
              Rechazar
            </Button>
          </div>
        </section>
      ))}

      {shared.isPending ? (
        <div
          className="loading-block mt-17.5 [&_p]:text-[12px] [&_p]:text-muted [&_p]:mt-[25px]"
          role="status"
        >
          <span className="skeleton h-6 block [background:linear-gradient(90deg,_#e5eaf4,_#f0f3f9,_#e5eaf4)] bg-size-[200%] animate-loading mb-[15px] rounded-[7px] [&:nth-child(2)]:max-w-[60%]" />
          <span className="skeleton h-6 block [background:linear-gradient(90deg,_#e5eaf4,_#f0f3f9,_#e5eaf4)] bg-size-[200%] animate-loading mb-[15px] rounded-[7px] [&:nth-child(2)]:max-w-[60%]" />
          <p>Cargando {label.toLowerCase()}…</p>
        </div>
      ) : shared.isError ? (
        <section
          className="card empty-state [background:white] shadow-[0_3px_10px_#1b2d4f02] text-center text-muted px-5.5 py-[35px] border border-solid border-line rounded-card [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]"
          role="alert"
        >
          <h3>No pudimos cargar los compartidos</h3>
          <p>{errorMessage(shared.error)}</p>
          <Button variant="secondary" onClick={() => void shared.refetch()}>
            Reintentar
          </Button>
        </section>
      ) : shared.data.people.length === 0 ? (
        <section className="card empty-state [background:white] shadow-[0_3px_10px_#1b2d4f02] text-center text-muted px-5.5 py-[35px] border border-solid border-line rounded-card [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
          <Users size={27} />
          <h3>Nada compartido en {label.toLowerCase()}</h3>
          <p>
            Al crear o editar un gasto, elegí “Compartir” para repartirlo por
            porcentaje.
          </p>
        </section>
      ) : (
        <div className="people-grid grid grid-cols-[repeat(auto-fill,_minmax(280px,_1fr))] mb-2 gap-4">
          {shared.data.people.map((person) => (
            <PersonCard key={person.key} person={person} />
          ))}
        </div>
      )}
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        Estos saldos salen de los gastos del mes: pagarle al proveedor no salda
        la parte de nadie, y las monedas nunca se suman entre sí.
      </p>

      <section className="card contacts-panel [background:white] shadow-[0_3px_10px_#1b2d4f02] mt-2 mb-22.5 border border-solid border-line rounded-card">
        <header className="panel-heading flex justify-between items-center p-4 gap-3.5 desktop:pt-[23px] desktop:pb-4.5 desktop:px-5.5 [&_h2]:text-[1rem] [&_h2]:flex [&_h2]:items-center [&_h2]:gap-[9px] desktop:[&_h2]:text-[0.875rem] [&_p]:text-muted [&_p]:text-[0.75rem] [&_p]:mt-[5px] [&>svg]:text-muted">
          <div>
            <h2>
              Personas{" "}
              <span className="count inline-flex items-center justify-center min-w-5 h-5 [background:#f2f4f9] text-[11px] text-muted rounded-[6px]">
                {contacts.data?.length ?? 0}
              </span>
            </h2>
            <p>Con apodo alcanza. Con email, podés conectar sus cuentas.</p>
          </div>
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <UserPlus size={16} />
            Agregar
          </Button>
        </header>
        {contacts.data?.length ? (
          <ul className="contact-list list-none pt-0 pb-2 m-0 px-4 desktop:pr-5.5 desktop:pb-3 desktop:pl-5.5">
            {contacts.data.map((contact) => (
              <ContactRow
                key={contact.id}
                userId={user.id}
                contact={contact}
                onEdit={() => setEditing(contact)}
                onNotify={setNotice}
              />
            ))}
          </ul>
        ) : (
          <p className="field-help contacts-empty text-[0.75rem] text-muted leading-[1.7] pt-0 pb-5.5 px-5.5">
            Todavía no agregaste a nadie.
          </p>
        )}
      </section>

      <div
        className="feedback-message empty:hidden fixed bottom-[calc(var(--navigation-height)_+_76px_+_env(safe-area-inset-bottom))] left-1/2 [transform:translateX(-50%)] z-[40] max-w-[calc(100vw_-_36px)] w-max [background:#1f304b] text-white flex items-center shadow-[0_10px_30px_#15244020] text-[0.8125rem] px-3 py-2.5 border border-solid border-[#324766] rounded-[12px] gap-2 desktop:bottom-6 desktop:left-[calc(50%_+_102px)] desktop:text-[0.75rem] [&>svg]:text-muted [&_.icon-button:hover]:[background:#ffffff17] [&_.toast-undo]:text-white [&_.toast-undo]:underline [&_.toast-undo]:pl-2 [&_.toast-undo]:pr-2 [&_.toast-undo:hover]:[background:#ffffff17]"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        key={notice || "empty"}
      >
        {notice && (
          <>
            <span>{notice}</span>
            <button
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Cerrar aviso"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </>
        )}
      </div>
      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
        title={
          editing && editing !== "new"
            ? `Editar ${editing.nickname}`
            : "Agregar persona"
        }
        description="No necesita tener GastApp para que compartas gastos con ella."
      >
        {editing && (
          <ContactForm
            key={editing === "new" ? "new" : editing.id}
            userId={user.id}
            contact={editing === "new" ? undefined : editing}
            onDone={done}
          />
        )}
      </Modal>
    </>
  );
}

export default function Shared() {
  return <Workspace>{(user) => <SharedView user={user} />}</Workspace>;
}
