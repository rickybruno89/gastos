import { useState, type FormEvent } from "react";
import {
  CalendarCheck,
  CircleSlash,
  Pencil,
  Plus,
  Repeat,
  Users,
} from "lucide-react";
import { Button } from "./ui";
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
  amountInput,
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
    <p role="alert" className="error-message">
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
      <div className="form-field">
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
      </div>
      <div className="form-grid">
        <div className="form-field">
          <label htmlFor="expense-amount">Importe</label>
          <input
            id="expense-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            required
            maxLength={18}
            autoComplete="off"
          />
        </div>
        <div className="form-field">
          <label htmlFor="expense-currency">Moneda</label>
          <select name="currency" id="expense-currency">
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </div>
      </div>
      <div className="form-grid">
        <div className="form-field">
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
        </div>
        <div className="form-field">
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
        </div>
      </div>
      {interval === 2 && (
        <div className="form-field">
          <label htmlFor="expense-first">Primer vencimiento</label>
          <select id="expense-first" name="firstPeriod" defaultValue={period}>
            <option value={period}>{periodLabel(period)}</option>
            <option value={next}>{periodLabel(next)}</option>
          </select>
          <span className="field-help">
            Después se repite cada dos meses; en los meses intermedios no suma.
          </span>
        </div>
      )}
      <span className="field-help">
        {interval === 1 ? `Se repite todos los meses desde ${month}. ` : ""}
        Si el mes es más corto, vence el último día.
      </span>
      <label className="check-field">
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
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={create.isPending}
        >
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
      <div className="form-field">
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
        <span className="field-help">El nombre cambia en todos los meses.</span>
      </div>
      <div className="form-field">
        <label htmlFor="edit-amount">Importe ({occurrence.currency})</label>
        <input
          id="edit-amount"
          name="amount"
          inputMode="decimal"
          defaultValue={amountInput(occurrence.amountMinor)}
          required
          maxLength={18}
          autoComplete="off"
        />
      </div>
      <fieldset className="choice-group">
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
      <div className="form-field">
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
        <span className="field-help">
          Un nuevo vencimiento aplica a {month} y a los meses siguientes.
        </span>
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button type="submit" className="full-width" disabled={pending}>
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
      <p className="notice">
        Pagás ahora por adelantado. Este mes queda pagado por el importe total y
        los siguientes aparecen como “Pago anual”, sin importe pendiente.
      </p>
      <div className="form-grid">
        <div className="form-field">
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
        </div>
        <div className="form-field">
          <label htmlFor="annual-amount">
            Total pagado ({occurrence.currency})
          </label>
          <input
            id="annual-amount"
            name="amount"
            inputMode="decimal"
            key={months}
            defaultValue={amountInput(
              (BigInt(occurrence.amountMinor) * BigInt(covered)).toString(),
            )}
            required
            maxLength={18}
            autoComplete="off"
          />
        </div>
      </div>
      <span className="field-help">
        Cubre de {periodLabel(occurrence.period).toLowerCase()}{" "}
        {occurrence.period.slice(0, 4)} a{" "}
        {periodLabel(lastPeriod).toLowerCase()} {lastPeriod.slice(0, 4)}. Ajustá
        el total si tuvo descuento.
      </span>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={action.isPending}
        >
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
      <p className="notice">
        {kind === "skip"
          ? `${occurrence.name} no se paga en ${month} y no suma al pendiente. Los demás meses siguen igual.`
          : `${occurrence.name} deja de aparecer después de ${month}. Este mes queda registrado como dado de baja. Podés reactivarlo más adelante.`}
      </p>
      <div className="form-field">
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
      </div>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          variant="secondary"
          className="full-width"
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
      <p className="notice">
        El reparto aplica a {month} y a los meses siguientes. Los meses ya
        pagados conservan el suyo. Pagar el gasto no salda la parte de nadie.
      </p>
      <SharesEditor userId={userId} rows={rows} onChange={setRows} />
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={change.isPending}
        >
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
        <div className="filter-group sheet-tabs" role="tablist">
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
        <p className="notice">
          {statusSummary(occurrence)}. No tiene importe pendiente. Para
          modificarlo, deshacé el pago anual desde el mes en que se pagó.
        </p>
        {occurrence.coverage && (
          <div className="dialog-actions">
            <Button
              variant="secondary"
              className="full-width"
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
        <p className="notice">
          {statusSummary(occurrence)}
          {occurrence.payment?.annual
            ? `. Deshacer este pago libera también los meses que cubre.`
            : "."}{" "}
          Para corregirlo, primero deshacé el pago; después podés editarlo y
          volver a marcarlo como pagado.
        </p>
        <div className="dialog-actions">
          <Button
            variant="secondary"
            className="full-width"
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
      <p className="notice">
        {occurrence.status === "SKIPPED"
          ? `Omitido en ${month}: ${occurrence.statusReason}. No suma al pendiente.`
          : `Dado de baja desde ${month}: ${occurrence.statusReason}. No aparece en los meses siguientes.`}
      </p>
      <FormError message={error} />
      <div className="dialog-actions">
        <Button
          variant="secondary"
          className="full-width"
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
