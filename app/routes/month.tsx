import { useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { flushSync } from "react-dom";
import {
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  Pencil,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Workspace } from "../components/workspace";
import { Badge, Button, Modal } from "../components/ui";
import {
  errorMessage,
  useChangeOccurrence,
  useCreateExpense,
  useMonth,
  useTogglePayment,
} from "../lib/expenses";
import {
  amountInput,
  formatMoney,
  parseAmount,
  periodLabel,
  shortDate,
} from "../lib/format";
import { periodSchema, type Occurrence } from "../../shared/contracts/expenses";
import type { CurrentUser } from "../../shared/contracts/account";
import { addMonths, todayIn } from "../../shared/domain/periods";
import type { Currency } from "../../shared/domain/money";

const amountError =
  "Ingresá un importe mayor a cero, con hasta dos decimales. Ej. 28000 o 1.250,50";

function CreateExpenseForm({
  userId,
  period,
  onCreated,
}: {
  userId: string;
  period: string;
  onCreated: (name: string) => void;
}) {
  const create = useCreateExpense(userId);
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountMinor = parseAmount(String(data.get("amount")));
    if (!amountMinor) return setError(amountError);
    setError("");
    const name = String(data.get("name")).trim();
    create.mutate(
      {
        name,
        amountMinor,
        currency: data.get("currency") === "USD" ? "USD" : "ARS",
        dueDay: Number(data.get("dueDay")),
        firstPeriod: period,
      },
      { onSuccess: () => onCreated(name) },
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
        <span className="field-help">
          Se repite todos los meses desde {periodLabel(period).toLowerCase()}.
          Si el mes es más corto, vence el último día.
        </span>
      </div>
      {(error || create.isError) && (
        <p role="alert" className="error-message">
          {error || errorMessage(create.error)}
        </p>
      )}
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={create.isPending}
        >
          <Plus size={17} />
          {create.isPending ? "Guardando…" : "Crear gasto mensual"}
        </Button>
      </div>
    </form>
  );
}

function EditOccurrenceForm({
  userId,
  occurrence,
  onDone,
}: {
  userId: string;
  occurrence: Occurrence;
  onDone: (message: string) => void;
}) {
  const change = useChangeOccurrence(userId);
  const [error, setError] = useState("");
  const month = periodLabel(occurrence.period).toLowerCase();
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amountMinor = parseAmount(String(data.get("amount")));
    if (!amountMinor) return setError(amountError);
    const dueDay = Number(data.get("dueDay"));
    const scope =
      data.get("scope") === "THIS_AND_FUTURE"
        ? "THIS_AND_FUTURE"
        : "THIS_MONTH";
    const amountChanged = amountMinor !== occurrence.amountMinor;
    const dueChanged = dueDay !== occurrence.dueDay;
    if (!amountChanged && !dueChanged)
      return setError("No hay cambios para guardar.");
    setError("");
    change.mutate(
      {
        occurrence,
        ...(amountChanged && { amount: { amountMinor, scope } }),
        ...(dueChanged && { dueDay }),
      },
      { onSuccess: () => onDone(`${occurrence.name} se actualizó.`) },
    );
  }
  return (
    <form onSubmit={submit}>
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
            <small>Los meses ya pagados no cambian.</small>
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
      {(error || change.isError) && (
        <p role="alert" className="error-message">
          {error || errorMessage(change.error)}
        </p>
      )}
      <div className="dialog-actions">
        <Button
          type="submit"
          className="full-width"
          disabled={change.isPending}
        >
          {change.isPending ? "Guardando…" : "Guardar cambios"}
        </Button>
      </div>
    </form>
  );
}

function dueState(occurrence: Occurrence, today: string) {
  if (occurrence.status === "PAID") return null;
  if (occurrence.dueDate < today) return "Vencido";
  if (occurrence.dueDate === today) return "Vence hoy";
  return null;
}

function MonthView({ user }: { user: CurrentUser }) {
  const [params, setParams] = useSearchParams();
  const requested = periodSchema.safeParse(params.get("periodo"));
  const period = requested.success
    ? requested.data
    : todayIn(user.preferences.timeZone).slice(0, 7);
  const month = useMonth(user.id, period);
  const toggle = useTogglePayment(user.id);
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState<{
    text: string;
    tone: "ok" | "error";
    undo?: Occurrence;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function goTo(next: string) {
    setParams({ periodo: next });
    setNotice(null);
  }
  function togglePayment(occurrence: Occurrence) {
    setPendingId(occurrence.id);
    toggle.mutate(occurrence, {
      onSuccess: (updated) =>
        setNotice(
          updated.status === "PAID"
            ? {
                text: `${updated.name}, marcado como pagado.`,
                tone: "ok",
                undo: updated,
              }
            : { text: `Se deshizo el pago de ${updated.name}.`, tone: "ok" },
        ),
      onError: (error) =>
        setNotice({ text: errorMessage(error), tone: "error" }),
      onSettled: () => setPendingId(null),
    });
  }

  const data = month.data;
  const rows = data?.occurrences ?? [];
  const paidCount = rows.filter((row) => row.status === "PAID").length;
  const visible = rows
    .filter(
      (row) =>
        (filter === "all" || (filter === "paid") === (row.status === "PAID")) &&
        row.name
          .toLocaleLowerCase("es")
          .includes(search.toLocaleLowerCase("es")),
    )
    .sort(
      (a, b) =>
        Number(a.status === "PAID") - Number(b.status === "PAID") ||
        a.dueDate.localeCompare(b.dueDate),
    );
  const label = periodLabel(period);
  // La edición usa siempre la versión más reciente cargada de la fila.
  const editing = rows.find((row) => row.id === editingId) ?? null;

  return (
    <>
      <div className="page-heading month-heading">
        <div>
          <p className="eyebrow">TU MES, MÁS CLARO</p>
          <h1>
            Mi mes<span className="title-dot">.</span>
          </h1>
          <p className="page-description">
            Lo importante de tu mes, sin perderte en los números.
          </p>
        </div>
        <div className="heading-actions">
          <div className="month-switcher">
            <button
              className="icon-button"
              aria-label="Mes anterior"
              onClick={() => goTo(addMonths(period, -1))}
              disabled={period <= "2000-01"}
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
              onClick={() => goTo(addMonths(period, 1))}
              disabled={period >= "2100-12"}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <Button className="desktop-create" onClick={() => setCreating(true)}>
            <Plus size={18} />
            Crear gasto
          </Button>
        </div>
      </div>

      {month.isPending ? (
        <div className="loading-block" role="status">
          <span className="skeleton" />
          <span className="skeleton" />
          <p>Cargando {label.toLowerCase()}…</p>
        </div>
      ) : month.isError ? (
        <section className="card empty-state" role="alert">
          <h3>No pudimos cargar {label.toLowerCase()}</h3>
          <p>{errorMessage(month.error)}</p>
          <Button variant="secondary" onClick={() => void month.refetch()}>
            Reintentar
          </Button>
        </section>
      ) : rows.length === 0 ? (
        <section className="card empty-state">
          <ReceiptText size={27} />
          <h3>Todavía no hay gastos en {label.toLowerCase()}</h3>
          <p>Creá tus gastos mensuales una vez: GastApp los repite cada mes.</p>
          <Button onClick={() => setCreating(true)}>
            <Plus size={17} />
            Crear el primero
          </Button>
        </section>
      ) : (
        <>
          <section className="metrics" aria-label="Resumen por moneda">
            {data!.totals.map((total, index) => (
              <article
                key={total.currency}
                className={`metric-card ${index === 0 ? "metric-featured" : ""}`}
              >
                <div className="metric-label">
                  <span>Por pagar · {total.currency}</span>
                  <span className="metric-icon">
                    <CalendarDays size={18} />
                  </span>
                </div>
                <strong className="metric-value">
                  {formatMoney(total.pendingMinor, total.currency as Currency)}
                </strong>
                <p>
                  Ya pagaste{" "}
                  {formatMoney(total.paidMinor, total.currency as Currency)}.
                </p>
                {index === 0 ? (
                  <div className="payment-progress">
                    <div>
                      {rows.map((row) => (
                        <span
                          key={row.id}
                          className={row.status === "PAID" ? "complete" : ""}
                        />
                      ))}
                    </div>
                    <span>
                      {paidCount} de {rows.length} gastos resueltos
                      <CheckCheck size={16} />
                    </span>
                  </div>
                ) : (
                  <Badge>Sin conversión de monedas</Badge>
                )}
              </article>
            ))}
          </section>
          <section className="card expenses-panel">
            <header className="panel-heading">
              <div>
                <h2>
                  Gastos del mes <span className="count">{rows.length}</span>
                </h2>
                <p>Resolvé tus pendientes, uno a la vez.</p>
              </div>
              <button
                className="icon-button mobile-search-toggle"
                aria-label="Buscar gasto"
                aria-expanded={searchOpen}
                aria-controls="expense-search"
                onClick={() => {
                  flushSync(() => setSearchOpen(true));
                  searchInput.current?.focus();
                }}
              >
                <Search size={20} />
              </button>
            </header>
            <div className="expense-toolbar">
              <div
                className="filter-group"
                role="group"
                aria-label="Filtrar gastos"
              >
                {[
                  { id: "pending", label: "Pendientes" },
                  { id: "paid", label: "Pagados" },
                  { id: "all", label: "Todos" },
                ].map((item) => (
                  <button
                    key={item.id}
                    onClick={() => setFilter(item.id)}
                    aria-pressed={filter === item.id}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <label
                id="expense-search"
                className={`search-field ${searchOpen ? "search-open" : ""}`}
              >
                <Search size={16} />
                <span className="sr-only">Buscar gasto</span>
                <input
                  ref={searchInput}
                  type="search"
                  enterKeyHint="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar gasto…"
                />
              </label>
            </div>
            <div
              className="expense-table"
              role="table"
              aria-label={`Gastos de ${label.toLowerCase()}`}
            >
              <div className="expense-table-head" role="row">
                <span role="columnheader">GASTO</span>
                <span role="columnheader">VENCE</span>
                <span role="columnheader">IMPORTE TOTAL</span>
                <span role="columnheader">ESTADO / ACCIÓN</span>
              </div>
              <div role="rowgroup">
                {visible.map((row) => {
                  const state = dueState(row, data!.today);
                  const paid = row.status === "PAID";
                  return (
                    <div
                      className={`expense-row ${paid ? "is-paid" : ""}`}
                      role="row"
                      key={row.id}
                    >
                      <div role="cell" className="expense-name">
                        <span className="tile-icon blue">
                          <ReceiptText size={19} />
                        </span>
                        <button
                          className="expense-edit"
                          onClick={() => setEditingId(row.id)}
                          aria-label={`Editar ${row.name}`}
                        >
                          <strong>{row.name}</strong>
                          <small>
                            {paid && row.payment
                              ? `Pagado el ${shortDate(row.payment.paidOn)}`
                              : "Mensual"}
                            <Pencil size={11} aria-hidden="true" />
                          </small>
                        </button>
                      </div>
                      <span
                        role="cell"
                        className={state ? "due-date overdue" : "due-date"}
                      >
                        {shortDate(row.dueDate)}
                        {state && <small>{state}</small>}
                      </span>
                      <strong role="cell" className="expense-amount">
                        {formatMoney(row.amountMinor, row.currency)}
                      </strong>
                      <div role="cell" className="expense-action">
                        <button
                          className={paid ? "paid-action" : "pay-action"}
                          disabled={pendingId === row.id}
                          onClick={() => togglePayment(row)}
                          aria-label={
                            paid
                              ? `Deshacer pago de ${row.name}`
                              : `Marcar ${row.name} como pagado`
                          }
                        >
                          {paid ? (
                            <>
                              <Check size={14} />
                              <span>Pagado</span>
                              <span className="undo-label">Deshacer</span>
                            </>
                          ) : (
                            <>
                              <span className="empty-check" />
                              {pendingId === row.id
                                ? "Guardando…"
                                : "Marcar pago"}
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            {visible.length === 0 && (
              <div className="empty-state">
                {search ? <Search size={27} /> : <CircleCheck size={27} />}
                <h3>
                  {search
                    ? "No encontramos ese gasto"
                    : filter === "pending"
                      ? "No quedan pendientes este mes"
                      : "No hay gastos en este filtro"}
                </h3>
                <p>Probá con otra búsqueda o elegí otro estado.</p>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setFilter("all");
                  }}
                >
                  Ver todos
                </Button>
              </div>
            )}
            <footer className="list-footer">
              <ShieldCheck size={14} />
              <span>
                Los pagos se pueden deshacer. Las monedas nunca se suman entre
                sí.
              </span>
            </footer>
          </section>
        </>
      )}

      <div
        className="feedback-message"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        key={notice?.text ?? "empty"}
      >
        {notice && (
          <>
            {notice.tone === "ok" && <CircleCheck size={19} />}
            <span>{notice.text}</span>
            {notice.undo && (
              <Button
                variant="ghost"
                className="toast-undo"
                disabled={toggle.isPending}
                onClick={() => togglePayment(notice.undo!)}
              >
                Deshacer
              </Button>
            )}
            <button
              className="icon-button"
              aria-label="Cerrar aviso"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </>
        )}
      </div>
      <Button className="mobile-create" onClick={() => setCreating(true)}>
        <Plus size={20} />
        Crear gasto
      </Button>
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Crear gasto mensual"
        description={`Se agrega a ${label.toLowerCase()} y a los meses siguientes.`}
      >
        <CreateExpenseForm
          userId={user.id}
          period={period}
          onCreated={(name) => {
            setCreating(false);
            setFilter("pending");
            setSearch("");
            setNotice({
              text: `${name} se agregó a ${label.toLowerCase()}.`,
              tone: "ok",
            });
          }}
        />
      </Modal>
      <Modal
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open) setEditingId(null);
        }}
        title={editing ? `Editar ${editing.name}` : "Editar gasto"}
        description={
          editing
            ? `${label} · ${formatMoney(editing.amountMinor, editing.currency)}`
            : ""
        }
      >
        {editing?.status === "PAID" ? (
          <>
            <p className="notice">
              Este mes ya está pagado
              {editing.payment
                ? ` (el ${shortDate(editing.payment.paidOn)})`
                : ""}
              . Para corregirlo, primero deshacé el pago; después podés editarlo
              y volver a marcarlo como pagado.
            </p>
            <div className="dialog-actions">
              <Button
                variant="secondary"
                className="full-width"
                disabled={toggle.isPending}
                onClick={() => {
                  const target = editing;
                  setEditingId(null);
                  togglePayment(target);
                }}
              >
                Deshacer pago
              </Button>
            </div>
          </>
        ) : (
          editing && (
            <EditOccurrenceForm
              key={editing.id}
              userId={user.id}
              occurrence={editing}
              onDone={(text) => {
                setEditingId(null);
                setNotice({ text, tone: "ok" });
              }}
            />
          )
        )}
      </Modal>
    </>
  );
}

export default function Month() {
  return <Workspace>{(user) => <MonthView user={user} />}</Workspace>;
}
