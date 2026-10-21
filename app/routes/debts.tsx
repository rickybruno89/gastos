import { cn } from "../lib/cn";
import { useState, type FormEvent } from "react";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Ban,
  CircleCheck,
  HandCoins,
  Pencil,
  Plus,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Workspace } from "../components/workspace";
import {
  FormField,
  Badge,
  Button,
  Modal,
  SkeletonList,
} from "../components/ui";
import { MoneyInput } from "../components/money-input";
import {
  useCreateDebt,
  useDebt,
  useDebtAction,
  useDebts,
  useUpdateDebt,
} from "../lib/debts";
import { useContacts, useCreateContact } from "../lib/sharing";
import { errorMessage } from "../lib/expenses";
import { formatMoney, parseAmount, shortDate } from "../lib/format";
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
  LENT: "Préstamo otorgado",
  PAYMENT: "Pago recibido",
  INCREASE: "Aumento del principal",
  FORGIVE: "Perdonado",
  CANCELLED: "Cancelada",
  REOPENED: "Reabierta",
};

function FormError({ message }: { message: string }) {
  return message ? (
    <p
      className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
      role="alert"
    >
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
  const [direction, setDirection] = useState<Debt["direction"]>("RECEIVABLE");
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
    if (!person) return setError("Elegí la persona de esta deuda.");
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
          direction,
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
      <fieldset className="mb-5 min-w-0 border-0 p-0">
        <legend className="mb-2 text-sm font-medium text-muted">
          Tipo de deuda
        </legend>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["RECEIVABLE", "Me deben"],
              ["PAYABLE", "Yo debo"],
            ] as const
          ).map(([value, label]) => (
            <label
              key={value}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-lg border border-line p-3 text-sm font-semibold has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand"
            >
              <input
                type="radio"
                name="direction"
                value={value}
                checked={direction === value}
                onChange={() => setDirection(value)}
                className="accent-brand"
              />
              {label}
            </label>
          ))}
        </div>
      </fieldset>
      <FormField>
        <label htmlFor="debt-person">
          {direction === "PAYABLE" ? "¿A quién le debés?" : "¿Quién te debe?"}
        </label>
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
      </FormField>
      {person === "new" && (
        <FormField>
          <label htmlFor="debt-nickname">Apodo</label>
          <input
            id="debt-nickname"
            name="nickname"
            placeholder="Ej. Lucía"
            maxLength={60}
            autoComplete="off"
            required
          />
          <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
            No necesita tener GastApp. Las deudas son privadas: solo las ves
            vos.
          </span>
        </FormField>
      )}
      <FormField>
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
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="debt-amount">Importe de la deuda</label>
          <MoneyInput id="debt-amount" />
        </FormField>
        <FormField>
          <label htmlFor="debt-currency">Moneda</label>
          <select id="debt-currency" name="currency">
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="debt-lent">Fecha</label>
          <input
            id="debt-lent"
            name="lentOn"
            type="date"
            defaultValue={today}
            required
          />
        </FormField>
        <FormField>
          <label htmlFor="debt-due">Vence (opcional)</label>
          <input id="debt-due" name="dueOn" type="date" />
        </FormField>
      </div>
      <FormField>
        <label htmlFor="debt-notes">Notas (opcional)</label>
        <input
          id="debt-notes"
          name="notes"
          maxLength={500}
          autoComplete="off"
          placeholder={
            direction === "PAYABLE"
              ? "Ej. Acordé devolverlo en cuotas"
              : "Ej. Acordamos que devuelve en cuotas"
          }
        />
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          Sin intereses automáticos. Si cambia lo adeudado, lo registrás como
          ajuste.
        </span>
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" loading={pending}>
          <Plus size={17} />
          {pending ? "Guardando…" : "Registrar deuda"}
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
              ? updated.direction === "PAYABLE"
                ? "Saldaste la deuda."
                : `${updated.contactName} saldó la deuda.`
              : `Pago registrado. Falta ${formatMoney(updated.balanceMinor, updated.currency)}.`,
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="payment-amount">Importe ({debt.currency})</label>
          <MoneyInput
            id="payment-amount"
            currency={debt.currency}
            defaultMinor={debt.balanceMinor}
          />
        </FormField>
        <FormField>
          <label htmlFor="payment-date">Fecha</label>
          <input
            id="payment-date"
            name="paidOn"
            type="date"
            defaultValue={today}
            min={debt.lentOn}
            required
          />
        </FormField>
      </div>
      <FormField>
        <label htmlFor="payment-note">Nota (opcional)</label>
        <input
          id="payment-note"
          name="note"
          maxLength={300}
          autoComplete="off"
          placeholder={
            debt.direction === "PAYABLE"
              ? "Ej. Pagué en pesos al cambio del día"
              : "Ej. Me pagó en pesos al cambio del día"
          }
        />
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          Se registra en {debt.currency}. Si{" "}
          {debt.direction === "PAYABLE" ? "pagaste" : "te pagó"} en otra moneda,
          anotalo: GastApp no convierte monedas.
        </span>
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" loading={action.isPending}>
          {debt.direction === "PAYABLE" ? (
            <ArrowUpRight size={17} />
          ) : (
            <ArrowDownLeft size={17} />
          )}
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
              : debt.direction === "PAYABLE"
                ? "Reducción acordada registrada."
                : "Registraste lo que perdonaste.",
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <fieldset className="choice-group mt-0 mb-5.5 grid mx-0 p-0 border-0 border-none border-current gap-2 [&_legend]:text-[0.875rem] [&_legend]:font-[550] [&_legend]:text-[#53637b] [&_legend]:mb-2 desktop:[&_legend]:text-[11px] [&_label]:flex [&_label]:items-start [&_label]:min-h-11 [&_label]:text-[0.875rem] [&_label]:text-ink [&_label]:p-3 [&_label]:border [&_label]:border-solid [&_label]:border-[#dce3ef] [&_label]:rounded-[8px] [&_label]:gap-2.5 desktop:[&_label]:text-[12px] [&_label:has(input:checked)]:[background:#f3f6ff] [&_label:has(input:checked)]:border-brand [&_input]:mt-0.5 [&_input]:[accent-color:var(--color-brand)] [&_small]:block [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:mt-[3px] desktop:[&_small]:text-[11px]">
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
            {debt.direction === "PAYABLE"
              ? "Registrar una reducción acordada"
              : "Perdonar una parte"}
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
            <small>
              {debt.direction === "PAYABLE"
                ? "Por ejemplo, si recibiste más dinero."
                : "Por ejemplo, si le prestaste más."}
            </small>
          </span>
        </label>
      </fieldset>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="adjust-amount">Importe ({debt.currency})</label>
          <MoneyInput id="adjust-amount" currency={debt.currency} />
        </FormField>
        <FormField>
          <label htmlFor="adjust-date">Fecha</label>
          <input
            id="adjust-date"
            name="effectiveOn"
            type="date"
            defaultValue={today}
            min={debt.lentOn}
            required
          />
        </FormField>
      </div>
      <FormField>
        <label htmlFor="adjust-reason">Motivo</label>
        <input
          id="adjust-reason"
          name="reason"
          maxLength={200}
          required
          autoComplete="off"
          placeholder="Queda registrado en el historial"
        />
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          loading={action.isPending}
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
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        Cancelar deja sin efecto en tu registro el saldo de{" "}
        {formatMoney(debt.balanceMinor, debt.currency)}. No se registra como
        pago y podés reabrirla más adelante.
      </p>
      <FormField>
        <label htmlFor="cancel-reason">Motivo</label>
        <input
          id="cancel-reason"
          name="reason"
          maxLength={200}
          required
          autoComplete="off"
          placeholder="Ej. Se lo regalé"
        />
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          loading={action.isPending}
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
      <FormField>
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
      </FormField>
      <FormField>
        <label htmlFor="edit-due">Vence (opcional)</label>
        <input
          id="edit-due"
          name="dueOn"
          type="date"
          min={debt.lentOn}
          defaultValue={debt.dueOn ?? ""}
        />
      </FormField>
      <FormField>
        <label htmlFor="edit-notes">Notas</label>
        <input
          id="edit-notes"
          name="notes"
          maxLength={500}
          defaultValue={debt.notes ?? ""}
          autoComplete="off"
        />
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          El importe inicial no se edita: usá un ajuste para que quede en el
          historial.
        </span>
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" loading={update.isPending}>
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
      <dl className="debt-summary grid grid-cols-[1fr_1fr] mt-0 mb-5 mx-0 gap-2.5 desktop:grid-cols-[repeat(auto-fit,_minmax(110px,_1fr))] [&_div]:[background:#f5f7fb] [&_div]:px-3 [&_div]:py-2.5 [&_div]:rounded-[9px] [&_dt]:text-[0.75rem] [&_dt]:text-muted desktop:[&_dt]:text-[11px] max-desktop:[&_dd]:whitespace-nowrap [&_dd]:mt-1 [&_dd]:mb-0 [&_dd]:font-semibold [&_dd]:text-[0.9375rem] [&_dd]:tabular-nums [&_dd]:mx-0 desktop:[&_dd]:text-[13px] max-desktop:[&_.debt-balance]:col-span-full [&_.debt-balance]:[background:#edf2ff]">
        <div>
          <dt>Adeudado</dt>
          <dd>{money(debt.owedMinor)}</dd>
        </div>
        <div>
          <dt>{debt.direction === "PAYABLE" ? "Pagado" : "Cobrado"}</dt>
          <dd>{money(debt.paidMinor)}</dd>
        </div>
        {debt.forgivenMinor !== "0" && (
          <div>
            <dt>{debt.direction === "PAYABLE" ? "Reducido" : "Perdonado"}</dt>
            <dd>{money(debt.forgivenMinor)}</dd>
          </div>
        )}
        <div className="debt-balance">
          <dt>
            {debt.status === "CANCELLED"
              ? "Saldo cancelado"
              : debt.direction === "PAYABLE"
                ? "Falta pagar"
                : "Falta cobrar"}
          </dt>
          <dd>{money(debt.balanceMinor)}</dd>
        </div>
      </dl>
      {debt.status === "CANCELLED" ? (
        <>
          <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
            Cancelada: {debt.cancelReason}. El saldo quedó sin efecto en tu
            registro, sin registrarse como pago.
          </p>
          <FormError message={error} />
          <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
            <Button
              variant="secondary"
              className="w-full"
              loading={action.isPending}
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
          <div
            className="filter-group sheet-tabs max-desktop:grid-cols-[1fr_1fr] max-desktop:gap-y-[3px] max-desktop:gap-x-[3px] grid [background:#f3f5f9] flex-1 w-full mb-5 overflow-x-auto [scrollbar-width:none] p-[3px] rounded-[8px] desktop:flex desktop:flex-none desktop:w-auto [&_button]:[background:transparent] [&_button]:text-[0.8125rem] [&_button]:font-medium [&_button]:text-muted [&_button]:[flex:1_0_auto] [&_button]:min-h-11 [&_button]:inline-flex [&_button]:items-center [&_button]:whitespace-nowrap [&_button]:justify-center [&_button]:px-2 [&_button]:py-[7px] [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:rounded-[6px] [&_button]:gap-[5px] desktop:[&_button]:text-[0.6875rem] [&_button[aria-pressed='true']]:[background:white] [&_button[aria-pressed='true']]:text-[#3c4a62] [&_button[aria-pressed='true']]:shadow-[0_1px_4px_#14284a10]"
            role="tablist"
          >
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
      <h3 className="timeline-title text-[13px] mt-6 mb-2 mx-0">Historial</h3>
      <ol className="debt-timeline list-none m-0 p-0 [&_li]:grid [&_li]:grid-cols-[minmax(0,_1fr)_auto_auto] [&_li]:items-center [&_li]:border-t [&_li]:[border-top-style:solid] [&_li]:border-t-[#f0f3f8] [&_li]:text-[0.875rem] [&_li]:px-0 [&_li]:py-2.5 [&_li]:gap-2.5 desktop:[&_li]:text-[12px] [&_small]:block [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:mt-0.5 [&_small]:wrap-anywhere desktop:[&_small]:text-[11px] [&_.is-reverted]:opacity-[0.55] [&_.is-reverted_.timeline-amount]:line-through [&_.payment_.timeline-amount]:text-[#267354]">
        {[...debt.events].reverse().map((event) => (
          <li
            key={event.id}
            className={cn(
              ` ${event.kind.toLowerCase()}  ${event.reverted ? "is-reverted" : ""} `,
            )}
          >
            <div>
              <strong>
                {event.kind === "PAYMENT" && debt.direction === "PAYABLE"
                  ? "Pago realizado"
                  : event.kind === "LENT" && debt.direction === "PAYABLE"
                    ? "Préstamo recibido"
                    : event.kind === "FORGIVE" && debt.direction === "PAYABLE"
                      ? "Reducción acordada"
                      : eventLabel[event.kind]}
                {event.reverted && " · deshecho"}
              </strong>
              <small>
                {longDate(event.date)}
                {event.note ? ` · ${event.note}` : ""}
              </small>
            </div>
            {event.amountMinor && (
              <span className="timeline-amount tabular-nums font-semibold">
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
                  loading={
                    action.isPending &&
                    action.variables?.action.action === "undo" &&
                    action.variables.action.paymentId === event.id
                  }
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
      <button
        className="debt-row grid grid-cols-[auto_minmax(0,_1fr)_auto] items-center w-full border-t [border-top-style:solid] border-t-[#f0f3f8] border-r-0 [border-right-style:none] border-r-current border-b-0 [border-bottom-style:none] border-b-current border-l-0 [border-left-style:none] border-l-current [background:transparent] text-left text-inherit px-4 py-3.5 gap-3 desktop:px-5.5 desktop:py-4 hover:[background:#fafbfd]"
        onClick={onOpen}
      >
        <span className="avatar w-[35px] h-[35px] [background:#e9effe] text-[#4f6bbd] inline-grid place-content-center text-[11px] font-semibold shrink-0 border-[3px] border-solid border-[#f4f7ff] rounded-full [&.small]:w-7.5 [&.small]:h-7.5">
          {debt.contactName.slice(0, 1).toUpperCase()}
        </span>
        <span className="debt-info grid min-w-0 gap-[3px] [&_strong]:text-[0.875rem] desktop:[&_strong]:text-[13px] [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:wrap-anywhere desktop:[&_small]:text-[11px] [&_small.overdue]:text-[#a74849]">
          <strong>{debt.contactName}</strong>
          <small>{debt.description}</small>
          <small className={cn(overdue ? "overdue" : "")}>
            {debt.direction === "PAYABLE"
              ? "Yo debo · recibido el"
              : "Me deben · prestado el"}{" "}
            {shortDate(debt.lentOn)}
            {debt.dueOn &&
              ` · ${overdue ? "venció" : "vence"} el ${shortDate(debt.dueOn)}`}
          </small>
        </span>
        <span className="debt-amounts grid min-w-0 justify-items-end text-right gap-[3px] [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:wrap-anywhere desktop:[&_small]:text-[11px] [&_strong]:text-[0.875rem] [&_strong]:tabular-nums desktop:[&_strong]:text-[14px]">
          <strong>{formatMoney(debt.balanceMinor, debt.currency)}</strong>
          <small>de {formatMoney(debt.owedMinor, debt.currency)}</small>
          <Badge tone={label.tone}>{label.text}</Badge>
        </span>
        <span
          className="debt-progress [grid-column:2_/_-1] h-1 [background:#edf0f6] overflow-hidden rounded-[4px] [&_span]:block [&_span]:h-full [&_span]:[background:#2f9b6b]"
          aria-hidden="true"
        >
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
  const [directionFilter, setDirectionFilter] = useState<
    "ALL" | Debt["direction"]
  >("ALL");
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const detail = useDebt(user.id, openId);
  const [notice, setNotice] = useState("");
  const today = todayIn(user.preferences.timeZone);
  const rows = (debts.data?.debts ?? []).filter(
    (d) =>
      (directionFilter === "ALL" || d.direction === directionFilter) &&
      (filter === "all"
        ? true
        : filter === "active"
          ? d.status === "OPEN" || d.status === "PARTIALLY_PAID"
          : filter === "paid"
            ? d.status === "PAID"
            : d.status === "CANCELLED"),
  );
  const done = (text: string) => {
    setNotice(text);
  };
  return (
    <>
      <div className="page-heading month-heading flex items-center justify-between mb-4.5 flex-wrap gap-3.5 desktop:mb-[25px] [&_h1]:text-[1.875rem] desktop:[&_h1]:text-[2rem] [&_.eyebrow]:hidden desktop:[&_.eyebrow]:block [&_.page-description]:hidden desktop:[&_.page-description]:block">
        <div>
          <p className="eyebrow text-muted tracking-[1.45px] text-[11px] font-[650] mb-[11px]">
            LO QUE TE DEBEN Y LO QUE DEBÉS
          </p>
          <h1>
            Deudas con personas<span className="title-dot text-brand">.</span>
          </h1>
          <p className="page-description text-muted text-[0.8125rem] leading-[1.7] mt-2.5">
            Dinero por cobrar y por pagar, con pagos parciales e historial.
          </p>
        </div>
        <div className="heading-actions flex items-center w-full justify-between gap-2 min-[701px]:gap-3 min-[1251px]:w-auto max-[701px]:[&>.button]:text-[11px] max-[701px]:[&>.button]:pl-2.5 max-[701px]:[&>.button]:pr-2.5">
          <Button
            className="desktop-create hidden desktop:inline-flex"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
            Registrar deuda
          </Button>
        </div>
      </div>
      {debts.isPending ? (
        <SkeletonList label="Cargando deudas…" rows={3} className="mt-2" />
      ) : debts.isError ? (
        <section
          className="card empty-state [background:white] shadow-[0_3px_10px_#1b2d4f02] text-center text-muted px-5.5 py-[35px] border border-solid border-line rounded-card [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]"
          role="alert"
        >
          <h3>No pudimos cargar las deudas</h3>
          <p>{errorMessage(debts.error)}</p>
          <Button variant="secondary" onClick={() => void debts.refetch()}>
            Reintentar
          </Button>
        </section>
      ) : debts.data.debts.length === 0 ? (
        <section className="card empty-state [background:white] shadow-[0_3px_10px_#1b2d4f02] text-center text-muted px-5.5 py-[35px] border border-solid border-line rounded-card [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
          <HandCoins size={27} />
          <h3>No registraste deudas</h3>
          <p>
            Anotá lo que te deben o lo que debés y registrá cada pago parcial.
            Es independiente de tus gastos compartidos.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus size={17} />
            Registrar deuda
          </Button>
        </section>
      ) : (
        <>
          {debts.data.totals.length > 0 && (
            <section
              className="metrics grid grid-cols-2 mb-5 gap-2.5 desktop:grid-cols-2 desktop:mb-6.5 desktop:gap-4.5"
              aria-label="Saldos por cobrar y por pagar"
            >
              {debts.data.totals.map((total, index) => (
                <article
                  key={`${total.direction}-${total.currency}`}
                  className={cn(
                    `metric-card [background:white] min-w-0 px-4 py-3.5 border border-solid border-line rounded-card [&>p]:text-[11px] [&>p]:text-muted [&>p]:mt-[7px] [&>p]:mb-4.5 [&>p]:mx-0 [&>.badge]:mt-[7px] max-desktop:[&_.badge]:text-[11px] [&:not(.metric-featured)_.metric-icon]:hidden desktop:[&:not(.metric-featured)_.metric-icon]:grid [&:not(.metric-featured)]:p-3.5 desktop:[&:not(.metric-featured)]:px-[23px] desktop:[&:not(.metric-featured)]:py-5 [&:not(.metric-featured)_.metric-label]:text-[0.75rem] [&:not(.metric-featured)_.metric-label]:mb-[5px] desktop:[&:not(.metric-featured)_.metric-label]:mb-[13px] [&:not(.metric-featured)_.metric-value]:text-[clamp(19px,_5.3vw,_25px)] desktop:[&:not(.metric-featured)_.metric-value]:text-[clamp(23px,_2.15vw,_33px)] max-[701px]:[&:not(.metric-featured)>p]:text-[11px] desktop:[&:not(.metric-featured)>p]:text-[0.6875rem] max-[701px]:[&:not(.metric-featured)>p]:leading-[1.8] max-[701px]:[&:not(.metric-featured)>p]:min-h-10 desktop:[&:not(.metric-featured)>p]:min-h-0 max-[701px]:[&:not(.metric-featured)>p]:mt-2 max-[701px]:[&:not(.metric-featured)>p]:mr-0 max-[701px]:[&:not(.metric-featured)>p]:mb-2 max-[701px]:[&:not(.metric-featured)>p]:ml-0 [&:not(.metric-featured)>p]:hidden desktop:[&:not(.metric-featured)>p]:block max-[701px]:[&:not(.metric-featured)_.badge]:text-[11px] max-[701px]:[&:not(.metric-featured)_.badge]:pt-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pr-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pb-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pl-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:mt-1.5 [&:not(.metric-featured)>.badge]:hidden desktop:[&:not(.metric-featured)>.badge]:inline-flex ${index === 0 ? 'metric-featured [background:linear-gradient(115deg,_#3156d1,_#4569e5)] text-white shadow-[0_8px_18px_#3358d219] relative overflow-hidden col-span-full px-4.5 py-4 border-transparent desktop:[grid-column:auto] desktop:px-[23px] desktop:py-5 after:[content:""] after:absolute after:w-[180px] after:h-[180px] after:-right-20 after:top-[-75px] after:pointer-events-none after:border-[25px] after:border-solid after:border-[#ffffff05] after:rounded-full [&_.metric-label]:text-[#e0e8ff] [&_.metric-label]:mb-0.5 [&_.metric-label]:text-[0.8125rem] desktop:[&_.metric-label]:mb-[13px] desktop:[&_.metric-label]:text-[0.75rem] max-[701px]:[&>p]:text-[11px] desktop:[&>p]:text-[0.6875rem] desktop:[&>p]:min-h-0 [&>p]:text-[#e5ecff] [&>p]:hidden desktop:[&>p]:block [&_.metric-value]:text-[2rem] desktop:[&_.metric-value]:text-[clamp(23px,_2.15vw,_33px)] [&_.metric-icon]:grid' : ""} `,
                  )}
                >
                  <div className="metric-label flex justify-between items-center text-[11px] text-muted mb-[13px]">
                    <span>
                      {total.direction === "PAYABLE" ? "Debés" : "Te deben"} ·{" "}
                      {total.currency}
                    </span>
                    <span className="metric-icon h-[29px] w-[29px] grid place-content-center [background:#ffffff1c] rounded-[9px] min-[701px]:hidden desktop:grid">
                      <HandCoins size={18} />
                    </span>
                  </div>
                  <strong className="metric-value text-[20px] font-[620] tracking-[-0.6px] tabular-nums whitespace-normal wrap-anywhere desktop:text-[25px] desktop:tracking-[-0.8px] min-[1251px]:text-[clamp(23px,_2.15vw,_33px)] min-[1650px]:text-[35px]">
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
          <section className="card debts-panel [background:white] shadow-[0_3px_10px_#1b2d4f02] mb-4 border border-solid border-line rounded-card">
            <header className="panel-heading flex justify-between items-center p-4 gap-3.5 desktop:pt-[23px] desktop:pb-4.5 desktop:px-5.5 [&_h2]:text-[1rem] [&_h2]:flex [&_h2]:items-center [&_h2]:gap-[9px] desktop:[&_h2]:text-[0.875rem] [&_p]:text-muted [&_p]:text-[0.75rem] [&_p]:mt-[5px] [&>svg]:text-muted">
              <div>
                <h2>
                  Deudas{" "}
                  <span className="count inline-flex items-center justify-center min-w-5 h-5 [background:#f2f4f9] text-[11px] text-muted rounded-[6px]">
                    {debts.data.debts.length}
                  </span>
                </h2>
                <p>Tocá uno para registrar un pago o ver su historial.</p>
              </div>
            </header>
            <div className="expense-toolbar flex justify-between items-center pt-0 pb-3.5 flex-wrap px-3 gap-3 desktop:pr-5.5 desktop:pb-5 desktop:pl-5.5 desktop:flex-nowrap">
              <label className="flex min-h-11 items-center gap-2 text-sm text-muted">
                <span>Tipo</span>
                <select
                  aria-label="Filtrar por tipo de deuda"
                  value={directionFilter}
                  onChange={(event) =>
                    setDirectionFilter(
                      event.target.value as typeof directionFilter,
                    )
                  }
                  className="min-h-11 rounded-lg border border-line bg-white px-3 text-sm text-ink"
                >
                  <option value="ALL">Me deben y yo debo</option>
                  <option value="RECEIVABLE">Me deben</option>
                  <option value="PAYABLE">Yo debo</option>
                </select>
              </label>
              <div
                className="filter-group flex [background:#f3f5f9] flex-1 w-full p-[3px] rounded-[8px] desktop:flex-none desktop:w-auto [&_button]:[background:transparent] [&_button]:text-[0.8125rem] [&_button]:font-medium [&_button]:text-muted [&_button]:flex-1 [&_button]:min-h-11 [&_button]:px-2 [&_button]:py-[7px] [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:rounded-[6px] desktop:[&_button]:text-[0.6875rem] [&_button[aria-pressed='true']]:[background:white] [&_button[aria-pressed='true']]:text-[#3c4a62] [&_button[aria-pressed='true']]:shadow-[0_1px_4px_#14284a10]"
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
              <ul className="debt-list list-none m-0 p-0">
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
              <div className="empty-state text-center text-muted px-5.5 py-[35px] [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
                <CircleCheck size={27} />
                <h3>No hay deudas en este filtro</h3>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setFilter("all");
                    setDirectionFilter("ALL");
                  }}
                >
                  Ver todas
                </Button>
              </div>
            )}
          </section>
        </>
      )}
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        Las deudas son privadas y no se mezclan con tus gastos ni con los
        compartidos. Los pagos se registran en la moneda del préstamo.
      </p>
      <div
        className="feedback-message empty:hidden fixed bottom-[calc(var(--navigation-height)_+_76px_+_env(safe-area-inset-bottom))] left-1/2 [transform:translateX(-50%)] z-[40] max-w-[calc(100vw_-_36px)] w-max [background:#1f304b] text-white flex items-center shadow-[0_10px_30px_#15244020] text-[0.8125rem] px-3 py-2.5 border border-solid border-[#324766] rounded-[12px] gap-2 desktop:bottom-6 desktop:left-[calc(50%_+_102px)] desktop:text-[0.75rem] [&>svg]:text-muted [&_.icon-button:hover]:[background:#ffffff17] [&_.toast-undo]:text-white [&_.toast-undo]:underline [&_.toast-undo]:pl-2 [&_.toast-undo]:pr-2 [&_.toast-undo:hover]:[background:#ffffff17]"
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
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Cerrar aviso"
              onClick={() => setNotice("")}
            >
              ×
            </button>
          </>
        )}
      </div>
      <Button
        className="mobile-create desktop:hidden fixed right-[max(16px,_env(safe-area-inset-right))] bottom-[calc(var(--navigation-height)_+_12px_+_env(safe-area-inset-bottom))] z-[29] min-h-12 shadow-[0_6px_24px_#253f9840] px-4.5 py-3 rounded-[16px] [body:has(.search-field_input:focus)_&]:hidden"
        onClick={() => setCreating(true)}
      >
        <Plus size={20} />
        Registrar deuda
      </Button>
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Registrar deuda"
        description="Elegí si te deben dinero o si vos le debés a alguien."
      >
        <CreateDebtForm
          user={user}
          onDone={(debt) => {
            setCreating(false);
            setFilter("active");
            done(`Registraste la deuda con ${debt.contactName}.`);
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
            ? `${detail.data.direction === "PAYABLE" ? "Debo a" : "Me debe"} ${detail.data.contactName} · ${detail.data.description}`
            : "Deuda"
        }
        description={
          detail.data
            ? `${statusLabel[detail.data.status].text} · ${detail.data.direction === "PAYABLE" ? "recibido" : "prestado"} el ${longDate(detail.data.lentOn)}`
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
          <SkeletonList label="Cargando deuda…" rows={3} className="mt-2" />
        )}
      </Modal>
    </>
  );
}

export default function Debts() {
  return <Workspace>{(user) => <DebtsView user={user} />}</Workspace>;
}
