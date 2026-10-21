import { ApiError } from "../../shared/api-client";
import { useState, type FormEvent } from "react";
import { Link } from "react-router";
import { z } from "zod";
import { Button, FormField } from "./ui";
import { MoneyInput } from "./money-input";
import {
  SharesEditor,
  sharesFromRows,
  rowsFromShares,
  type ShareRow,
} from "./shares-editor";
import { CreateExpenseForm } from "./expense-forms";
import { useCards, useCardWrite } from "../lib/cards";
import { errorMessage } from "../lib/expenses";
import { parseAmount } from "../lib/format";
import {
  cardSchema,
  statementSchema,
  type CreditCard,
  type CardStatement,
  type CardCharge,
  type CardRecurring,
} from "../../shared/contracts/cards";
import { todayIn } from "../../shared/domain/periods";
import type { CurrentUser } from "../../shared/contracts/account";
export function CardFormError({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="my-3 text-sm text-danger">
      {message}
    </p>
  ) : null;
}
const amountError = "Ingresá un importe mayor a cero, con hasta dos decimales.";
export function CardForm({
  userId,
  card,
  onDone,
}: {
  userId: string;
  card?: CreditCard;
  onDone: (card: CreditCard) => void;
}) {
  const write = useCardWrite(userId, cardSchema),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setError("");
    write.mutate(
      {
        path: card ? `/cards/${card.id}` : "/cards",
        method: card ? "PATCH" : "POST",
        body: {
          ...(card && { version: card.version }),
          name: String(d.get("name")).trim(),
          ...(card || d.get("lastFour")
            ? { lastFour: d.get("lastFour") ? String(d.get("lastFour")) : null }
            : {}),
          closingDay: Number(d.get("closingDay")),
          dueDay: Number(d.get("dueDay")),
        },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="card-name">Nombre de la tarjeta</label>
        <input
          id="card-name"
          name="name"
          required
          maxLength={80}
          defaultValue={card?.name}
          placeholder="Ej. Visa Galicia"
        />
      </FormField>
      <FormField>
        <label htmlFor="card-last">Últimos 4 dígitos (opcional)</label>
        <input
          id="card-last"
          name="lastFour"
          inputMode="numeric"
          pattern="[0-9]{4}"
          maxLength={4}
          defaultValue={card?.lastFour ?? ""}
        />
        <small className="text-xs text-muted">
          Solo para reconocerla. No ingreses el número completo ni el código de
          seguridad.
        </small>
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="card-close">Día habitual de cierre</label>
          <input
            id="card-close"
            name="closingDay"
            type="number"
            min={1}
            max={31}
            defaultValue={card?.closingDay ?? 28}
            required
          />
        </FormField>
        <FormField>
          <label htmlFor="card-due">Vence el mes siguiente, día</label>
          <input
            id="card-due"
            name="dueDay"
            type="number"
            min={1}
            max={31}
            defaultValue={card?.dueDay ?? 10}
            required
          />
        </FormField>
      </div>
      <p className="mb-4 text-sm text-muted">
        Son fechas sugeridas. En cada resumen confirmás el cierre y el
        vencimiento reales.
      </p>
      <CardFormError message={error} />
      <Button className="w-full" type="submit" disabled={write.isPending}>
        {write.isPending ? "Guardando…" : "Guardar tarjeta"}
      </Button>
    </form>
  );
}
export function PurchaseForm({
  user,
  period,
  cardId,
  onDone,
}: {
  user: CurrentUser;
  period: string;
  cardId?: string;
  onDone: (period: string) => void;
}) {
  const cards = useCards(user.id),
    write = useCardWrite(user.id, z.object({ id: z.string() }));
  const [kind, setKind] = useState<"purchase" | "recurring">("purchase"),
    [rows, setRows] = useState<ShareRow[]>([]),
    [error, setError] = useState("");
  const [duplicate, setDuplicate] = useState(false);
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      amountMinor = parseAmount(String(d.get("amount"))),
      parsed = sharesFromRows(rows);
    if (!amountMinor) return setError(amountError);
    if ("error" in parsed) return setError(parsed.error);
    const firstPeriod = String(d.get("firstPeriod"));
    setError("");
    write.mutate(
      {
        path: `/cards/${d.get("cardId")}/${kind === "purchase" ? "purchases" : "recurring"}`,
        body: {
          description: String(d.get("description")).trim(),
          amountMinor,
          currency: d.get("currency"),
          firstPeriod,
          shares: parsed.shares,
          ...(kind === "purchase" && {
            occurredOn: String(d.get("occurredOn")),
            installments: Number(d.get("installments")),
            confirmDuplicate: d.get("confirmDuplicate") === "on",
          }),
        },
      },
      {
        onSuccess: () => onDone(firstPeriod),
        onError: (e) => {
          setError(errorMessage(e));
          if (e instanceof ApiError && e.code === "POSSIBLE_DUPLICATE")
            setDuplicate(true);
        },
      },
    );
  }
  if (cards.isPending) return <p role="status">Cargando tarjetas…</p>;
  if (cards.isError)
    return <CardFormError message={errorMessage(cards.error)} />;
  const active = cards.data.filter((c) => !c.archived);
  if (!active.length)
    return (
      <p className="text-sm text-muted">
        Primero{" "}
        <Link to="/tarjetas" className="text-brand underline">
          agregá una tarjeta
        </Link>{" "}
        para registrar sus consumos.
      </p>
    );
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="purchase-card">Tarjeta</label>
        <select
          id="purchase-card"
          name="cardId"
          defaultValue={cardId ?? active[0].id}
        >
          {active.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField>
        <label htmlFor="purchase-kind">Tipo de cargo</label>
        <select
          id="purchase-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          <option value="purchase">Compra o compra en cuotas</option>
          <option value="recurring">Cargo recurrente mensual</option>
        </select>
      </FormField>
      <FormField>
        <label htmlFor="purchase-description">Descripción</label>
        <input
          id="purchase-description"
          name="description"
          required
          maxLength={120}
          placeholder="Ej. Heladera o suscripción"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="purchase-amount">
            {kind === "purchase"
              ? "Importe total de la compra"
              : "Importe por mes"}
          </label>
          <MoneyInput id="purchase-amount" />
        </FormField>
        <FormField>
          <label htmlFor="purchase-currency">Moneda</label>
          <select id="purchase-currency" name="currency">
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </FormField>
      </div>
      {kind === "purchase" && (
        <div className="grid grid-cols-2 gap-3">
          <FormField>
            <label htmlFor="purchase-date">Fecha de compra</label>
            <input
              id="purchase-date"
              type="date"
              name="occurredOn"
              defaultValue={todayIn(user.preferences.timeZone)}
              required
            />
          </FormField>
          <FormField>
            <label htmlFor="purchase-count">Cuotas</label>
            <input
              id="purchase-count"
              type="number"
              name="installments"
              min={1}
              max={120}
              defaultValue={1}
              required
            />
          </FormField>
        </div>
      )}
      <FormField>
        <label htmlFor="purchase-period">
          {kind === "purchase" ? "Primer resumen que la incluye" : "Primer mes"}
        </label>
        <input
          id="purchase-period"
          name="firstPeriod"
          type="month"
          defaultValue={period}
          min="2000-01"
          max="2100-12"
          required
        />
      </FormField>
      <details className="mb-5">
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">
          Repartir este gasto con alguien
        </summary>
        <SharesEditor userId={user.id} rows={rows} onChange={setRows} />
        <p className="text-xs text-muted">
          Cada cuota conserva su reparto. Pagar el resumen no salda lo
          compartido.
        </p>
      </details>
      {duplicate && (
        <label className="mb-4 flex min-h-11 items-start gap-3 text-sm">
          <input
            className="mt-1 size-5 accent-brand"
            name="confirmDuplicate"
            type="checkbox"
            required
          />
          Confirmo que es otra compra y quiero registrarla otra vez.
        </label>
      )}
      <CardFormError message={error} />
      <Button type="submit" className="w-full" disabled={write.isPending}>
        {write.isPending
          ? "Guardando…"
          : kind === "purchase"
            ? "Registrar compra"
            : "Crear cargo recurrente"}
      </Button>
    </form>
  );
}
export function CreateExpenseChooser({
  user,
  period,
  onCreated,
}: {
  user: CurrentUser;
  period: string;
  onCreated: (name: string, period: string) => void;
}) {
  const [kind, setKind] = useState<"monthly" | "card">("monthly");
  return (
    <>
      <div className="mb-5 flex gap-2" role="group" aria-label="Tipo de gasto">
        <Button
          variant={kind === "monthly" ? "primary" : "secondary"}
          onClick={() => setKind("monthly")}
        >
          Mensual o bimestral
        </Button>
        <Button
          variant={kind === "card" ? "primary" : "secondary"}
          onClick={() => setKind("card")}
        >
          Tarjeta
        </Button>
      </div>
      {kind === "monthly" ? (
        <CreateExpenseForm
          userId={user.id}
          period={period}
          onCreated={onCreated}
        />
      ) : (
        <PurchaseForm
          user={user}
          period={period}
          onDone={(p) => onCreated("Consumo de tarjeta", p)}
        />
      )}
    </>
  );
}
export function ChargeForm({
  userId,
  statement,
  charge,
  onDone,
}: {
  userId: string;
  statement: CardStatement;
  charge: CardCharge;
  onDone: () => void;
}) {
  const write = useCardWrite(userId, statementSchema),
    [rows, setRows] = useState(() =>
      rowsFromShares(
        charge.allocations
          .filter((a) => a.contactId !== null)
          .map((a) => ({ contactId: a.contactId!, shareBps: a.shareBps })),
      ),
    ),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      amountMinor = parseAmount(String(d.get("amount"))),
      shares = sharesFromRows(rows);
    if (!amountMinor) return setError(amountError);
    if ("error" in shares) return setError(shares.error);
    setError("");
    write.mutate(
      {
        path: `/card-charges/${charge.id}`,
        method: "PATCH",
        body: {
          version: charge.version,
          statementVersion: statement.version,
          description: String(d.get("description")).trim(),
          amountMinor,
          shares: shares.shares,
          scope:
            charge.recurringId || charge.purchaseId ? d.get("scope") : "THIS",
        },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="charge-description">Descripción</label>
        <input
          id="charge-description"
          name="description"
          defaultValue={charge.description}
          maxLength={120}
          required
        />
      </FormField>
      <FormField>
        <label htmlFor="charge-amount">
          Importe de este cargo ({charge.currency})
        </label>
        <MoneyInput
          id="charge-amount"
          currency={charge.currency}
          defaultMinor={charge.amountMinor}
        />
      </FormField>
      {(charge.recurringId || charge.purchaseId) && (
        <fieldset className="mb-5.5 grid gap-2 border-0 p-0">
          <legend className="mb-2 text-sm font-[550] text-[#53637b]">
            ¿A qué cargos aplica?
          </legend>
          {[
            {
              value: "THIS_AND_FUTURE",
              label: charge.recurringId
                ? "Este mes y meses futuros"
                : "Esta cuota y las siguientes pendientes",
              help: charge.recurringId
                ? "Los resúmenes pagados o conciliados no cambian."
                : "Las cuotas pagadas conservan su importe y reparto. El importe ingresado es por cuota.",
            },
            {
              value: "THIS",
              label: "Solo este cargo",
              help: "Los demás cargos conservan su importe.",
            },
          ].map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 items-start gap-2.5 rounded-[8px] border border-solid border-[#dce3ef] p-3 text-sm has-[input:checked]:border-brand has-[input:checked]:[background:#f3f6ff]"
            >
              <input
                className="mt-0.5 accent-brand"
                type="radio"
                name="scope"
                value={option.value}
                defaultChecked={option.value === "THIS_AND_FUTURE"}
              />
              <span>
                {option.label}
                <small className="mt-[3px] block text-xs text-muted">
                  {option.help}
                </small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <details className="mb-5" open={rows.length > 0}>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">
          Repartir este gasto con alguien
        </summary>
        <SharesEditor userId={userId} rows={rows} onChange={setRows} />
      </details>
      <CardFormError message={error} />
      <Button type="submit" className="w-full" disabled={write.isPending}>
        Guardar corrección
      </Button>
    </form>
  );
}
export function DatesForm({
  userId,
  statement,
  onDone,
}: {
  userId: string;
  statement: CardStatement;
  onDone: () => void;
}) {
  const write = useCardWrite(userId, statementSchema),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setError("");
    write.mutate(
      {
        path: `/statements/${statement.id}`,
        method: "PATCH",
        body: {
          version: statement.version,
          closingDate: d.get("closingDate"),
          dueDate: d.get("dueDate"),
        },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="statement-close">Cierre real</label>
        <input
          id="statement-close"
          name="closingDate"
          type="date"
          defaultValue={statement.closingDate}
          required
        />
      </FormField>
      <FormField>
        <label htmlFor="statement-due">Vencimiento real</label>
        <input
          id="statement-due"
          name="dueDate"
          type="date"
          defaultValue={statement.dueDate}
          required
        />
      </FormField>
      <CardFormError message={error} />
      <Button type="submit" disabled={write.isPending} className="w-full">
        Guardar fechas
      </Button>
    </form>
  );
}
export function UnknownLineForm({
  userId,
  statement,
  onDone,
}: {
  userId: string;
  statement: CardStatement;
  onDone: () => void;
}) {
  const write = useCardWrite(userId, statementSchema),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      raw = String(d.get("amount")).trim(),
      negative = raw.startsWith("-"),
      amount = parseAmount(negative ? raw.slice(1) : raw);
    if (!amount) return setError(amountError);
    setError("");
    write.mutate(
      {
        path: `/statements/${statement.id}/lines`,
        body: {
          version: statement.version,
          description: String(d.get("description")).trim(),
          postedOn: d.get("postedOn"),
          amountMinor: negative ? `-${amount}` : amount,
          currency: d.get("currency"),
        },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="line-description">Descripción en el resumen</label>
        <input
          id="line-description"
          name="description"
          maxLength={120}
          required
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="line-amount">Importe informado</label>
          <MoneyInput id="line-amount" allowNegative />
        </FormField>
        <FormField>
          <label htmlFor="line-currency">Moneda</label>
          <select id="line-currency" name="currency">
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </FormField>
      </div>
      <FormField>
        <label htmlFor="line-posted">Fecha informada</label>
        <input
          id="line-posted"
          name="postedOn"
          type="date"
          defaultValue={statement.closingDate}
          max={statement.closingDate}
          required
        />
      </FormField>
      <p className="mb-4 text-sm text-muted">
        Después podés vincularla con un cargo, registrarla como consumo o
        excluirla con motivo. Descuentos globales: usá un importe negativo y
        excluilos.
      </p>
      <CardFormError message={error} />
      <Button type="submit" disabled={write.isPending} className="w-full">
        Agregar línea para revisar
      </Button>
    </form>
  );
}
export function RecurringForm({
  userId,
  period,
  series,
  onDone,
}: {
  userId: string;
  period: string;
  series: CardRecurring;
  onDone: () => void;
}) {
  const write = useCardWrite(userId, z.object({ id: z.string() })),
    [rows, setRows] = useState(() => rowsFromShares(series.shares)),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      amountMinor = parseAmount(String(d.get("amount"))),
      shares = sharesFromRows(rows);
    if (!amountMinor) return setError(amountError);
    if ("error" in shares) return setError(shares.error);
    setError("");
    write.mutate(
      {
        path: `/card-recurring/${series.id}`,
        method: "PATCH",
        body: {
          version: series.version,
          fromPeriod: d.get("fromPeriod"),
          amountMinor,
          shares: shares.shares,
          endPeriod: String(d.get("endPeriod")) || null,
        },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  return (
    <form onSubmit={submit}>
      <FormField>
        <label htmlFor="recurring-from">Aplicar cambios desde</label>
        <input
          id="recurring-from"
          name="fromPeriod"
          type="month"
          min={series.firstPeriod}
          max="2100-12"
          defaultValue={
            period < series.firstPeriod ? series.firstPeriod : period
          }
          required
        />
      </FormField>
      <FormField>
        <label htmlFor="recurring-amount">
          Importe por mes ({series.currency})
        </label>
        <MoneyInput
          id="recurring-amount"
          currency={series.currency}
          defaultMinor={series.amountMinor}
        />
      </FormField>
      <FormField>
        <label htmlFor="recurring-end">Último mes a cobrar (opcional)</label>
        <input
          id="recurring-end"
          name="endPeriod"
          type="month"
          min={series.firstPeriod}
          defaultValue={series.endPeriod ?? ""}
        />
        <small className="text-xs text-muted">
          Dejalo vacío para mantenerlo activo o reactivarlo. Los resúmenes
          pagados y conciliados se conservan.
        </small>
      </FormField>
      <details className="mb-5" open={rows.length > 0}>
        <summary className="min-h-11 cursor-pointer py-2 text-sm font-semibold text-brand">
          Repartir este gasto con alguien
        </summary>
        <SharesEditor userId={userId} rows={rows} onChange={setRows} />
      </details>
      <CardFormError message={error} />
      <Button type="submit" disabled={write.isPending} className="w-full">
        Guardar regla
      </Button>
    </form>
  );
}
