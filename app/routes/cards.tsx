import { useState, type FormEvent, type ReactNode } from "react";
import { useSearchParams } from "react-router";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  CreditCard as CardIcon,
  Plus,
  RotateCcw,
} from "lucide-react";
import { Workspace } from "../components/workspace";
import {
  Badge,
  Button,
  FormField,
  Modal,
  SkeletonList,
} from "../components/ui";
import {
  CardForm,
  CardFormError,
  ChargeForm,
  DatesForm,
  PurchaseForm,
  RecurringForm,
  UnknownLineForm,
} from "../components/card-forms";
import {
  SharesEditor,
  sharesFromRows,
  type ShareRow,
} from "../components/shares-editor";
import { useCards, useCardStatement, useCardWrite } from "../lib/cards";
import { errorMessage } from "../lib/expenses";
import {
  formatMoney,
  formatShare,
  periodLabel,
  shortDate,
} from "../lib/format";
import {
  cardSchema,
  statementSchema,
  type CardStatement,
  type CardCharge,
  type CardRecurring,
} from "../../shared/contracts/cards";
import { periodSchema } from "../../shared/contracts/primitives";
import { addMonths, todayIn } from "../../shared/domain/periods";
import type { CurrentUser } from "../../shared/contracts/account";

function Panel({ children }: { children: ReactNode }) {
  return (
    <section className="mb-5 rounded-card border border-line bg-white p-4 shadow-card desktop:p-6">
      {children}
    </section>
  );
}
function StatementActionForm({
  user,
  statement,
  kind,
  charge,
  onDone,
}: {
  user: CurrentUser;
  statement: CardStatement;
  kind: "pay" | "defer";
  charge?: CardCharge;
  onDone: () => void;
}) {
  const write = useCardWrite(user.id, statementSchema),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    setError("");
    write.mutate(
      {
        path:
          kind === "pay"
            ? `/statements/${statement.id}/payments`
            : `/statements/${statement.id}/charges/${charge!.id}/defer`,
        body:
          kind === "pay"
            ? {
                version: statement.version,
                paidOn: d.get("paidOn"),
                ...(d.get("channel") && {
                  channel: String(d.get("channel")).trim(),
                }),
                ...(String(d.get("notes")).trim() && {
                  notes: String(d.get("notes")).trim(),
                }),
              }
            : {
                version: statement.version,
                chargeVersion: charge!.version,
                reason: String(d.get("reason")).trim(),
              },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  return (
    <form onSubmit={submit}>
      {kind === "pay" ? (
        <>
          <p className="mb-5 text-sm text-muted">
            Se paga el resumen completo. Cada consumo y cuota incluidos heredan
            ese estado; los repartos siguen siendo informativos.
          </p>
          <FormField>
            <label htmlFor="card-paid-on">Fecha de pago</label>
            <input
              id="card-paid-on"
              name="paidOn"
              type="date"
              defaultValue={todayIn(user.preferences.timeZone)}
              required
            />
          </FormField>
          <FormField>
            <label htmlFor="card-paid-channel">Canal (opcional)</label>
            <input
              id="card-paid-channel"
              name="channel"
              maxLength={40}
              placeholder="Ej. Transferencia"
            />
          </FormField>
          <FormField>
            <label htmlFor="card-paid-notes">Notas (opcional)</label>
            <textarea
              id="card-paid-notes"
              name="notes"
              rows={3}
              maxLength={500}
              placeholder="Ej. Juan pagó $50.000 y yo el resto"
              className="w-full rounded-[8px] border border-solid border-[#dce3ef] px-3 py-2.5 text-[max(16px,1rem)] text-[#3d4c65] placeholder:text-muted"
            />
          </FormField>
        </>
      ) : (
        <>
          <p className="mb-5 text-sm text-muted">
            {charge?.description} no apareció. Se mueve al resumen de{" "}
            {periodLabel(addMonths(statement.period, 1)).toLowerCase()}{" "}
            conservando la fecha de compra y el período esperado originales.
          </p>
          <FormField>
            <label htmlFor="defer-reason">Motivo</label>
            <input
              id="defer-reason"
              name="reason"
              maxLength={200}
              required
              placeholder="Ej. Todavía no figura en el banco"
            />
          </FormField>
        </>
      )}
      <CardFormError message={error} />
      <Button className="w-full" type="submit" loading={write.isPending}>
        {kind === "pay"
          ? "Confirmar pago del resumen"
          : "Arrastrar al siguiente resumen"}
      </Button>
    </form>
  );
}
function LineForm({
  userId,
  statement,
  line,
  onDone,
}: {
  userId: string;
  statement: CardStatement;
  line: CardStatement["lines"][number];
  onDone: () => void;
}) {
  const write = useCardWrite(userId, statementSchema),
    [action, setAction] = useState("MATCH"),
    [rows, setRows] = useState<ShareRow[]>([]),
    [error, setError] = useState("");
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget),
      shares = sharesFromRows(rows);
    if ("error" in shares) return setError(shares.error);
    setError("");
    write.mutate(
      {
        path:
          action === "MATCH"
            ? `/statements/${statement.id}/matches`
            : `/statements/${statement.id}/lines/${line.id}/resolve`,
        body:
          action === "MATCH"
            ? {
                version: statement.version,
                lineId: line.id,
                chargeId: d.get("chargeId"),
              }
            : {
                version: statement.version,
                action,
                shares: shares.shares,
                ...(action === "IGNORE" && {
                  reason: String(d.get("reason")).trim(),
                }),
              },
      },
      { onSuccess: onDone, onError: (e) => setError(errorMessage(e)) },
    );
  }
  const expected = statement.charges.filter((c) => c.status === "EXPECTED");
  return (
    <form onSubmit={submit}>
      <p className="mb-5 font-semibold">
        {line.description} · {formatMoney(line.amountMinor, line.currency)}
      </p>
      <FormField>
        <label htmlFor="line-action">Cómo resolverla</label>
        <select
          id="line-action"
          value={action}
          onChange={(e) => setAction(e.target.value)}
        >
          <option value="MATCH">Vincular con un consumo esperado</option>
          <option value="CREATE_CHARGE">Registrar como consumo nuevo</option>
          <option value="IGNORE">
            Excluir con motivo (impuestos, intereses, ajustes…)
          </option>
          <option value="DELETE">Eliminar esta línea ingresada</option>
        </select>
      </FormField>
      {action === "MATCH" && (
        <FormField>
          <label htmlFor="line-match">Consumo esperado</label>
          <select id="line-match" name="chargeId" required>
            <option value="">Elegí un consumo…</option>
            {expected.map((c) => (
              <option value={c.id} key={c.id}>
                {c.description} · {formatMoney(c.amountMinor, c.currency)}
                {c.installmentNo
                  ? ` · cuota ${c.installmentNo}/${c.installments}`
                  : ""}
              </option>
            ))}
          </select>
          <small className="text-xs text-muted">
            Si el importe difiere, corregí primero el cargo esperado. No se
            confirma una diferencia automáticamente.
          </small>
        </FormField>
      )}
      {action === "IGNORE" && (
        <FormField>
          <label htmlFor="line-ignore">Motivo de exclusión</label>
          <input
            id="line-ignore"
            name="reason"
            maxLength={200}
            required
            placeholder="Ej. Percepción del resumen"
          />
        </FormField>
      )}
      {action === "CREATE_CHARGE" && (
        <>
          <p className="mb-4 text-sm text-muted">
            Se registra como un consumo de este resumen. Si corresponde, definí
            el reparto antes de guardarlo.
          </p>
          <SharesEditor userId={userId} rows={rows} onChange={setRows} />
        </>
      )}
      <CardFormError message={error} />
      <Button className="w-full" type="submit" loading={write.isPending}>
        Confirmar resolución
      </Button>
    </form>
  );
}

type Dialog =
  | {
      kind: "create-card" | "edit-card" | "purchase" | "dates" | "line" | "pay";
    }
  | { kind: "charge" | "defer"; charge: CardCharge }
  | { kind: "resolve-line"; line: CardStatement["lines"][number] }
  | { kind: "recurring"; series: CardRecurring };
function CardsView({ user }: { user: CurrentUser }) {
  const [params, setParams] = useSearchParams(),
    parsed = periodSchema.safeParse(params.get("periodo")),
    period = parsed.success
      ? parsed.data
      : todayIn(user.preferences.timeZone).slice(0, 7);
  const cards = useCards(user.id),
    selected =
      cards.data?.find((c) => c.id === params.get("tarjeta")) ??
      cards.data?.find((c) => !c.archived) ??
      cards.data?.[0];
  const statementQuery = useCardStatement(
      user.id,
      selected?.id ?? null,
      period,
    ),
    statement = statementQuery.data,
    write = useCardWrite(user.id, statementSchema),
    cardWrite = useCardWrite(user.id, cardSchema);
  const [dialog, setDialog] = useState<Dialog | null>(null),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const navigate = (p: string, id = selected?.id) => {
    setDialog(null);
    setError("");
    setParams({ periodo: p, ...(id && { tarjeta: id }) });
  };
  const done = (message = "Guardado.") => {
    setDialog(null);
    setNotice(message);
    setError("");
  };
  // Todas las acciones comparten la mutación: se bloquean juntas y el spinner
  // aparece solo en el botón que se tocó.
  const busy = (path: string) =>
    write.isPending && write.variables?.path === path;
  function action(path: string, body: unknown) {
    setError("");
    write.mutate(
      { path, body },
      {
        onSuccess: () => setNotice("Resumen actualizado."),
        onError: (e) => setError(errorMessage(e)),
      },
    );
  }
  const editable = statement?.status === "DRAFT",
    status = statement?.status;
  const totalUnresolved = statement
    ? statement.charges.filter((c) => c.status === "EXPECTED").length +
      statement.lines.filter((l) => l.status === "UNMATCHED_ACTUAL").length
    : 0;
  const title =
    dialog?.kind === "create-card"
      ? "Agregar tarjeta"
      : dialog?.kind === "edit-card"
        ? "Editar tarjeta"
        : dialog?.kind === "purchase"
          ? "Registrar consumo"
          : dialog?.kind === "dates"
            ? "Fechas del resumen"
            : dialog?.kind === "line"
              ? "Línea desconocida o ajuste"
              : dialog?.kind === "pay"
                ? "Pagar resumen completo"
                : dialog?.kind === "charge"
                  ? "Corregir cargo esperado"
                  : dialog?.kind === "defer"
                    ? "Consumo ausente"
                    : dialog?.kind === "recurring"
                      ? "Editar cargo recurrente"
                      : "Resolver línea del resumen";
  return (
    <>
      <header className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="mb-1 text-xs font-semibold tracking-wide text-muted">
            RESÚMENES Y CONSUMOS
          </p>
          <h1>
            Tarjetas<span className="text-brand">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Revisá los consumos y pagá cada resumen completo.
          </p>
        </div>
        <Button onClick={() => setDialog({ kind: "create-card" })}>
          <Plus size={17} />
          Agregar tarjeta
        </Button>
      </header>
      {cards.isPending ? (
        <SkeletonList label="Cargando tarjetas…" rows={2} />
      ) : cards.isError ? (
        <CardFormError message={errorMessage(cards.error)} />
      ) : !selected ? (
        <Panel>
          <CardIcon size={28} />
          <h2 className="mt-3">Todavía no agregaste tarjetas</h2>
          <p className="my-3 text-sm text-muted">
            Registrá una tarjeta para organizar compras, cuotas y cargos
            recurrentes.
          </p>
          <Button onClick={() => setDialog({ kind: "create-card" })}>
            Agregar mi primera tarjeta
          </Button>
        </Panel>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            <label htmlFor="selected-card" className="sr-only">
              Tarjeta
            </label>
            <select
              id="selected-card"
              className="min-h-10 max-w-full w-auto rounded-[8px] border border-solid border-[#dce3ef] bg-white py-1.5 pr-8 pl-3 text-sm font-semibold text-[#3d4c65]"
              value={selected.id}
              onChange={(e) => navigate(period, e.target.value)}
            >
              {cards.data?.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.lastFour ? ` · ${c.lastFour}` : ""}
                  {c.archived ? " · archivada" : ""}
                </option>
              ))}
            </select>
            <div className="flex items-center rounded-xl border border-line bg-white p-0.5">
              <Button
                variant="ghost"
                className="min-h-9 px-2 py-1"
                aria-label="Resumen anterior"
                disabled={period === "2000-01"}
                onClick={() => navigate(addMonths(period, -1))}
              >
                <ChevronLeft size={16} />
              </Button>
              <span className="flex items-center gap-1.5 px-1 text-sm font-semibold whitespace-nowrap">
                <CalendarDays size={14} />
                {periodLabel(period)} {period.slice(0, 4)}
              </span>
              <Button
                variant="ghost"
                className="min-h-9 px-2 py-1"
                aria-label="Resumen siguiente"
                disabled={period === "2100-12"}
                onClick={() => navigate(addMonths(period, 1))}
              >
                <ChevronRight size={16} />
              </Button>
            </div>
            <Button
              variant="secondary"
              className="min-h-10 px-3 py-1.5"
              onClick={() => setDialog({ kind: "edit-card" })}
            >
              Editar
            </Button>
          </div>
          {statementQuery.isPending ? (
            <SkeletonList label="Cargando resumen…" rows={4} />
          ) : statementQuery.isError ? (
            <Panel>
              <CardFormError message={errorMessage(statementQuery.error)} />
              <Button
                variant="secondary"
                onClick={() => void statementQuery.refetch()}
              >
                Reintentar
              </Button>
            </Panel>
          ) : (
            statement && (
              <>
                <Panel>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2>
                      {selected.name}
                      {selected.lastFour && (
                        <span className="ml-2 text-sm text-muted">
                          •••• {selected.lastFour}
                        </span>
                      )}
                    </h2>
                    <Badge
                      tone={
                        status === "PAID"
                          ? "green"
                          : status === "RECONCILED"
                            ? "blue"
                            : "amber"
                      }
                    >
                      {status === "PAID"
                        ? "Pagado"
                        : status === "RECONCILED"
                          ? "Conciliado"
                          : "Por conciliar"}
                    </Badge>
                  </div>
                  <p className="mt-3 text-sm text-muted">
                    Cierra {shortDate(statement.closingDate)} · vence{" "}
                    {shortDate(statement.dueDate)}
                  </p>
                  {editable && (
                    <Button
                      className="mt-2"
                      variant="ghost"
                      onClick={() => setDialog({ kind: "dates" })}
                    >
                      Revisar fechas reales
                    </Button>
                  )}
                  <div className="mt-4 grid grid-cols-1 gap-3 min-[600px]:grid-cols-2">
                    {statement.totals.map((t) => (
                      <div
                        key={t.currency}
                        className="rounded-xl bg-canvas p-3"
                      >
                        <p className="text-xs text-muted">
                          Consumos del resumen · {t.currency}
                        </p>
                        <strong className="mt-1 block overflow-x-auto whitespace-nowrap text-2xl tabular-nums">
                          {formatMoney(t.amountMinor, t.currency)}
                        </strong>
                      </div>
                    ))}
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    Los totales incluyen solo consumos. Impuestos, percepciones,
                    intereses y ajustes globales se excluyen de los gastos y
                    repartos.
                  </p>
                  {statement.payment && (
                    <p className="mt-3 text-sm text-success">
                      Pagado el {shortDate(statement.payment.paidOn)}
                      {statement.payment.channel
                        ? ` · ${statement.payment.channel}`
                        : ""}
                      .
                    </p>
                  )}
                  {statement.payment?.notes && (
                    <p className="mt-1 text-sm whitespace-pre-line text-muted">
                      {statement.payment.notes}
                    </p>
                  )}
                </Panel>
                {editable && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    <Button
                      disabled={selected.archived}
                      onClick={() => setDialog({ kind: "purchase" })}
                    >
                      <Plus size={16} />
                      Compra o recurrente
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setDialog({ kind: "line" })}
                    >
                      Agregar línea del resumen
                    </Button>
                  </div>
                )}
                <Panel>
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h2>
                      Consumos esperados{" "}
                      <span className="text-muted">
                        ({statement.charges.length})
                      </span>
                    </h2>
                    {editable && (
                      <Badge tone="amber">{totalUnresolved} por revisar</Badge>
                    )}
                  </div>
                  {statement.charges.length === 0 ? (
                    <p className="text-sm text-muted">
                      No hay consumos esperados en este resumen.
                    </p>
                  ) : (
                    <ul className="m-0 list-none divide-y divide-line p-0">
                      {statement.charges.map((charge) => (
                        <li key={charge.id} className="py-4 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <strong className="block break-words text-sm">
                                {charge.description}
                              </strong>
                              <small className="mt-1 block text-xs text-muted">
                                {charge.installmentNo
                                  ? `Cuota ${charge.installmentNo}/${charge.installments} · `
                                  : charge.recurringId
                                    ? "Recurrente · "
                                    : ""}
                                Compra {shortDate(charge.occurredOn)}
                              </small>
                              {charge.expectedPeriod !== period && (
                                <small className="mt-1 block text-xs text-warning">
                                  Esperado originalmente en{" "}
                                  {periodLabel(
                                    charge.expectedPeriod,
                                  ).toLowerCase()}{" "}
                                  {charge.expectedPeriod.slice(0, 4)}
                                </small>
                              )}
                            </div>
                            <strong className="shrink-0 text-sm tabular-nums">
                              {formatMoney(charge.amountMinor, charge.currency)}
                            </strong>
                          </div>
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <Badge
                              tone={
                                status === "PAID"
                                  ? "green"
                                  : charge.status === "MATCHED"
                                    ? "blue"
                                    : "amber"
                              }
                            >
                              {status === "PAID"
                                ? "Pagado con el resumen"
                                : charge.status === "MATCHED"
                                  ? "Coincide"
                                  : "Esperado"}
                            </Badge>
                            {charge.allocations
                              .filter((a) => a.contactId)
                              .map((a) => (
                                <small
                                  key={a.contactId}
                                  className="text-xs text-muted"
                                >
                                  {a.nickname} · {formatShare(a.shareBps)} ·{" "}
                                  {formatMoney(a.amountMinor, charge.currency)}
                                </small>
                              ))}
                          </div>
                          {editable && charge.status === "EXPECTED" && (
                            <div className="mt-3 flex flex-wrap gap-2">
                              <Button
                                disabled={write.isPending}
                                loading={busy(
                                  `/statements/${statement.id}/matches`,
                                )}
                                onClick={() =>
                                  action(
                                    `/statements/${statement.id}/matches`,
                                    {
                                      version: statement.version,
                                      chargeId: charge.id,
                                    },
                                  )
                                }
                              >
                                <Check size={15} />
                                Aparece y coincide
                              </Button>
                              <Button
                                variant="secondary"
                                onClick={() =>
                                  setDialog({ kind: "charge", charge })
                                }
                              >
                                Corregir importe o reparto
                              </Button>
                              <Button
                                variant="ghost"
                                onClick={() =>
                                  setDialog({ kind: "defer", charge })
                                }
                              >
                                No apareció
                              </Button>
                            </div>
                          )}
                          {editable && charge.lineId && (
                            <Button
                              className="mt-2"
                              variant="ghost"
                              disabled={write.isPending}
                              loading={busy(
                                `/statements/${statement.id}/lines/${charge.lineId}/resolve`,
                              )}
                              onClick={() =>
                                action(
                                  `/statements/${statement.id}/lines/${charge.lineId}/resolve`,
                                  {
                                    version: statement.version,
                                    action: "UNMATCH",
                                  },
                                )
                              }
                            >
                              Desvincular para corregir
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </Panel>
                {statement.lines.length > 0 && (
                  <Panel>
                    <h2 className="mb-4">Líneas del resumen</h2>
                    <ul className="m-0 list-none divide-y divide-line p-0">
                      {statement.lines.map((line) => (
                        <li key={line.id} className="py-3 first:pt-0">
                          <div className="flex items-start justify-between gap-3">
                            <strong className="min-w-0 break-words text-sm">
                              {line.description}
                            </strong>
                            <span className="shrink-0 text-sm tabular-nums">
                              {formatMoney(line.amountMinor, line.currency)}
                            </span>
                          </div>
                          <small className="mt-1 block text-xs text-muted">
                            {shortDate(line.postedOn)} ·{" "}
                            {line.status === "MATCHED"
                              ? "Vinculada"
                              : line.status === "IGNORED_WITH_REASON"
                                ? `Excluida: ${line.ignoreReason}`
                                : "Desconocida: falta resolver"}
                          </small>
                          {editable &&
                            (line.status === "UNMATCHED_ACTUAL" ? (
                              <Button
                                variant="secondary"
                                className="mt-2"
                                onClick={() =>
                                  setDialog({ kind: "resolve-line", line })
                                }
                              >
                                Revisar línea
                              </Button>
                            ) : (
                              <Button
                                variant="ghost"
                                className="mt-2"
                                disabled={write.isPending}
                                loading={busy(
                                  `/statements/${statement.id}/lines/${line.id}/resolve`,
                                )}
                                onClick={() =>
                                  action(
                                    `/statements/${statement.id}/lines/${line.id}/resolve`,
                                    {
                                      version: statement.version,
                                      action: "UNMATCH",
                                    },
                                  )
                                }
                              >
                                Volver a revisar
                              </Button>
                            ))}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                )}
                {statement.deferred.length > 0 && (
                  <Panel>
                    <h2 className="mb-3">Ausentes arrastrados</h2>
                    {statement.deferred.map((d) => (
                      <p key={d.id} className="mb-2 text-sm text-muted">
                        {d.description} →{" "}
                        {periodLabel(d.toPeriod).toLowerCase()}{" "}
                        {d.toPeriod.slice(0, 4)} · {d.reason}
                      </p>
                    ))}
                  </Panel>
                )}
                <Panel>
                  <h2 className="mb-3">Confirmación del resumen</h2>
                  <p className="mb-4 text-sm text-muted">
                    {status === "DRAFT"
                      ? totalUnresolved
                        ? `Quedan ${totalUnresolved} elementos por resolver.`
                        : "Todos los consumos y líneas están resueltos. Confirmá la conciliación antes de pagar."
                      : status === "RECONCILED"
                        ? "La conciliación está confirmada. Podés pagar el resumen completo o reabrirlo para corregirlo."
                        : "El pago alcanza a todos los cargos incluidos. Podés deshacerlo para corregir el resumen."}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {status === "DRAFT" ? (
                      <Button
                        disabled={write.isPending || totalUnresolved > 0}
                        loading={busy(`/statements/${statement.id}/reconcile`)}
                        onClick={() =>
                          action(`/statements/${statement.id}/reconcile`, {
                            version: statement.version,
                          })
                        }
                      >
                        Confirmar conciliación
                      </Button>
                    ) : status === "RECONCILED" ? (
                      <>
                        <Button
                          disabled={write.isPending}
                          onClick={() => setDialog({ kind: "pay" })}
                        >
                          Marcar resumen pagado
                        </Button>
                        <Button
                          variant="secondary"
                          disabled={write.isPending}
                          loading={busy(`/statements/${statement.id}/reopen`)}
                          onClick={() =>
                            action(`/statements/${statement.id}/reopen`, {
                              version: statement.version,
                            })
                          }
                        >
                          Reabrir conciliación
                        </Button>
                      </>
                    ) : (
                      <Button
                        variant="secondary"
                        disabled={write.isPending}
                        loading={busy(
                          `/statements/${statement.id}/undo-payment`,
                        )}
                        onClick={() =>
                          action(`/statements/${statement.id}/undo-payment`, {
                            version: statement.version,
                          })
                        }
                      >
                        <RotateCcw size={16} />
                        Deshacer pago completo
                      </Button>
                    )}
                  </div>
                </Panel>
                {statement.recurring.length > 0 && (
                  <Panel>
                    <h2 className="mb-3">Cargos recurrentes de la tarjeta</h2>
                    {statement.recurring.map((series) => (
                      <div
                        key={series.id}
                        className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-3"
                      >
                        <div>
                          <strong className="text-sm">
                            {series.description}
                          </strong>
                          <p className="mt-1 text-xs text-muted">
                            {formatMoney(series.amountMinor, series.currency)}{" "}
                            por mes ·{" "}
                            {series.endPeriod
                              ? `finaliza en ${series.endPeriod}`
                              : "activo"}
                          </p>
                        </div>
                        <Button
                          variant="secondary"
                          onClick={() =>
                            setDialog({ kind: "recurring", series })
                          }
                        >
                          Editar regla
                        </Button>
                      </div>
                    ))}
                  </Panel>
                )}
                <div className="mb-5">
                  <Button
                    variant="ghost"
                    loading={cardWrite.isPending}
                    onClick={() =>
                      cardWrite.mutate(
                        {
                          path: `/cards/${selected.id}`,
                          method: "PATCH",
                          body: {
                            version: selected.version,
                            archived: !selected.archived,
                          },
                        },
                        {
                          onSuccess: () =>
                            done(
                              selected.archived
                                ? "Tarjeta restaurada."
                                : "Tarjeta archivada.",
                            ),
                          onError: (e) => setError(errorMessage(e)),
                        },
                      )
                    }
                  >
                    {selected.archived
                      ? "Restaurar tarjeta"
                      : "Archivar tarjeta"}
                  </Button>
                </div>
              </>
            )
          )}
        </>
      )}
      <CardFormError message={error} />
      {notice && (
        <div
          className="mb-5 rounded-xl border border-line bg-brand-soft p-4 text-sm"
          role="status"
          aria-live="polite"
        >
          {notice}
          <Button
            variant="ghost"
            onClick={() => setNotice("")}
            aria-label="Cerrar aviso"
          >
            Cerrar
          </Button>
        </div>
      )}
      <Modal
        open={!!dialog}
        onOpenChange={(open) => !open && setDialog(null)}
        title={title}
        description="Las monedas y los repartos se mantienen separados."
      >
        {dialog?.kind === "create-card" ? (
          <CardForm
            userId={user.id}
            onDone={(card) => {
              navigate(period, card.id);
              done("Tarjeta agregada.");
            }}
          />
        ) : dialog?.kind === "edit-card" && selected ? (
          <CardForm
            userId={user.id}
            card={selected}
            onDone={() => done("Tarjeta actualizada.")}
          />
        ) : dialog?.kind === "purchase" ? (
          <PurchaseForm
            user={user}
            cardId={selected?.id}
            period={period}
            onDone={(p) => {
              navigate(p);
              done("Consumo registrado.");
            }}
          />
        ) : statement && dialog?.kind === "dates" ? (
          <DatesForm
            userId={user.id}
            statement={statement}
            onDone={() => done("Fechas actualizadas.")}
          />
        ) : statement && dialog?.kind === "line" ? (
          <UnknownLineForm
            userId={user.id}
            statement={statement}
            onDone={() => done("Línea agregada para revisar.")}
          />
        ) : statement && dialog?.kind === "charge" ? (
          <ChargeForm
            userId={user.id}
            statement={statement}
            charge={dialog.charge}
            onDone={() => done("Cargo corregido.")}
          />
        ) : statement && dialog?.kind === "resolve-line" ? (
          <LineForm
            userId={user.id}
            statement={statement}
            line={dialog.line}
            onDone={() => done("Línea resuelta.")}
          />
        ) : statement &&
          (dialog?.kind === "pay" || dialog?.kind === "defer") ? (
          <StatementActionForm
            user={user}
            statement={statement}
            kind={dialog.kind}
            charge={dialog.kind === "defer" ? dialog.charge : undefined}
            onDone={() =>
              done(
                dialog.kind === "pay"
                  ? "Resumen pagado. Podés deshacer el pago completo."
                  : "Cargo arrastrado al siguiente resumen.",
              )
            }
          />
        ) : dialog?.kind === "recurring" ? (
          <RecurringForm
            userId={user.id}
            period={period}
            series={dialog.series}
            onDone={() => done("Regla actualizada.")}
          />
        ) : null}
      </Modal>
    </>
  );
}
export default function Cards() {
  return <Workspace>{(user) => <CardsView user={user} />}</Workspace>;
}
