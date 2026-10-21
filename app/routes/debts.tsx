import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  Ban,
  CircleCheck,
  HandCoins,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Workspace } from "../components/workspace";
import { Badge, Button, Modal } from "../components/ui";
import {
  useCreateDebt,
  useDebt,
  useDebtAction,
  useDebts,
  useUpdateDebt,
} from "../lib/debts";
import { useContacts, useCreateContact } from "../lib/sharing";
import { errorMessage } from "../lib/expenses";
import {
  amountInput,
  formatMoney,
  parseAmount,
  shortDate,
} from "../lib/format";
import type { CurrentUser } from "../../shared/contracts/account";
import type { Debt, DebtDetail } from "../../shared/contracts/debts";
import { todayIn } from "../../shared/domain/periods";

const amountError =
  "Ingresá un importe mayor a cero, con hasta dos decimales. Ej. 1000 o 1.250,50";
const statusLabel = {
  OPEN: { text: "Pendiente", tone: "amber" },
  PARTIALLY_PAID: { text: "Pago parcial", tone: "blue" },
  PAID: { text: "Saldada", tone: "green" },
  CANCELLED: { text: "Cancelada", tone: "neutral" },
} as const;
const eventLabel = {
  LENT: "Préstamo",
  PAYMENT: "Pago recibido",
  INCREASE: "Aumento del principal",
  FORGIVE: "Perdonado",
  CANCELLED: "Cancelada",
};

function FormError({ message }: { message: string }) {
  return message ? (
    <p className="error-message" role="alert">
      {message}
    </p>
  ) : null;
}

function longDate(date: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  })
    .format(new Date(`${date}T00:00:00Z`))
    .replace(".", "");
}

function CreateDebtForm({
  user,
  onDone,
}: {
  user: CurrentUser;
  onDone: (debt: DebtDetail) => void;
}) {
  const contacts = useContacts(user.id);
  const createContact = useCreateContact(user.id);
  const create = useCreateDebt(user.id);
  const [person, setPerson] = useState("");
  const [error, setError] = useState("");
  const today = todayIn(user.preferences.timeZone);
  const active = (contacts.data ?? []).filter((c) => !c.archived);
  const pending = create.isPending || createContact.isPending;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const principalMinor = parseAmount(String(data.get("amount")));
    if (!principalMinor) return setError(amountError);
    const nickname = String(data.get("nickname") ?? "").trim();
    if (person === "new" && !nickname)
      return setError("Escribí el apodo de la persona.");
    if (!person) return setError("Elegí a quién le prestaste.");
    setError("");
    try {
      const contactId =
        person === "new"
          ? (await createContact.mutateAsync({ nickname })).id
          : person;
      const dueOn = String(data.get("dueOn"));
      const notes = String(data.get("notes")).trim();
      onDone(
        await create.mutateAsync({
          contactId,
          description: String(data.get("description")).trim(),
          currency: data.get("currency") === "USD" ? "USD" : "ARS",
          principalMinor,
          lentOn: String(data.get("lentOn")),
          ...(dueOn && { dueOn }),
          ...(notes && { notes }),
        }),
      );
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <form onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="debt-person">¿Quién te debe?</label>
        <select
          id="debt-person"
          value={person}
          onChange={(event) => setPerson(event.target.value)}
          required
        >
          <option value="">Elegí una persona…</option>
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nickname}
            </option>
          ))}
          <option value="new">+ Persona nueva</option>
        </select>
      </div>
      {person === "new" && (
        <div className="form-field">
          <label htmlFor="debt-nickname">Apodo</label>
          <input
            id="debt-nickname"
            name="nickname"
            placeholder="Ej. Lucía"
            maxLength={60}
            autoComplete="off"
            required
          />
          <span className="field-help">
            No necesita tener GastApp. Las deudas son privadas: solo las ves
            vos.
          </span>
        </div>
      )}
      <div className="form-field">
        <label htmlFor="debt-description">Descripción</label>
        <input
          id="debt-description"
          name="description"
          placeholder="Ej. Préstamo en efectivo"
          required
          maxLength={120}
          pattern=".*\S.*"
          autoComplete="off"
        />
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="debt-amount">Importe prestado</label>
          <input
            id="debt-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            required
            maxLength={18}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="debt-currency">Moneda</label>
          <select id="debt-currency" name="currency">
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="debt-lent">Fecha</label>
          <input
            id="debt-lent"
            name="lentOn"
            type="date"
            defaultValue={today}
            required
          />
        </div>
        <div className="form-field">
          <label htmlFor="debt-due">Vence (opcional)</label>
          <input id="debt-due" name="dueOn" type="date" />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="debt-notes">Notas (opcional)</label>
        <input
          id="debt-notes"
          name="notes"
          maxLength={500}
          autoComplete="off"
          placeholder="Ej. Acordamos que devuelve en cuotas"
        />
        <span className="field-help">
          Sin intereses automáticos. Si cambia lo adeudado, lo registrás como
          ajuste.
        </span>
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button type="submit" className="full-width" disabled={pending}>
          <Plus size={17} />
          {pending ? "Guardando…" : "Registrar préstamo"}
        </Button>
      </div>
    </form>
  );
}

function PaymentForm({
  userId,
  debt,
  today,
  onDone,
}: {
  userId: string;
  debt: DebtDetail;
  today: string;
  onDone: (message: string) => void;
}) {
  const action = useDebtAction(userId);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountMinor = parseAmount(String(data.get("amount")));
    if (!amountMinor) return setError(amountError);
    setError("");
    const note = String(data.get("note")).trim();
    action.mutate(
      {
        debt,
        action: {
          action: "payments",
          amountMinor,
          paidOn: String(data.get("paidOn")),
          ...(note && { note }),
        },
      },
      {
        onSuccess: (updated) =>
          onDone(
            updated.status === "PAID"
              ? `${updated.contactName} saldó la deuda.`
              : `Pago registrado. Falta ${formatMoney(updated.balanceMinor, updated.currency)}.`,
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="payment-amount">Importe ({debt.currency})</label>
          <input
            id="payment-amount"
            name="amount"
            inputMode="decimal"
            defaultValue={amountInput(debt.balanceMinor)}
            required
            maxLength={18}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="payment-date">Fecha</label>
          <input
            id="payment-date"
            name="paidOn"
            type="date"
            defaultValue={today}
            min={debt.lentOn}
            required
          />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="payment-note">Nota (opcional)</label>
        <input
          id="payment-note"
          name="note"
          maxLength={300}
          autoComplete="off"
          placeholder="Ej. Me pagó en pesos al cambio del día"
        />
        <span className="field-help">
          Se registra en {debt.currency}. Si te pagó en otra moneda, anotalo:
          GastApp no convierte monedas.
        </span>
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={action.isPending}
        >
          <ArrowDownLeft size={17} />
          {action.isPending ? "Guardando…" : "Registrar pago"}
        </Button>
      </div>
    </form>
  );
}

function AdjustmentForm({
  userId,
  debt,
  today,
  onDone,
}: {
  userId: string;
  debt: DebtDetail;
  today: string;
  onDone: (message: string) => void;
}) {
  const action = useDebtAction(userId);
  const [kind, setKind] = useState<"INCREASE" | "FORGIVE">(
    debt.status === "PAID" ? "INCREASE" : "FORGIVE",
  );
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountMinor = parseAmount(String(data.get("amount")));
    if (!amountMinor) return setError(amountError);
    const reason = String(data.get("reason")).trim();
    if (!reason) return setError("Contanos el motivo del ajuste.");
    setError("");
    action.mutate(
      {
        debt,
        action: {
          action: "adjustments",
          kind,
          amountMinor,
          effectiveOn: String(data.get("effectiveOn")),
          reason,
        },
      },
      {
        onSuccess: () =>
          onDone(
            kind === "INCREASE"
              ? "Aumento registrado."
              : "Registraste lo que perdonaste.",
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <fieldset className="choice-group">
        <legend>Tipo de ajuste</legend>
        <label>
          <input
            type="radio"
            name="kind"
            checked={kind === "FORGIVE"}
            disabled={debt.status === "PAID"}
            onChange={() => setKind("FORGIVE")}
          />
          <span>
            Perdonar una parte
            <small>Baja el saldo sin registrar un pago.</small>
          </span>
        </label>
        <label>
          <input
            type="radio"
            name="kind"
            checked={kind === "INCREASE"}
            onChange={() => setKind("INCREASE")}
          />
          <span>
            Aumentar lo adeudado
            <small>Por ejemplo, si le prestaste más.</small>
          </span>
        </label>
      </fieldset>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="adjust-amount">Importe ({debt.currency})</label>
          <input
            id="adjust-amount"
            name="amount"
            inputMode="decimal"
            required
            maxLength={18}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="adjust-date">Fecha</label>
          <input
            id="adjust-date"
            name="effectiveOn"
            type="date"
            defaultValue={today}
            min={debt.lentOn}
            required
          />
        </div>
      </div>
      <div className="form-field">
        <label htmlFor="adjust-reason">Motivo</label>
        <input
          id="adjust-reason"
          name="reason"
          maxLength={200}
          required
          autoComplete="off"
          placeholder="Queda registrado en el historial"
        />
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          variant="secondary"
          className="full-width"
          disabled={action.isPending}
        >
          {action.isPending ? "Guardando…" : "Registrar ajuste"}
        </Button>
      </div>
    </form>
  );
}

function CancelForm({
  userId,
  debt,
  onDone,
}: {
  userId: string;
  debt: DebtDetail;
  onDone: (message: string) => void;
}) {
  const action = useDebtAction(userId);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason"),
    ).trim();
    if (!reason) return setError("Contanos el motivo.");
    setError("");
    action.mutate(
      { debt, action: { action: "cancel", reason } },
      {
        onSuccess: () => onDone("Cancelaste la deuda."),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <p className="notice">
        Cancelar perdona el saldo de{" "}
        {formatMoney(debt.balanceMinor, debt.currency)}. No se registra como
        pago y podés reabrirla más adelante.
      </p>
      <div className="form-field">
        <label htmlFor="cancel-reason">Motivo</label>
        <input
          id="cancel-reason"
          name="reason"
          maxLength={200}
          required
          autoComplete="off"
          placeholder="Ej. Se lo regalé"
        />
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          variant="secondary"
          className="full-width"
          disabled={action.isPending}
        >
          <Ban size={16} />
          {action.isPending ? "Guardando…" : "Cancelar deuda"}
        </Button>
      </div>
    </form>
  );
}

function EditDebtForm({
  userId,
  debt,
  onDone,
}: {
  userId: string;
  debt: DebtDetail;
  onDone: (message: string) => void;
}) {
  const update = useUpdateDebt(userId);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setError("");
    update.mutate(
      {
        debt,
        description: String(data.get("description")).trim(),
        notes: String(data.get("notes")).trim() || null,
        dueOn: String(data.get("dueOn")) || null,
      },
      {
        onSuccess: () => onDone("Deuda actualizada."),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="edit-description">Descripción</label>
        <input
          id="edit-description"
          name="description"
          defaultValue={debt.description}
          required
          maxLength={120}
          pattern=".*\S.*"
          autoComplete="off"
        />
      </div>
      <div className="form-field">
        <label htmlFor="edit-due">Vence (opcional)</label>
        <input
          id="edit-due"
          name="dueOn"
          type="date"
          min={debt.lentOn}
          defaultValue={debt.dueOn ?? ""}
        />
      </div>
      <div className="form-field">
        <label htmlFor="edit-notes">Notas</label>
        <input
          id="edit-notes"
          name="notes"
          maxLength={500}
          defaultValue={debt.notes ?? ""}
          autoComplete="off"
        />
        <span className="field-help">
          El importe prestado no se edita: usá un ajuste para que quede en el
          historial.
        </span>
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={update.isPending}
        >
          {update.isPending ? "Guardando…" : "Guardar"}
        </Button>
      </div>
    </form>
  );
}

const tabs = [
  { id: "payment", label: "Pago", icon: ArrowDownLeft },
  { id: "adjust", label: "Ajuste", icon: SlidersHorizontal },
  { id: "cancel", label: "Cancelar", icon: Ban },
  { id: "edit", label: "Editar", icon: Pencil },
] as const;

function DebtSheet({
  user,
  debt,
  onDone,
}: {
  user: CurrentUser;
  debt: DebtDetail;
  onDone: (message: string) => void;
}) {
  const action = useDebtAction(user.id);
  const [error, setError] = useState("");
  const open = debt.status === "OPEN" || debt.status === "PARTIALLY_PAID";
  const available = tabs.filter(
    (t) =>
      debt.status !== "CANCELLED" &&
      (open || t.id === "adjust" || t.id === "edit"),
  );
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>(
    open ? "payment" : "adjust",
  );
  const today = todayIn(user.preferences.timeZone);
  const money = (minor: string) => formatMoney(minor, debt.currency);
  return (
    <>
      <dl className="debt-summary">
        <div>
          <dt>Adeudado</dt>
          <dd>{money(debt.owedMinor)}</dd>
        </div>
        <div>
          <dt>Cobrado</dt>
          <dd>{money(debt.paidMinor)}</dd>
        </div>
        {debt.forgivenMinor !== "0" && (
          <div>
            <dt>Perdonado</dt>
            <dd>{money(debt.forgivenMinor)}</dd>
          </div>
        )}
        <div className="debt-balance">
          <dt>{debt.status === "CANCELLED" ? "Saldo perdonado" : "Falta"}</dt>
          <dd>{money(debt.balanceMinor)}</dd>
        </div>
      </dl>
      {debt.status === "CANCELLED" ? (
        <>
          <p className="notice">
            Cancelada: {debt.cancelReason}. El saldo quedó perdonado, sin
            registrarse como pago.
          </p>
          <FormError message={error} />
          <div className="dialog-actions">
            <Button
              variant="secondary"
              className="full-width"
              disabled={action.isPending}
              onClick={() =>
                action.mutate(
                  { debt, action: { action: "reopen" } },
                  {
                    onSuccess: () => onDone("Reabriste la deuda."),
                    onError: (failure) => setError(errorMessage(failure)),
                  },
                )
              }
            >
              <RotateCcw size={16} />
              Reabrir deuda
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="filter-group sheet-tabs" role="tablist">
            {available.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                aria-pressed={tab === id}
                onClick={() => setTab(id)}
              >
                <Icon size={14} aria-hidden="true" />
                {label}
              </button>
            ))}
          </div>
          {tab === "payment" && open ? (
            <PaymentForm
              key={debt.version}
              userId={user.id}
              debt={debt}
              today={today}
              onDone={onDone}
            />
          ) : tab === "cancel" && open ? (
            <CancelForm userId={user.id} debt={debt} onDone={onDone} />
          ) : tab === "edit" ? (
            <EditDebtForm userId={user.id} debt={debt} onDone={onDone} />
          ) : (
            <AdjustmentForm
              key={debt.version}
              userId={user.id}
              debt={debt}
              today={today}
              onDone={onDone}
            />
          )}
        </>
      )}
      <h3 className="timeline-title">Historial</h3>
      <ol className="debt-timeline">
        {[...debt.events].reverse().map((event) => (
          <li
            key={event.id}
            className={`${event.kind.toLowerCase()} ${event.reverted ? "is-reverted" : ""}`}
          >
            <div>
              <strong>
                {eventLabel[event.kind]}
                {event.reverted && " · deshecho"}
              </strong>
              <small>
                {longDate(event.date)}
                {event.note ? ` · ${event.note}` : ""}
              </small>
            </div>
            {event.amountMinor && (
              <span className="timeline-amount">
                {event.kind === "PAYMENT" || event.kind === "FORGIVE"
                  ? "−"
                  : "+"}
                {money(event.amountMinor)}
              </span>
            )}
            {event.kind === "PAYMENT" &&
              !event.reverted &&
              debt.status !== "CANCELLED" && (
                <Button
                  variant="ghost"
                  disabled={action.isPending}
                  onClick={() =>
                    action.mutate(
                      { debt, action: { action: "undo", paymentId: event.id } },
                      {
                        onSuccess: () => onDone("Deshiciste el pago."),
                        onError: (failure) => setError(errorMessage(failure)),
                      },
                    )
                  }
                >
                  Deshacer
                </Button>
              )}
          </li>
        ))}
      </ol>
      {debt.status !== "CANCELLED" && <FormError message={error} />}
    </>
  );
}

function DebtRow({
  debt,
  today,
  onOpen,
}: {
  debt: Debt;
  today: string;
  onOpen: () => void;
}) {
  const owed = BigInt(debt.owedMinor);
  const settled = owed - BigInt(debt.balanceMinor);
  const progress = owed > 0n ? Number((settled * 100n) / owed) : 0;
  const overdue =
    debt.dueOn !== null &&
    debt.dueOn < today &&
    (debt.status === "OPEN" || debt.status === "PARTIALLY_PAID");
  const label = statusLabel[debt.status];
  return (
    <li>
      <button className="debt-row" onClick={onOpen}>
        <span className="avatar">
          {debt.contactName.slice(0, 1).toUpperCase()}
        </span>
        <span className="debt-info">
          <strong>{debt.contactName}</strong>
          <small>{debt.description}</small>
          <small className={overdue ? "overdue" : ""}>
            Prestado el {shortDate(debt.lentOn)}
            {debt.dueOn &&
              ` · ${overdue ? "venció" : "vence"} el ${shortDate(debt.dueOn)}`}
          </small>
        </span>
        <span className="debt-amounts">
          <strong>{formatMoney(debt.balanceMinor, debt.currency)}</strong>
          <small>de {formatMoney(debt.owedMinor, debt.currency)}</small>
          <Badge tone={label.tone}>{label.text}</Badge>
        </span>
        <span className="debt-progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </span>
      </button>
    </li>
  );
}

const filters = [
  { id: "active", label: "Activas" },
  { id: "paid", label: "Saldadas" },
  { id: "cancelled", label: "Canceladas" },
  { id: "all", label: "Todas" },
] as const;

function DebtsView({ user }: { user: CurrentUser }) {
  const debts = useDebts(user.id);
  const [filter, setFilter] =
    useState<(typeof filters)[number]["id"]>("active");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useDebt(user.id, openId);
  const [notice, setNotice] = useState("");
  const today = todayIn(user.preferences.timeZone);
  const rows = (debts.data?.debts ?? []).filter((d) =>
    filter === "all"
      ? true
      : filter === "active"
        ? d.status === "OPEN" || d.status === "PARTIALLY_PAID"
        : filter === "paid"
          ? d.status === "PAID"
          : d.status === "CANCELLED",
  );
  const done = (text: string) => {
    setNotice(text);
  };
  return (
    <>
      <div className="page-heading month-heading">
        <div>
          <p className="eyebrow">LO QUE TE DEBEN</p>
          <h1>
            Deudas<span className="title-dot">.</span>
          </h1>
          <p className="page-description">
            Préstamos y pagos parciales, con su propio seguimiento.
          </p>
        </div>
        <div className="heading-actions">
          <Button className="desktop-create" onClick={() => setCreating(true)}>
            <Plus size={18} />
            Registrar préstamo
          </Button>
        </div>
      </div>
      {debts.isPending ? (
        <div className="loading-block" role="status">
          <span className="skeleton" />
          <span className="skeleton" />
          <p>Cargando deudas…</p>
        </div>
      ) : debts.isError ? (
        <section className="card empty-state" role="alert">
          <h3>No pudimos cargar las deudas</h3>
          <p>{errorMessage(debts.error)}</p>
          <Button variant="secondary" onClick={() => void debts.refetch()}>
            Reintentar
          </Button>
        </section>
      ) : debts.data.debts.length === 0 ? (
        <section className="card empty-state">
          <HandCoins size={27} />
          <h3>No registraste préstamos</h3>
          <p>
            Anotá lo que le prestaste a alguien y registrá sus pagos parciales.
            Es independiente de tus gastos compartidos.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus size={17} />
            Registrar préstamo
          </Button>
        </section>
      ) : (
        <>
          {debts.data.totals.length > 0 && (
            <section className="metrics" aria-label="Lo que te deben">
              {debts.data.totals.map((total, index) => (
                <article
                  key={total.currency}
                  className={`metric-card ${index === 0 ? "metric-featured" : ""}`}
                >
                  <div className="metric-label">
                    <span>Te deben · {total.currency}</span>
                    <span className="metric-icon">
                      <HandCoins size={18} />
                    </span>
                  </div>
                  <strong className="metric-value">
                    {formatMoney(total.outstandingMinor, total.currency)}
                  </strong>
                  <p>
                    {total.count === 1
                      ? "1 deuda activa"
                      : `${total.count} deudas activas`}
                  </p>
                </article>
              ))}
            </section>
          )}
          <section className="card debts-panel">
            <header className="panel-heading">
              <div>
                <h2>
                  Préstamos{" "}
                  <span className="count">{debts.data.debts.length}</span>
                </h2>
                <p>Tocá uno para registrar un pago o ver su historial.</p>
              </div>
            </header>
            <div className="expense-toolbar">
              <div
                className="filter-group"
                role="group"
                aria-label="Filtrar deudas"
              >
                {filters.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    aria-pressed={filter === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>
            {rows.length ? (
              <ul className="debt-list">
                {rows.map((debt) => (
                  <DebtRow
                    key={debt.id}
                    debt={debt}
                    today={today}
                    onOpen={() => setOpenId(debt.id)}
                  />
                ))}
              </ul>
            ) : (
              <div className="empty-state">
                <CircleCheck size={27} />
                <h3>No hay deudas en este filtro</h3>
                <Button variant="secondary" onClick={() => setFilter("all")}>
                  Ver todas
                </Button>
              </div>
            )}
          </section>
        </>
      )}
      <p className="notice">
        Las deudas son privadas y no se mezclan con tus gastos ni con los
        compartidos. Los pagos se registran en la moneda del préstamo.
      </p>
      <div
        className="feedback-message"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        key={notice || "empty"}
      >
        {notice && (
          <>
            <CircleCheck size={19} />
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
      <Button className="mobile-create" onClick={() => setCreating(true)}>
        <Plus size={20} />
        Registrar préstamo
      </Button>
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Registrar préstamo"
        description="Lo que le prestaste a alguien, en su moneda."
      >
        <CreateDebtForm
          user={user}
          onDone={(debt) => {
            setCreating(false);
            setFilter("active");
            done(`Registraste el préstamo a ${debt.contactName}.`);
          }}
        />
      </Modal>
      <Modal
        open={openId !== null}
        onOpenChange={(value) => {
          if (!value) setOpenId(null);
        }}
        title={
          detail.data
            ? `${detail.data.contactName} · ${detail.data.description}`
            : "Deuda"
        }
        description={
          detail.data
            ? `${statusLabel[detail.data.status].text} · prestado el ${longDate(detail.data.lentOn)}`
            : "Cargando…"
        }
      >
        {detail.data ? (
          <DebtSheet
            key={`${detail.data.id}-${detail.data.status}`}
            user={user}
            debt={detail.data}
            onDone={done}
          />
        ) : detail.isError ? (
          <FormError message={errorMessage(detail.error)} />
        ) : (
          <div className="loading-block" role="status">
            <span className="skeleton" />
          </div>
        )}
      </Modal>
    </>
  );
}

export default function Debts() {
  return <Workspace>{(user) => <DebtsView user={user} />}</Workspace>;
}
