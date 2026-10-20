import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { flushSync } from "react-dom";
import {
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CircleSlash,
  Pencil,
  Plus,
  ReceiptText,
  Repeat,
  Search,
  ShieldCheck,
} from "lucide-react";
import { Workspace } from "../components/workspace";
import { Badge, Button, Modal } from "../components/ui";
import {
  CreateExpenseForm,
  OccurrenceSheet,
  statusSummary,
} from "../components/expense-forms";
import { errorMessage, useMonth, useTogglePayment } from "../lib/expenses";
import { formatMoney, periodLabel, shortDate } from "../lib/format";
import { periodSchema, type Occurrence } from "../../shared/contracts/expenses";
import type { CurrentUser } from "../../shared/contracts/account";
import { addMonths, todayIn } from "../../shared/domain/periods";
import type { Currency } from "../../shared/domain/money";

function dueState(occurrence: Occurrence, today: string) {
  if (occurrence.status !== "PLANNED") return null;
  if (occurrence.dueDate < today) return "Vencido";
  if (occurrence.dueDate === today) return "Vence hoy";
  return null;
}

// Un pago anual muestra lo desembolsado; el resto, el importe del mes.
function displayedAmount(occurrence: Occurrence) {
  return occurrence.payment?.annual
    ? occurrence.payment.amountMinor
    : occurrence.amountMinor;
}

function RowAction({
  occurrence,
  pending,
  onToggle,
  onOpen,
}: {
  occurrence: Occurrence;
  pending: boolean;
  onToggle: () => void;
  onOpen: () => void;
}) {
  const { name, status } = occurrence;
  if (status === "PLANNED" || status === "PAID")
    return (
      <button
        className={status === "PAID" ? "paid-action" : "pay-action"}
        disabled={pending}
        onClick={onToggle}
        aria-label={
          status === "PAID"
            ? `Deshacer pago de ${name}`
            : `Marcar ${name} como pagado`
        }
      >
        {status === "PAID" ? (
          <>
            <Check size={14} />
            <span>{occurrence.payment?.annual ? "Pago anual" : "Pagado"}</span>
            <span className="undo-label">Deshacer</span>
          </>
        ) : (
          <>
            <span className="empty-check" />
            {pending ? "Guardando…" : "Marcar pago"}
          </>
        )}
      </button>
    );
  const label =
    status === "COVERED"
      ? { text: "Pago anual", icon: CalendarCheck }
      : status === "SKIPPED"
        ? { text: "Omitido", icon: Repeat }
        : { text: "De baja", icon: CircleSlash };
  return (
    <button
      className="status-action"
      onClick={onOpen}
      aria-label={`${label.text}: ver ${name}`}
    >
      <label.icon size={14} aria-hidden="true" />
      {label.text}
    </button>
  );
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
  const [openId, setOpenId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  function goTo(next: string) {
    setParams({ periodo: next });
    setNotice(null);
    setOpenId(null);
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
  const resolved = (row: Occurrence) => row.status !== "PLANNED";
  const resolvedCount = rows.filter(resolved).length;
  const visible = rows
    .filter(
      (row) =>
        (filter === "all" || (filter === "resolved") === resolved(row)) &&
        row.name
          .toLocaleLowerCase("es")
          .includes(search.toLocaleLowerCase("es")),
    )
    .sort(
      (a, b) =>
        Number(resolved(a)) - Number(resolved(b)) ||
        a.dueDate.localeCompare(b.dueDate),
    );
  const label = periodLabel(period);
  // El detalle usa siempre la versión más reciente cargada de la fila.
  const open = rows.find((row) => row.id === openId) ?? null;

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
          <h3>No hay gastos en {label.toLowerCase()}</h3>
          <p>
            Creá tus gastos una vez: GastApp los repite cada mes o cada dos
            meses.
          </p>
          <Button onClick={() => setCreating(true)}>
            <Plus size={17} />
            Crear gasto
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
                          className={resolved(row) ? "complete" : ""}
                        />
                      ))}
                    </div>
                    <span>
                      {resolvedCount} de {rows.length} gastos resueltos
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
                  { id: "resolved", label: "Resueltos" },
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
                  const excluded = ["COVERED", "SKIPPED", "CANCELLED"].includes(
                    row.status,
                  );
                  return (
                    <div
                      className={`expense-row ${resolved(row) ? "is-paid" : ""}`}
                      role="row"
                      key={row.id}
                    >
                      <div role="cell" className="expense-name">
                        <span className="tile-icon blue">
                          {row.intervalMonths === 2 ? (
                            <Repeat size={19} />
                          ) : (
                            <ReceiptText size={19} />
                          )}
                        </span>
                        <button
                          className="expense-edit"
                          onClick={() => setOpenId(row.id)}
                          aria-label={`Ver o editar ${row.name}`}
                        >
                          <strong>{row.name}</strong>
                          <small>
                            {statusSummary(row)}
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
                      <strong
                        role="cell"
                        className={`expense-amount ${excluded ? "is-excluded" : ""}`}
                      >
                        {formatMoney(displayedAmount(row), row.currency)}
                      </strong>
                      <div role="cell" className="expense-action">
                        <RowAction
                          occurrence={row}
                          pending={pendingId === row.id}
                          onToggle={() => togglePayment(row)}
                          onOpen={() => setOpenId(row.id)}
                        />
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
                Los pagos se pueden deshacer. Lo omitido, dado de baja o
                cubierto por un pago anual no suma al pendiente. Las monedas
                nunca se suman entre sí.
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
        title="Crear gasto"
        description="Se repite solo: cada mes o cada dos meses."
      >
        <CreateExpenseForm
          userId={user.id}
          period={period}
          onCreated={(name, firstPeriod) => {
            setCreating(false);
            setFilter("pending");
            setSearch("");
            setNotice({
              text: `${name} se agregó desde ${periodLabel(firstPeriod).toLowerCase()}.`,
              tone: "ok",
            });
          }}
        />
      </Modal>
      <Modal
        open={open !== null}
        onOpenChange={(value) => {
          if (!value) setOpenId(null);
        }}
        title={open?.name ?? "Gasto"}
        description={
          open
            ? `${label} · ${formatMoney(displayedAmount(open), open.currency)}`
            : ""
        }
      >
        {open && (
          <OccurrenceSheet
            key={`${open.id}-${open.status}`}
            userId={user.id}
            occurrence={open}
            onDone={(text, undo) => {
              setOpenId(null);
              setNotice({ text, tone: "ok", undo });
            }}
            onTogglePayment={(occurrence) => {
              setOpenId(null);
              togglePayment(occurrence);
            }}
            onGoTo={goTo}
          />
        )}
      </Modal>
    </>
  );
}

export default function Month() {
  return <Workspace>{(user) => <MonthView user={user} />}</Workspace>;
}
