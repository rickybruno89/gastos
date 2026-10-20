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
import { Badge, Button, Modal } from "../components/ui";
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
    <article className="card person-card">
      <header>
        <span className="avatar">{person.name.slice(0, 1).toUpperCase()}</span>
        <div>
          <h3>{person.name}</h3>
          <small>
            {person.connected
              ? "Cuenta conectada: también ve su parte"
              : "Registro privado"}
          </small>
        </div>
      </header>
      <dl className="balance-list">
        {person.balances.map((balance) => (
          <div key={balance.currency}>
            {balance.theyOweMinor !== "0" && (
              <div className="balance-row owed">
                <dt>
                  <ArrowDownLeft size={15} aria-hidden="true" />
                  Te debe · {balance.currency}
                </dt>
                <dd>{formatMoney(balance.theyOweMinor, balance.currency)}</dd>
              </div>
            )}
            {balance.iOweMinor !== "0" && (
              <div className="balance-row owing">
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
      <details className="share-lines">
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
              <p className="lines-title">{group.title}</p>
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
      <div className="form-field">
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
        <span className="field-help">Privado: la otra persona no lo ve.</span>
      </div>
      <div className="form-field">
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
      </div>
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button type="submit" className="full-width" disabled={pending}>
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
    <li className={`contact-row ${contact.archived ? "is-archived" : ""}`}>
      <span className="avatar small">
        {contact.nickname.slice(0, 1).toUpperCase()}
      </span>
      <div className="contact-info">
        <strong>{contact.nickname}</strong>
        <small>
          {connection?.status === "ACCEPTED" && connection.otherName
            ? `Cuenta de ${connection.otherName}`
            : (contact.email ?? "Sin email")}
        </small>
      </div>
      {contact.archived ? <Badge>Archivado</Badge> : connectionBadge(contact)}
      <div className="contact-actions">
        <button
          className="icon-button"
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
      <div className="page-heading month-heading">
        <div>
          <p className="eyebrow">CUENTAS CLARAS</p>
          <h1>
            Compartidos<span className="title-dot">.</span>
          </h1>
          <p className="page-description">
            Lo que te corresponde a vos y a cada persona, mes a mes.
          </p>
        </div>
        <div className="heading-actions">
          <div className="month-switcher">
            <button
              className="icon-button"
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
              className="icon-button"
              aria-label="Mes siguiente"
              onClick={() => setParams({ periodo: addMonths(period, 1) })}
            >
              <ChevronRight size={17} />
            </button>
          </div>
        </div>
      </div>

      {(invitations.data ?? []).map((invitation) => (
        <section className="card invitation-card" key={invitation.id}>
          <span className="tile-icon blue">
            <Users size={20} />
          </span>
          <div>
            <h3>{invitation.inviterName} te invitó a conectar</h3>
            <p>
              Vas a ver tu parte de los gastos que comparta con vos desde este
              mes. No ve tu mes ni tus otros gastos.
            </p>
          </div>
          <div className="invitation-actions">
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
        <div className="loading-block" role="status">
          <span className="skeleton" />
          <span className="skeleton" />
          <p>Cargando {label.toLowerCase()}…</p>
        </div>
      ) : shared.isError ? (
        <section className="card empty-state" role="alert">
          <h3>No pudimos cargar los compartidos</h3>
          <p>{errorMessage(shared.error)}</p>
          <Button variant="secondary" onClick={() => void shared.refetch()}>
            Reintentar
          </Button>
        </section>
      ) : shared.data.people.length === 0 ? (
        <section className="card empty-state">
          <Users size={27} />
          <h3>Nada compartido en {label.toLowerCase()}</h3>
          <p>
            Al crear o editar un gasto, elegí “Compartir” para repartirlo por
            porcentaje.
          </p>
        </section>
      ) : (
        <div className="people-grid">
          {shared.data.people.map((person) => (
            <PersonCard key={person.key} person={person} />
          ))}
        </div>
      )}
      <p className="notice">
        Estos saldos salen de los gastos del mes: pagarle al proveedor no salda
        la parte de nadie, y las monedas nunca se suman entre sí.
      </p>

      <section className="card contacts-panel">
        <header className="panel-heading">
          <div>
            <h2>
              Personas{" "}
              <span className="count">{contacts.data?.length ?? 0}</span>
            </h2>
            <p>Con apodo alcanza. Con email, podés conectar sus cuentas.</p>
          </div>
          <Button variant="secondary" onClick={() => setEditing("new")}>
            <UserPlus size={16} />
            Agregar
          </Button>
        </header>
        {contacts.data?.length ? (
          <ul className="contact-list">
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
          <p className="field-help contacts-empty">
            Todavía no agregaste a nadie.
          </p>
        )}
      </section>

      <div
        className="feedback-message"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        key={notice || "empty"}
      >
        {notice && (
          <>
            <span>{notice}</span>
            <button
              className="icon-button"
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
