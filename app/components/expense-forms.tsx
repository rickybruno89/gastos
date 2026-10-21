import { useState, type FormEvent } from "react";
import {
  CalendarCheck,
  CircleSlash,
  Pencil,
  Plus,
  Repeat,
  Users,
} from "lucide-react";
import { FormField, Button } from "./ui";
import { MoneyInput } from "./money-input";
import {
  SharesEditor,
  rowsFromShares,
  sharesFromRows,
  type ShareRow,
} from "./shares-editor";
import { useChangeShares } from "../lib/sharing";
import {
  errorMessage,
  useChangeOccurrence,
  useCreateExpense,
  useOccurrenceAction,
  useRenameExpense,
} from "../lib/expenses";
import {
  parseAmount,
  periodLabel,
  shortDate,
  formatShare,
  shortPeriod,
} from "../lib/format";
import { addMonths } from "../../shared/domain/periods";
import type { Occurrence } from "../../shared/contracts/expenses";

const amountError =
  "Ingresá un importe mayor a cero, con hasta dos decimales. Ej. 28000 o 1.250,50";

function FormError({ message }: { message: string }) {
  return message ? (
    <p
      role="alert"
      className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
    >
      {message}
    </p>
  ) : null;
}

export function CreateExpenseForm({
  userId,
  period,
  onCreated,
}: {
  userId: string;
  period: string;
  onCreated: (name: string, firstPeriod: string) => void;
}) {
  const create = useCreateExpense(userId);
  const [error, setError] = useState("");
  const [interval, setIntervalMonths] = useState<1 | 2>(1);
  const [shared, setShared] = useState(false);
  const [rows, setRows] = useState<ShareRow[]>([]);
  const month = periodLabel(period).toLowerCase();
  const next = addMonths(period, 1);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountMinor = parseAmount(String(data.get("amount")));
    if (!amountMinor) return setError(amountError);
    const sharing = shared ? sharesFromRows(rows) : { shares: [] };
    if ("error" in sharing) return setError(sharing.error);
    setError("");
    const name = String(data.get("name")).trim();
    const firstPeriod =
      interval === 2 && data.get("firstPeriod") === next ? next : period;
    create.mutate(
      {
        name,
        amountMinor,
        currency: data.get("currency") === "USD" ? "USD" : "ARS",
        dueDay: Number(data.get("dueDay")),
        intervalMonths: interval,
        firstPeriod,
        shares: sharing.shares,
      },
      { onSuccess: () => onCreated(name, firstPeriod) },
    );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="expense-name">Nombre del gasto</label>
        <input
          id="expense-name"
          name="name"
          placeholder="Ej. Alquiler"
          required
          maxLength={80}
          pattern=".*\S.*"
          autoComplete="off"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="expense-amount">Importe</label>
          <MoneyInput id="expense-amount" />
        </FormField>
        <FormField>
          <label htmlFor="expense-currency">Moneda</label>
          <select name="currency" id="expense-currency">
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </FormField>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="expense-interval">Frecuencia</label>
          <select
            id="expense-interval"
            value={interval}
            onChange={(event) =>
              setIntervalMonths(event.target.value === "2" ? 2 : 1)
            }
          >
            <option value="1">Cada mes</option>
            <option value="2">Cada dos meses</option>
          </select>
        </FormField>
        <FormField>
          <label htmlFor="expense-day">Día de vencimiento</label>
          <input
            type="number"
            inputMode="numeric"
            name="dueDay"
            id="expense-day"
            min={1}
            max={31}
            defaultValue={10}
            required
          />
        </FormField>
      </div>
      {interval === 2 && (
        <FormField>
          <label htmlFor="expense-first">Primer vencimiento</label>
          <select id="expense-first" name="firstPeriod" defaultValue={period}>
            <option value={period}>{periodLabel(period)}</option>
            <option value={next}>{periodLabel(next)}</option>
          </select>
          <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
            Después se repite cada dos meses; en los meses intermedios no suma.
          </span>
        </FormField>
      )}
      <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
        {interval === 1 ? `Se repite todos los meses desde ${month}. ` : ""}
        Si el mes es más corto, vence el último día.
      </span>
      <label className="check-field flex items-start text-[0.875rem] text-ink min-h-11 mx-0 my-4.5 gap-2.5 desktop:text-[12px] [&_input]:mt-0.5 [&_input]:w-4.5 [&_input]:h-4.5 [&_input]:[accent-color:var(--color-brand)] [&_small]:block [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:mt-[3px] desktop:[&_small]:text-[11px]">
        <input
          type="checkbox"
          checked={shared}
          onChange={(event) => setShared(event.target.checked)}
        />
        <span>
          Compartir este gasto
          <small>Repartilo por porcentaje con otras personas.</small>
        </span>
      </label>
      {shared && (
        <SharesEditor userId={userId} rows={rows} onChange={setRows} />
      )}
      <FormError
        message={error || (create.isError ? errorMessage(create.error) : "")}
      />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" disabled={create.isPending}>
          <Plus size={17} />
          {create.isPending ? "Guardando…" : "Crear gasto"}
        </Button>
      </div>
    </form>
  );
}

function EditForm({
  userId,
  occurrence,
  onDone,
}: {
  userId: string;
  occurrence: Occurrence;
  onDone: (message: string) => void;
}) {
  const change = useChangeOccurrence(userId);
  const rename = useRenameExpense(userId);
  const [error, setError] = useState("");
  const pending = change.isPending || rename.isPending;
  const month = periodLabel(occurrence.period).toLowerCase();
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get("name")).trim();
    const amountMinor = parseAmount(String(data.get("amount")));
    if (!amountMinor) return setError(amountError);
    const dueDay = Number(data.get("dueDay"));
    const scope =
      data.get("scope") === "THIS_AND_FUTURE"
        ? "THIS_AND_FUTURE"
        : "THIS_MONTH";
    const renamed = name !== occurrence.name;
    const amountChanged = amountMinor !== occurrence.amountMinor;
    const dueChanged = dueDay !== occurrence.dueDay;
    if (!renamed && !amountChanged && !dueChanged)
      return setError("No hay cambios para guardar.");
    setError("");
    try {
      if (renamed) await rename.mutateAsync({ occurrence, name });
      if (amountChanged || dueChanged)
        await change.mutateAsync({
          occurrence,
          ...(amountChanged && { amount: { amountMinor, scope } }),
          ...(dueChanged && { dueDay }),
        });
      onDone(`${name} se actualizó.`);
    } catch (failure) {
      setError(errorMessage(failure));
    }
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="edit-name">Nombre</label>
        <input
          id="edit-name"
          name="name"
          defaultValue={occurrence.name}
          required
          maxLength={80}
          pattern=".*\S.*"
          autoComplete="off"
        />
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          El nombre cambia en todos los meses.
        </span>
      </FormField>
      <FormField>
        <label htmlFor="edit-amount">Importe ({occurrence.currency})</label>
        <MoneyInput
          id="edit-amount"
          currency={occurrence.currency}
          defaultMinor={occurrence.amountMinor}
        />
      </FormField>
      <fieldset className="choice-group mt-0 mb-5.5 grid mx-0 p-0 border-0 border-none border-current gap-2 [&_legend]:text-[0.875rem] [&_legend]:font-[550] [&_legend]:text-[#53637b] [&_legend]:mb-2 desktop:[&_legend]:text-[11px] [&_label]:flex [&_label]:items-start [&_label]:min-h-11 [&_label]:text-[0.875rem] [&_label]:text-ink [&_label]:p-3 [&_label]:border [&_label]:border-solid [&_label]:border-[#dce3ef] [&_label]:rounded-[8px] [&_label]:gap-2.5 desktop:[&_label]:text-[12px] [&_label:has(input:checked)]:[background:#f3f6ff] [&_label:has(input:checked)]:border-brand [&_input]:mt-0.5 [&_input]:[accent-color:var(--color-brand)] [&_small]:block [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:mt-[3px] desktop:[&_small]:text-[11px]">
        <legend>¿A qué meses aplica el nuevo importe?</legend>
        <label>
          <input type="radio" name="scope" value="THIS_MONTH" defaultChecked />
          <span>
            Solo {month}
            <small>Los meses siguientes conservan su importe.</small>
          </span>
        </label>
        <label>
          <input type="radio" name="scope" value="THIS_AND_FUTURE" />
          <span>
            {periodLabel(occurrence.period)} y los meses siguientes
            <small>Los meses pagados o cubiertos no cambian.</small>
          </span>
        </label>
      </fieldset>
      <FormField>
        <label htmlFor="edit-day">Día de vencimiento</label>
        <input
          type="number"
          inputMode="numeric"
          name="dueDay"
          id="edit-day"
          min={1}
          max={31}
          defaultValue={occurrence.dueDay}
          required
        />
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          Un nuevo vencimiento aplica a {month} y a los meses siguientes.
        </span>
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function AnnualForm({
  userId,
  occurrence,
  onDone,
}: {
  userId: string;
  occurrence: Occurrence;
  onDone: (message: string, undo: Occurrence) => void;
}) {
  const action = useOccurrenceAction(userId);
  const [months, setMonths] = useState(12);
  const [error, setError] = useState("");
  const covered = Array.from({ length: months }, (_, index) =>
    addMonths(occurrence.period, index),
  ).filter(
    (_, index) => occurrence.intervalMonths === 1 || index % 2 === 0,
  ).length;
  const lastPeriod = addMonths(occurrence.period, months - 1);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const amountMinor = parseAmount(
      String(new FormData(event.currentTarget).get("amount")),
    );
    if (!amountMinor) return setError(amountError);
    setError("");
    action.mutate(
      {
        occurrence,
        action: { action: "annual-payments", months, amountMinor },
      },
      {
        onSuccess: (updated) =>
          onDone(
            `${updated.name}: pago anual registrado, cubre ${shortPeriod(occurrence.period)} – ${shortPeriod(lastPeriod)}.`,
            updated,
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        Pagás ahora por adelantado. Este mes queda pagado por el importe total y
        los siguientes aparecen como “Pago anual”, sin importe pendiente.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="annual-months">Meses que cubre</label>
          <input
            id="annual-months"
            type="number"
            inputMode="numeric"
            min={2}
            max={24}
            value={months}
            onChange={(event) =>
              setMonths(
                Math.min(24, Math.max(2, Number(event.target.value) || 2)),
              )
            }
            required
          />
        </FormField>
        <FormField>
          <label htmlFor="annual-amount">
            Total pagado ({occurrence.currency})
          </label>
          <MoneyInput
            id="annual-amount"
            key={months}
            currency={occurrence.currency}
            defaultMinor={(
              BigInt(occurrence.amountMinor) * BigInt(covered)
            ).toString()}
          />
        </FormField>
      </div>
      <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
        Cubre de {periodLabel(occurrence.period).toLowerCase()}{" "}
        {occurrence.period.slice(0, 4)} a{" "}
        {periodLabel(lastPeriod).toLowerCase()} {lastPeriod.slice(0, 4)}. Ajustá
        el total si tuvo descuento.
      </span>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" disabled={action.isPending}>
          <CalendarCheck size={17} />
          {action.isPending ? "Guardando…" : "Registrar pago anual"}
        </Button>
      </div>
    </form>
  );
}

function ReasonForm({
  userId,
  occurrence,
  kind,
  onDone,
}: {
  userId: string;
  occurrence: Occurrence;
  kind: "skip" | "cancel";
  onDone: (message: string) => void;
}) {
  const action = useOccurrenceAction(userId);
  const [error, setError] = useState("");
  const month = periodLabel(occurrence.period).toLowerCase();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const reason = String(
      new FormData(event.currentTarget).get("reason"),
    ).trim();
    if (!reason) return setError("Contanos el motivo.");
    setError("");
    action.mutate(
      { occurrence, action: { action: kind, reason } },
      {
        onSuccess: (updated) =>
          onDone(
            kind === "skip"
              ? `${updated.name} se omitió en ${month}.`
              : `${updated.name} se dio de baja desde ${month}.`,
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        {kind === "skip"
          ? `${occurrence.name} no se paga en ${month} y no suma al pendiente. Los demás meses siguen igual.`
          : `${occurrence.name} deja de aparecer después de ${month}. Este mes queda registrado como dado de baja. Podés reactivarlo más adelante.`}
      </p>
      <FormField>
        <label htmlFor={`${kind}-reason`}>Motivo</label>
        <input
          id={`${kind}-reason`}
          name="reason"
          placeholder={
            kind === "skip"
              ? "Ej. Sin consumo este mes"
              : "Ej. Cancelé el servicio"
          }
          required
          maxLength={200}
          autoComplete="off"
        />
      </FormField>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button
          type="submit"
          variant="secondary"
          className="w-full"
          disabled={action.isPending}
        >
          {action.isPending
            ? "Guardando…"
            : kind === "skip"
              ? `Omitir ${month}`
              : "Dar de baja"}
        </Button>
      </div>
    </form>
  );
}

function SharesForm({
  userId,
  occurrence,
  onDone,
}: {
  userId: string;
  occurrence: Occurrence;
  onDone: (message: string) => void;
}) {
  const change = useChangeShares(userId);
  const [rows, setRows] = useState<ShareRow[]>(
    rowsFromShares(occurrence.sharing?.participants ?? []),
  );
  const [error, setError] = useState("");
  const month = periodLabel(occurrence.period).toLowerCase();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const sharing = sharesFromRows(rows);
    if ("error" in sharing) return setError(sharing.error);
    setError("");
    change.mutate(
      { occurrence, shares: sharing.shares },
      {
        onSuccess: (updated) =>
          onDone(
            updated.sharing
              ? `${updated.name}: nuevo reparto desde ${month}.`
              : `${updated.name} ya no se comparte desde ${month}.`,
          ),
        onError: (failure) => setError(errorMessage(failure)),
      },
    );
  }
  return (
    <form onSubmit={submit}>
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        El reparto aplica a {month} y a los meses siguientes. Los meses ya
        pagados conservan el suyo. Pagar el gasto no salda la parte de nadie.
      </p>
      <SharesEditor userId={userId} rows={rows} onChange={setRows} />
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full" disabled={change.isPending}>
          {change.isPending ? "Guardando…" : "Guardar reparto"}
        </Button>
      </div>
    </form>
  );
}

export function sharingSummary(occurrence: Occurrence) {
  const sharing = occurrence.sharing;
  if (!sharing) return null;
  const names = sharing.participants.map((p) => p.nickname).join(", ");
  return `Con ${names} · tu parte ${formatShare(sharing.ownerShareBps)}`;
}

const tabs = [
  { id: "edit", label: "Editar", icon: Pencil },
  { id: "shares", label: "Reparto", icon: Users },
  { id: "annual", label: "Pago anual", icon: CalendarCheck },
  { id: "skip", label: "Omitir", icon: Repeat },
  { id: "cancel", label: "Dar de baja", icon: CircleSlash },
] as const;

export function statusSummary(occurrence: Occurrence) {
  switch (occurrence.status) {
    case "PAID":
      return occurrence.payment?.annual && occurrence.coverage
        ? `Pago anual · cubre hasta ${shortPeriod(occurrence.coverage.toPeriod)}`
        : occurrence.payment
          ? `Pagado el ${shortDate(occurrence.payment.paidOn)}`
          : "Pagado";
    case "COVERED":
      return occurrence.coverage
        ? `Cubierto por el pago anual de ${shortPeriod(occurrence.coverage.fromPeriod)}`
        : "Cubierto por un pago anual";
    case "SKIPPED":
      return `Omitido · ${occurrence.statusReason}`;
    case "CANCELLED":
      return `Dado de baja · ${occurrence.statusReason}`;
    default:
      return (
        sharingSummary(occurrence) ??
        (occurrence.intervalMonths === 2 ? "Cada dos meses" : "Mensual")
      );
  }
}

export function OccurrenceSheet({
  userId,
  occurrence,
  onDone,
  onTogglePayment,
  onGoTo,
}: {
  userId: string;
  occurrence: Occurrence;
  onDone: (message: string, undo?: Occurrence) => void;
  onTogglePayment: (occurrence: Occurrence) => void;
  onGoTo: (period: string) => void;
}) {
  const [tab, setTab] = useState<(typeof tabs)[number]["id"]>("edit");
  const restore = useOccurrenceAction(userId);
  const [error, setError] = useState("");
  if (occurrence.status === "PLANNED")
    return (
      <>
        <div
          className="filter-group sheet-tabs max-desktop:grid-cols-[1fr_1fr] max-desktop:gap-y-[3px] max-desktop:gap-x-[3px] grid [background:#f3f5f9] flex-1 w-full mb-5 overflow-x-auto [scrollbar-width:none] p-[3px] rounded-[8px] desktop:flex desktop:flex-none desktop:w-auto [&_button]:[background:transparent] [&_button]:text-[0.8125rem] [&_button]:font-medium [&_button]:text-muted [&_button]:[flex:1_0_auto] [&_button]:min-h-11 [&_button]:inline-flex [&_button]:items-center [&_button]:whitespace-nowrap [&_button]:justify-center [&_button]:px-2 [&_button]:py-[7px] [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:rounded-[6px] [&_button]:gap-[5px] desktop:[&_button]:text-[0.6875rem] [&_button[aria-pressed='true']]:[background:white] [&_button[aria-pressed='true']]:text-[#3c4a62] [&_button[aria-pressed='true']]:shadow-[0_1px_4px_#14284a10]"
          role="tablist"
        >
          {tabs.map(({ id, label, icon: Icon }) => (
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
        {tab === "edit" ? (
          <EditForm userId={userId} occurrence={occurrence} onDone={onDone} />
        ) : tab === "shares" ? (
          <SharesForm userId={userId} occurrence={occurrence} onDone={onDone} />
        ) : tab === "annual" ? (
          <AnnualForm userId={userId} occurrence={occurrence} onDone={onDone} />
        ) : (
          <ReasonForm
            key={tab}
            userId={userId}
            occurrence={occurrence}
            kind={tab}
            onDone={onDone}
          />
        )}
      </>
    );
  const month = periodLabel(occurrence.period).toLowerCase();
  if (occurrence.status === "COVERED")
    return (
      <>
        <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
          {statusSummary(occurrence)}. No tiene importe pendiente. Para
          modificarlo, deshacé el pago anual desde el mes en que se pagó.
        </p>
        {occurrence.coverage && (
          <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
            <Button
              variant="secondary"
              className="w-full"
              onClick={() => onGoTo(occurrence.coverage!.fromPeriod)}
            >
              Ir a {periodLabel(occurrence.coverage.fromPeriod).toLowerCase()}{" "}
              {occurrence.coverage.fromPeriod.slice(0, 4)}
            </Button>
          </div>
        )}
      </>
    );
  if (occurrence.status === "PAID")
    return (
      <>
        <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
          {statusSummary(occurrence)}
          {occurrence.payment?.annual
            ? `. Deshacer este pago libera también los meses que cubre.`
            : "."}{" "}
          Para corregirlo, primero deshacé el pago; después podés editarlo y
          volver a marcarlo como pagado.
        </p>
        <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => onTogglePayment(occurrence)}
          >
            {occurrence.payment?.annual
              ? "Deshacer pago anual"
              : "Deshacer pago"}
          </Button>
        </div>
      </>
    );
  return (
    <>
      <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
        {occurrence.status === "SKIPPED"
          ? `Omitido en ${month}: ${occurrence.statusReason}. No suma al pendiente.`
          : `Dado de baja desde ${month}: ${occurrence.statusReason}. No aparece en los meses siguientes.`}
      </p>
      <FormError message={error} />
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button
          variant="secondary"
          className="w-full"
          disabled={restore.isPending}
          onClick={() =>
            restore.mutate(
              { occurrence, action: { action: "restore" } },
              {
                onSuccess: (updated) =>
                  onDone(
                    occurrence.status === "SKIPPED"
                      ? `${updated.name} volvió a ${month}.`
                      : `${updated.name} se reactivó.`,
                  ),
                onError: (failure) => setError(errorMessage(failure)),
              },
            )
          }
        >
          {restore.isPending
            ? "Guardando…"
            : occurrence.status === "SKIPPED"
              ? `Restaurar ${month}`
              : "Reactivar gasto"}
        </Button>
      </div>
    </>
  );
}
