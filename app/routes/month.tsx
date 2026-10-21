import { Link } from "react-router";
import { CreateExpenseChooser } from "../components/card-forms";
import { useCardMonth } from "../lib/cards";
import { cn } from "../lib/cn";
import { useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { flushSync } from "react-dom";
import {
  CalendarCheck,
  CalendarDays,
  Check,
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
import { Button, Modal } from "../components/ui";
import { OccurrenceSheet, statusSummary } from "../components/expense-forms";
import { errorMessage, useMonth, useTogglePayment } from "../lib/expenses";
import { formatMoney, periodLabel, shortDate } from "../lib/format";
import { periodSchema, type Occurrence } from "../../shared/contracts/expenses";
import type { CurrentUser } from "../../shared/contracts/account";
import { addMonths, todayIn } from "../../shared/domain/periods";

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
        className={cn(
          status === "PAID"
            ? "paid-action [background:#edf8f2] flex items-center justify-center min-h-11 w-auto text-[#267354] text-[0.75rem] min-w-[108px] px-3 py-2 border border-solid border-transparent rounded-[7px] gap-1.5 desktop:text-[0.6875rem] desktop:min-w-22 desktop:px-2 desktop:py-[5px] [&:hover>span:not(.undo-label)]:hidden [&:focus-visible>span:not(.undo-label)]:hidden [&:hover_.undo-label]:inline [&:focus-visible_.undo-label]:inline [&>span:not(.undo-label)]:hidden desktop:[&>span:not(.undo-label)]:inline [&_.undo-label]:inline desktop:[&_.undo-label]:hidden"
            : "pay-action [background:transparent] flex items-center justify-center min-h-11 w-auto text-muted text-[0.75rem] min-w-[108px] px-3 py-2 border border-solid border-[#e2e8f4] rounded-[7px] gap-1.5 desktop:text-[0.6875rem] desktop:min-w-22 desktop:px-2 desktop:py-[5px] hover:[background:#edf2ff] hover:text-brand hover:border-muted",
        )}
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
            <span className="undo-label hidden">Deshacer</span>
          </>
        ) : (
          <>
            <span className="empty-check w-3 h-3 border border-solid border-[#c3cede] rounded-full" />
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
      className="status-action inline-flex items-center justify-center min-h-11 min-w-[108px] [background:#f2f4f9] text-muted text-[0.75rem] px-3 py-2 border border-solid border-transparent rounded-[7px] gap-1.5 desktop:min-h-9 desktop:min-w-22 desktop:text-[11px] desktop:px-2.5 desktop:py-[5px] hover:text-ink hover:border-[#dce3ef] focus-visible:text-ink focus-visible:border-[#dce3ef]"
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
  const cardMonth = useCardMonth(user.id, period);
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
  const summaryTotals = (["ARS", "USD"] as const).flatMap((currency) => {
    const regular = data?.totals.find((t) => t.currency === currency);
    const cardTotals = (cardMonth.data?.statements ?? []).flatMap((statement) =>
      statement.totals
        .filter((t) => t.currency === currency)
        .map((t) => ({ ...t, paid: statement.status === "PAID" })),
    );
    if (!regular && !cardTotals.length) return [];
    return [
      {
        currency,
        pendingMinor: (
          BigInt(regular?.pendingMinor ?? "0") +
          cardTotals
            .filter((t) => !t.paid)
            .reduce((sum, t) => sum + BigInt(t.amountMinor), 0n)
        ).toString(),
        paidMinor: (
          BigInt(regular?.paidMinor ?? "0") +
          cardTotals
            .filter((t) => t.paid)
            .reduce((sum, t) => sum + BigInt(t.amountMinor), 0n)
        ).toString(),
      },
    ];
  });
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
      <div className="page-heading month-heading flex items-center justify-between mb-4.5 flex-wrap gap-3.5 desktop:mb-[25px] [&_h1]:text-[1.875rem] desktop:[&_h1]:text-[2rem] [&_.eyebrow]:hidden desktop:[&_.eyebrow]:block [&_.page-description]:hidden desktop:[&_.page-description]:block">
        <div>
          <p className="eyebrow text-muted tracking-[1.45px] text-[11px] font-[650] mb-[11px]">
            TU MES, MÁS CLARO
          </p>
          <h1>
            Mi mes<span className="title-dot text-brand">.</span>
          </h1>
          <p className="page-description text-muted text-[0.8125rem] leading-[1.7] mt-2.5">
            Lo importante de tu mes, sin perderte en los números.
          </p>
        </div>
        <div className="heading-actions flex items-center w-full justify-between gap-2 min-[701px]:gap-3 min-[1251px]:w-auto max-[701px]:[&>.button]:text-[11px] max-[701px]:[&>.button]:pl-2.5 max-[701px]:[&>.button]:pr-2.5">
          <div className="month-switcher flex items-center [background:white] flex-1 justify-between p-0.5 border border-solid border-line rounded-[9px] desktop:flex-none [&>span]:flex [&>span]:items-center [&>span]:text-[0.875rem] [&>span]:font-semibold [&>span]:min-w-0 [&>span]:justify-center [&>span]:gap-2 desktop:[&>span]:text-[0.75rem] desktop:[&>span]:min-w-[138px] [&>span>svg]:text-muted [&>span>svg]:block [&_small]:text-muted [&_small]:text-[0.8125rem] [&_small]:font-[450] [&_small]:inline desktop:[&_small]:text-[0.6875rem] [&_.icon-button]:w-11 [&_.icon-button]:min-h-11">
            <button
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
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
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Mes siguiente"
              onClick={() => goTo(addMonths(period, 1))}
              disabled={period >= "2100-12"}
            >
              <ChevronRight size={17} />
            </button>
          </div>
          <Button
            className="desktop-create hidden desktop:inline-flex"
            onClick={() => setCreating(true)}
          >
            <Plus size={18} />
            Crear gasto
          </Button>
        </div>
      </div>

      {data && !cardMonth.isPending && summaryTotals.length > 0 && (
        <section
          className="mb-5 grid grid-cols-1 gap-3 min-[600px]:grid-cols-2"
          aria-label="Resumen por moneda"
        >
          {summaryTotals.map((total, index) => (
            <article
              key={total.currency}
              className={cn(
                "min-w-0 rounded-card border border-line p-4",
                index === 0 ? "bg-brand text-white" : "bg-white text-ink",
              )}
            >
              <p className="mb-1 text-sm">Por pagar · {total.currency}</p>
              <strong className="block overflow-x-auto whitespace-nowrap text-3xl font-semibold tabular-nums">
                {formatMoney(total.pendingMinor, total.currency)}
              </strong>
              <p className="mt-3 text-sm">
                Ya pagaste {formatMoney(total.paidMinor, total.currency)}
              </p>
              <p className="mt-2 text-xs">
                {cardMonth.isError
                  ? "Solo gastos regulares: tarjetas sin cargar."
                  : "Gastos regulares y consumos de tarjeta. Sin impuestos ni ajustes globales."}
              </p>
            </article>
          ))}
        </section>
      )}
      {month.isPending ? (
        <div
          className="loading-block mt-17.5 [&_p]:text-[12px] [&_p]:text-muted [&_p]:mt-[25px]"
          role="status"
        >
          <span className="skeleton h-6 block [background:linear-gradient(90deg,_#e5eaf4,_#f0f3f9,_#e5eaf4)] bg-size-[200%] animate-loading mb-[15px] rounded-[7px] [&:nth-child(2)]:max-w-[60%]" />
          <span className="skeleton h-6 block [background:linear-gradient(90deg,_#e5eaf4,_#f0f3f9,_#e5eaf4)] bg-size-[200%] animate-loading mb-[15px] rounded-[7px] [&:nth-child(2)]:max-w-[60%]" />
          <p>Cargando {label.toLowerCase()}…</p>
        </div>
      ) : month.isError ? (
        <section
          className="card empty-state [background:white] shadow-[0_3px_10px_#1b2d4f02] text-center text-muted px-5.5 py-[35px] border border-solid border-line rounded-card [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]"
          role="alert"
        >
          <h3>No pudimos cargar {label.toLowerCase()}</h3>
          <p>{errorMessage(month.error)}</p>
          <Button variant="secondary" onClick={() => void month.refetch()}>
            Reintentar
          </Button>
        </section>
      ) : rows.length === 0 ? (
        <section className="card empty-state [background:white] shadow-[0_3px_10px_#1b2d4f02] text-center text-muted px-5.5 py-[35px] border border-solid border-line rounded-card [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
          <ReceiptText size={27} />
          <h3>No hay gastos regulares en {label.toLowerCase()}</h3>
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
          <section className="card expenses-panel [background:white] shadow-[0_3px_10px_#1b2d4f02] border border-solid border-line rounded-card">
            <header className="panel-heading flex justify-between items-center p-4 gap-3.5 desktop:pt-[23px] desktop:pb-4.5 desktop:px-5.5 [&_h2]:text-[1rem] [&_h2]:flex [&_h2]:items-center [&_h2]:gap-[9px] desktop:[&_h2]:text-[0.875rem] [&_p]:text-muted [&_p]:text-[0.75rem] [&_p]:mt-[5px] [&>svg]:text-muted">
              <div>
                <h2>
                  Gastos del mes{" "}
                  <span className="count inline-flex items-center justify-center min-w-5 h-5 [background:#f2f4f9] text-[11px] text-muted rounded-[6px]">
                    {rows.length}
                  </span>
                </h2>
                <p>Resolvé tus pendientes, uno a la vez.</p>
              </div>
              <button
                className="icon-button mobile-search-toggle [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] desktop:hidden [&:hover:not(:disabled)]:[background:#eaf0fb]"
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
            <div className="expense-toolbar flex justify-between items-center pt-0 pb-3.5 flex-wrap px-3 gap-3 desktop:pr-5.5 desktop:pb-5 desktop:pl-5.5 desktop:flex-nowrap">
              <div
                className="filter-group flex [background:#f3f5f9] flex-1 w-full p-[3px] rounded-[8px] desktop:flex-none desktop:w-auto [&_button]:[background:transparent] [&_button]:text-[0.8125rem] [&_button]:font-medium [&_button]:text-muted [&_button]:flex-1 [&_button]:min-h-11 [&_button]:px-2 [&_button]:py-[7px] [&_button]:border-0 [&_button]:border-none [&_button]:border-current [&_button]:rounded-[6px] desktop:[&_button]:text-[0.6875rem] [&_button[aria-pressed='true']]:[background:white] [&_button[aria-pressed='true']]:text-[#3c4a62] [&_button[aria-pressed='true']]:shadow-[0_1px_4px_#14284a10]"
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
                className={cn(
                  `search-field hidden items-center text-muted max-w-none min-w-0 w-full px-3 py-0 border border-solid border-line rounded-[7px] gap-[7px] desktop:flex desktop:max-w-[180px] desktop:w-auto focus-within:[outline:2px_solid_#597af0] focus-within:[outline-offset:2px] [&_input]:[background:transparent] [&_input]:h-[33px] [&_input]:text-[max(16px,_1rem)] [&_input]:w-full [&_input]:min-w-0 [&_input]:text-ink [&_input]:[outline:none] [&_input]:min-h-11 [&_input]:border-0 [&_input]:border-none [&_input]:border-current [&_input::placeholder]:text-muted [&.search-open]:flex ${searchOpen ? "search-open" : ""} `,
                )}
              >
                <Search size={16} />
                <span className="sr-only absolute w-[1px] h-[1px] overflow-hidden [clip:rect(0,_0,_0,_0)] whitespace-nowrap m-[-1px] p-0 border-0 border-none border-current">
                  Buscar gasto
                </span>
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
              <div
                className="expense-table-head grid grid-cols-[minmax(140px,_1fr)_50px_96px_92px] items-center [background:#fafbfd] text-muted text-[11px] font-[550] tracking-[0.7px] absolute w-[1px] h-[1px] overflow-hidden [clip-path:inset(50%)] whitespace-nowrap m-[-1px] p-0 border-0 border-none border-current gap-1.5 desktop:grid-cols-[minmax(155px,_1fr)_66px_112px_108px] desktop:border-t desktop:[border-top-style:solid] desktop:border-t-[#f0f3f8] desktop:border-b desktop:[border-bottom-style:solid] desktop:border-b-[#f0f3f8] desktop:static desktop:w-auto desktop:h-auto desktop:overflow-visible desktop:[clip-path:none] desktop:whitespace-normal desktop:m-0 desktop:px-5.5 desktop:py-[13px] desktop:gap-2.5 [&_span:nth-child(3)]:text-right [&_span:last-child]:text-right"
                role="row"
              >
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
                      className={cn(
                        `expense-row max-[701px]:relative grid grid-cols-[minmax(0,_1fr)_auto] items-center min-h-19.5 border-b [border-bottom-style:solid] border-b-[#f0f3f8] px-3.5 py-4 gap-2.5 desktop:grid-cols-[minmax(155px,_1fr)_66px_112px_108px] desktop:px-5.5 desktop:py-[13px] [&_.due-date]:[grid-column:1] [&_.due-date]:[grid-row:2] [&_.due-date]:pl-10 [&_.due-date]:text-[0.75rem] [&_.due-date]:flex [&_.due-date]:items-center [&_.due-date]:flex-wrap [&_.due-date]:gap-[5px] desktop:[&_.due-date]:[grid-column:auto] desktop:[&_.due-date]:[grid-row:auto] desktop:[&_.due-date]:pl-0 desktop:[&_.due-date]:text-[0.6875rem] desktop:[&_.due-date]:block ${resolved(row) ? "is-paid [&_.expense-name_strong]:text-muted [&_.tile-icon]:opacity-[0.6]" : ""} `,
                      )}
                      role="row"
                      key={row.id}
                    >
                      <div
                        role="cell"
                        className="expense-name flex items-center min-w-0 [grid-column:1] [grid-row:1] gap-2 desktop:[grid-column:auto] desktop:[grid-row:auto] [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[0.875rem] [&_strong]:font-[550] [&_strong]:wrap-anywhere desktop:[&_strong]:text-[0.8125rem] [&_small]:block [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:mt-1 desktop:[&_small]:text-[0.6875rem] [&_.tile-icon]:w-8 [&_.tile-icon]:h-8 desktop:[&_.tile-icon]:w-[39px] desktop:[&_.tile-icon]:h-[39px]"
                      >
                        <span className="tile-icon blue inline-flex items-center justify-center h-[39px] w-[39px] shrink-0 [background:#edf3ff] text-[#4b70d9] rounded-[11px]">
                          {row.intervalMonths === 2 ? (
                            <Repeat size={19} />
                          ) : (
                            <ReceiptText size={19} />
                          )}
                        </span>
                        <button
                          className="expense-edit [background:transparent] min-w-0 text-left text-inherit p-0 border-0 border-none border-current rounded-[6px] [&_small]:flex [&_small]:items-center [&_small]:gap-[5px] [&_small_svg]:opacity-[1] [&_small_svg]:text-brand desktop:[&_small_svg]:opacity-[0] [&:hover_strong]:text-brand [&:hover_small_svg]:opacity-[1] [&:focus-visible_small_svg]:opacity-[1]"
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
                        className={cn(
                          state
                            ? 'due-date overdue text-muted text-[10px] min-[701px]:text-[11px] [&_small]:block [&_small]:text-[#a74849] [&_small]:text-[0.6875rem] [&_small]:m-0 desktop:[&_small]:mt-0.5 [&.overdue]:text-[#a74849] before:[content:"Vence"] before:text-muted before:text-[0.75rem] desktop:before:[content:none]'
                            : 'due-date text-muted text-[10px] min-[701px]:text-[11px] [&_small]:block [&_small]:text-[#a74849] [&_small]:text-[0.6875rem] [&_small]:m-0 desktop:[&_small]:mt-0.5 [&.overdue]:text-[#a74849] before:[content:"Vence"] before:text-muted before:text-[0.75rem] desktop:before:[content:none]',
                        )}
                      >
                        {shortDate(row.dueDate)}
                        {state && <small>{state}</small>}
                      </span>
                      <strong
                        role="cell"
                        className={cn(
                          `expense-amount text-right text-[0.9375rem] font-[550] tabular-nums [grid-column:2] [grid-row:1] wrap-anywhere max-w-[42vw] desktop:text-[0.75rem] desktop:[grid-column:auto] desktop:[grid-row:auto] desktop:max-w-none [&.is-excluded]:text-muted [&.is-excluded]:font-[450] ${excluded ? "is-excluded" : ""} `,
                        )}
                      >
                        {formatMoney(displayedAmount(row), row.currency)}
                      </strong>
                      <div
                        role="cell"
                        className="expense-action flex justify-end [grid-column:2] [grid-row:2] desktop:[grid-column:auto] desktop:[grid-row:auto]"
                      >
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
              <div className="empty-state text-center text-muted px-5.5 py-[35px] [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
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
            <footer className="list-footer flex items-start text-muted text-[0.75rem] leading-[1.7] p-4 gap-[7px] max-[701px]:[&>svg]:mt-0.5">
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

      {cardMonth.data && cardMonth.data.statements.length > 0 && (
        <section className="mb-5 rounded-card border border-line bg-white p-4 desktop:p-6">
          <h2 className="mb-3">Resúmenes de tarjeta</h2>
          <p className="mb-3 text-sm text-muted">
            Consumos por resumen, con sus monedas separadas.
          </p>
          {cardMonth.data.statements.map((statement) => (
            <Link
              key={statement.id}
              to={`/tarjetas?tarjeta=${statement.cardId}&periodo=${period}`}
              className="flex min-h-11 flex-wrap items-center justify-between gap-3 border-t border-line py-3"
            >
              <div>
                <strong className="text-sm">{statement.cardName}</strong>
                <p className="text-xs text-muted">
                  Vence {shortDate(statement.dueDate)} ·{" "}
                  {statement.status === "PAID"
                    ? "Pagado"
                    : statement.status === "RECONCILED"
                      ? "Conciliado, pendiente de pago"
                      : `${statement.unresolved} por revisar`}
                </p>
              </div>
              <span className="flex flex-wrap gap-3 text-sm font-semibold tabular-nums">
                {statement.totals.map((total) => (
                  <span key={total.currency}>
                    {formatMoney(total.amountMinor, total.currency)}
                  </span>
                ))}
              </span>
            </Link>
          ))}
        </section>
      )}
      {cardMonth.isError && (
        <p role="alert" className="mb-5 text-sm text-danger">
          No pudimos cargar los resúmenes de tarjeta.{" "}
          <Button variant="ghost" onClick={() => void cardMonth.refetch()}>
            Reintentar
          </Button>
        </p>
      )}

      <div
        className="feedback-message empty:hidden fixed bottom-[calc(var(--navigation-height)_+_76px_+_env(safe-area-inset-bottom))] left-1/2 [transform:translateX(-50%)] z-[40] max-w-[calc(100vw_-_36px)] w-max [background:#1f304b] text-white flex items-center shadow-[0_10px_30px_#15244020] text-[0.8125rem] px-3 py-2.5 border border-solid border-[#324766] rounded-[12px] gap-2 desktop:bottom-6 desktop:left-[calc(50%_+_102px)] desktop:text-[0.75rem] [&>svg]:text-muted [&_.icon-button:hover]:[background:#ffffff17] [&_.toast-undo]:text-white [&_.toast-undo]:underline [&_.toast-undo]:pl-2 [&_.toast-undo]:pr-2 [&_.toast-undo:hover]:[background:#ffffff17]"
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
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
              aria-label="Cerrar aviso"
              onClick={() => setNotice(null)}
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
        Crear gasto
      </Button>
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Crear gasto"
        description="Elegí un gasto mensual o un consumo de tarjeta."
      >
        <CreateExpenseChooser
          user={user}
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
