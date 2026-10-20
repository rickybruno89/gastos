import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router";
import { flushSync } from "react-dom";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  CircleCheck,
  CreditCard,
  HandCoins,
  Home,
  Info,
  Plus,
  ReceiptText,
  Search,
  ShieldCheck,
  Users,
  Wifi,
  Zap,
} from "lucide-react";
import { AppShell } from "../components/app-shell";
import { Badge, Button, Modal } from "../components/ui";

type Expense = {
  id: string;
  name: string;
  category: string;
  amount: string;
  currency: "ARS" | "USD";
  day: number;
  paid: boolean;
  shared?: string;
  icon: "home" | "wifi" | "zap" | "receipt";
};
const icons = { home: Home, wifi: Wifi, zap: Zap, receipt: ReceiptText };
const initialExpenses: Expense[] = [
  {
    id: "1",
    name: "Alquiler",
    category: "Hogar",
    amount: "28000000",
    currency: "ARS",
    day: 10,
    paid: true,
    shared: "Con Ana · tu parte 50%",
    icon: "home",
  },
  {
    id: "2",
    name: "Internet",
    category: "Servicios",
    amount: "2850000",
    currency: "ARS",
    day: 18,
    paid: false,
    shared: "Con Ana · tu parte 50%",
    icon: "wifi",
  },
  {
    id: "3",
    name: "Electricidad",
    category: "Servicios",
    amount: "4200000",
    currency: "ARS",
    day: 24,
    paid: false,
    icon: "zap",
  },
  {
    id: "4",
    name: "Obra social",
    category: "Salud",
    amount: "7800000",
    currency: "ARS",
    day: 26,
    paid: false,
    icon: "receipt",
  },
  {
    id: "5",
    name: "Suscripción de trabajo",
    category: "Suscripciones",
    amount: "2000",
    currency: "USD",
    day: 28,
    paid: false,
    icon: "receipt",
  },
  {
    id: "6",
    name: "Celular",
    category: "Servicios",
    amount: "1850000",
    currency: "ARS",
    day: 12,
    paid: true,
    icon: "wifi",
  },
];
const periods = ["Septiembre", "Octubre", "Noviembre"];
function money(amount: string | bigint, currency: "ARS" | "USD" = "ARS") {
  const cents = BigInt(amount);
  return `${currency === "USD" ? "US$" : "$"} ${new Intl.NumberFormat("es-AR").format(cents / 100n)},${(cents % 100n).toString().padStart(2, "0")}`;
}
function sum(rows: Expense[], currency: "ARS" | "USD", paid: boolean) {
  return rows
    .filter((e) => e.currency === currency && e.paid === paid)
    .reduce((total, row) => total + BigInt(row.amount), 0n);
}
function ExpenseForm({
  onAdd,
  lastDay,
}: {
  onAdd: (expense: Expense) => void;
  lastDay: number;
}) {
  const [error, setError] = useState("");
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const amount = String(data.get("amount")).trim().replace(",", ".");
    if (!/^\d{1,9}(\.\d{1,2})?$/.test(amount)) {
      setError(
        "Ingresá un importe válido, con hasta dos decimales y sin separador de miles.",
      );
      return;
    }
    const [integer, decimals = ""] = amount.split(".");
    const cents = BigInt(integer) * 100n + BigInt(decimals.padEnd(2, "0"));
    if (cents <= 0n) {
      setError("El importe debe ser mayor a cero.");
      return;
    }
    onAdd({
      id: crypto.randomUUID(),
      name: String(data.get("name")).trim(),
      category: "Personal",
      amount: cents.toString(),
      currency: data.get("currency") === "USD" ? "USD" : "ARS",
      day: Number(data.get("day")),
      paid: false,
      icon: "receipt",
    });
  }
  return (
    <form onSubmit={submit}>
      <div className="form-field">
        <label htmlFor="expense-name">Nombre del gasto</label>
        <input
          id="expense-name"
          name="name"
          placeholder="Ej. Gimnasio"
          required
          maxLength={80}
          pattern=".*\S.*"
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
            maxLength={12}
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
          name="day"
          id="expense-day"
          min={1}
          max={lastDay}
          defaultValue={25}
          required
        />
        <span className="field-help">
          Este ejemplo crea un gasto personal para el mes seleccionado.
        </span>
      </div>
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
      <div className="dialog-actions">
        <Button type="submit" className="full-width">
          <Plus size={17} />
          Agregar a la demo
        </Button>
      </div>
    </form>
  );
}
export default function Preview() {
  const [params, setParams] = useSearchParams();
  const section = ["tarjetas", "compartidos", "deudas"].includes(
    params.get("seccion") ?? "",
  )
    ? params.get("seccion")!
    : "mes";
  const [period, setPeriod] = useState(1);
  const [months, setMonths] = useState<Record<number, Expense[]>>({
    0: initialExpenses.map((e) => ({ ...e, paid: true })),
    1: initialExpenses,
    2: initialExpenses.map((e) => ({ ...e, paid: false })),
  });
  const [filter, setFilter] = useState("pending");
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchInput = useRef<HTMLInputElement | null>(null);
  const [notice, setNotice] = useState("");
  const [lastPayment, setLastPayment] = useState<{
    expense: Expense;
    period: number;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [detail, setDetail] = useState<
    "card" | "ana" | "martin" | "debt" | null
  >(null);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [section]);
  const rows = months[period];
  const paid = rows.filter((e) => e.paid).length;
  const visible = rows
    .filter(
      (e) =>
        (filter === "all" || (filter === "paid" ? e.paid : !e.paid)) &&
        e.name.toLocaleLowerCase("es").includes(search.toLocaleLowerCase("es")),
    )
    .sort((a, b) => Number(a.paid) - Number(b.paid) || a.day - b.day);
  const next = rows
    .filter((e) => !e.paid)
    .sort((a, b) => a.day - b.day)
    .slice(0, 3);
  function toggle(row: Expense) {
    setLastPayment(row.paid ? null : { expense: row, period });
    setMonths((current) => ({
      ...current,
      [period]: current[period].map((e) =>
        e.id === row.id ? { ...e, paid: !e.paid } : e,
      ),
    }));
    setNotice(
      row.paid
        ? `Se deshizo el pago de ${row.name} en la demo.`
        : `${row.name}, marcado como pagado en la demo.`,
    );
  }
  function undoLastPayment() {
    if (!lastPayment) return;
    const { expense, period: paymentPeriod } = lastPayment;
    setMonths((current) => ({
      ...current,
      [paymentPeriod]: current[paymentPeriod].map((row) =>
        row.id === expense.id ? { ...row, paid: false } : row,
      ),
    }));
    setLastPayment(null);
    setNotice(`Se deshizo el pago de ${expense.name} en la demo.`);
  }
  const label =
    section === "mes"
      ? "Mi mes"
      : section === "tarjetas"
        ? "Mis tarjetas"
        : section === "compartidos"
          ? "Lo que compartimos"
          : "Deudas personales";
  return (
    <AppShell
      preview
      section={section}
      onSection={(value) => {
        setParams(value === "mes" ? {} : { seccion: value });
        setNotice("");
        setLastPayment(null);
      }}
    >
      <div
        className={`page-heading ${section === "mes" ? "month-heading" : ""}`}
      >
        <div>
          <p className="eyebrow">TODO UN POCO MÁS CLARO</p>
          <h1>
            {label}
            <span className="title-dot">.</span>
          </h1>
          <p className="page-description">
            {section === "mes"
              ? "Lo importante de tu mes, sin perderte en los números."
              : section === "tarjetas"
                ? "Cada resumen en su mes. Cada consumo en su lugar."
                : section === "compartidos"
                  ? "Cuentas claras, con o sin una cuenta de GastApp."
                  : "Préstamos y pagos parciales, con su propio seguimiento."}
          </p>
        </div>
        {section === "mes" && (
          <div className="heading-actions">
            <div className="month-switcher">
              <button
                className="icon-button"
                aria-label="Mes anterior"
                disabled={period === 0}
                onClick={() => {
                  setPeriod(period - 1);
                  setNotice("");
                  setLastPayment(null);
                }}
              >
                <ChevronLeft size={17} />
              </button>
              <span>
                <CalendarDays size={16} />
                {periods[period]} <small>2026</small>
              </span>
              <button
                className="icon-button"
                aria-label="Mes siguiente"
                disabled={period === 2}
                onClick={() => {
                  setPeriod(period + 1);
                  setNotice("");
                  setLastPayment(null);
                }}
              >
                <ChevronRight size={17} />
              </button>
            </div>
            <Button
              className="desktop-create"
              onClick={() => setCreating(true)}
            >
              <Plus size={18} />
              Crear gasto
            </Button>
          </div>
        )}
      </div>
      <div className="demo-note">
        <Info size={15} />
        <span className="wide-copy">
          Estás explorando un diseño con datos de ejemplo. Los cambios solo
          duran en esta visita.
        </span>
        <span className="compact-copy">
          Datos de ejemplo · cambios temporales
        </span>
      </div>
      {section === "mes" ? (
        <>
          <section className="metrics" aria-label="Resumen por moneda">
            <article className="metric-card metric-featured">
              <div className="metric-label">
                <span>Por pagar · ARS</span>
                <span className="metric-icon">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <strong className="metric-value">
                {money(sum(rows, "ARS", false))}
              </strong>
              <p>Importes completos de tus gastos pendientes</p>
              <div className="payment-progress">
                <div>
                  {rows.map((e) => (
                    <span key={e.id} className={e.paid ? "complete" : ""} />
                  ))}
                </div>
                <span>
                  {paid} de {rows.length} gastos resueltos
                  <CheckCheck size={16} />
                </span>
              </div>
            </article>
            <article className="metric-card">
              <div className="metric-label">
                <span>Ya pagaste · ARS</span>
                <span className="metric-icon green">
                  <CheckCheck size={18} />
                </span>
              </div>
              <strong className="metric-value">
                {money(sum(rows, "ARS", true))}
              </strong>
              <p>Una cosa menos en tu cabeza.</p>
              <Badge tone="green">
                <CircleCheck size={12} />
                {rows.filter((e) => e.paid && e.currency === "ARS").length}{" "}
                pagos en pesos
              </Badge>
            </article>
            <article className="metric-card">
              <div className="metric-label">
                <span>Por pagar · USD</span>
                <span className="metric-icon purple">
                  <WalletIcon />
                </span>
              </div>
              <strong className="metric-value">
                {money(sum(rows, "USD", false), "USD")}
              </strong>
              <p>Los dólares, siempre por separado.</p>
              <Badge>Sin conversión de monedas</Badge>
            </article>
          </section>
          <div className="dashboard-grid">
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
                    { id: "all", label: "Todos" },
                    { id: "pending", label: "Pendientes" },
                    { id: "paid", label: "Pagados" },
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
                aria-label="Gastos de ejemplo"
              >
                <div className="expense-table-head" role="row">
                  <span role="columnheader">GASTO</span>
                  <span role="columnheader">VENCE</span>
                  <span role="columnheader">IMPORTE TOTAL</span>
                  <span role="columnheader">ESTADO / ACCIÓN</span>
                </div>
                <div role="rowgroup">
                  {visible.map((row) => {
                    const Icon = icons[row.icon];
                    const overdue = period === 1 && row.day < 20 && !row.paid;
                    return (
                      <div
                        className={`expense-row ${row.paid ? "is-paid" : ""}`}
                        role="row"
                        key={row.id}
                      >
                        <div role="cell" className="expense-name">
                          <span
                            className={`tile-icon ${row.icon === "home" ? "purple" : row.icon === "zap" ? "amber" : "blue"}`}
                          >
                            <Icon size={19} />
                          </span>
                          <div>
                            <strong>{row.name}</strong>
                            <small>{row.shared ?? row.category}</small>
                          </div>
                        </div>
                        <span
                          role="cell"
                          className={overdue ? "due-date overdue" : "due-date"}
                        >
                          {row.day} {periods[period].slice(0, 3).toLowerCase()}
                          {overdue && <small>Vencido</small>}
                        </span>
                        <strong role="cell" className="expense-amount">
                          {money(row.amount, row.currency)}
                        </strong>
                        <div role="cell" className="expense-action">
                          <button
                            className={row.paid ? "paid-action" : "pay-action"}
                            onClick={() => toggle(row)}
                            aria-label={
                              row.paid
                                ? `Deshacer pago de ${row.name}`
                                : `Marcar ${row.name} como pagado`
                            }
                          >
                            {row.paid ? (
                              <>
                                <Check size={14} />
                                <span>Pagado</span>
                                <span className="undo-label">Deshacer</span>
                              </>
                            ) : (
                              <>
                                <span className="empty-check" />
                                Marcar pago
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
                  <Search size={27} />
                  <h3>
                    {search
                      ? "No encontramos ese gasto"
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
            <aside className="dashboard-aside">
              <section className="card next-panel">
                <header className="panel-heading">
                  <h2>Lo próximo</h2>
                  <CalendarDays size={18} />
                </header>
                {next.length ? (
                  next.map((row) => (
                    <div className="upcoming-row" key={row.id}>
                      <span className="date-tile">
                        <small>
                          {periods[period].slice(0, 3).toUpperCase()}
                        </small>
                        <strong>{row.day}</strong>
                      </span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>{money(row.amount, row.currency)}</small>
                      </div>
                      <span className="upcoming-dot" />
                    </div>
                  ))
                ) : (
                  <div className="all-done">
                    <CircleCheck size={30} />
                    <h3>Todo resuelto</h3>
                    <p>No quedan pagos pendientes en este ejemplo.</p>
                  </div>
                )}
              </section>
              <section className="shared-teaser">
                <span className="tile-icon">
                  <Users size={20} />
                </span>
                <h3>Compartir, sin enredos.</h3>
                <p>
                  Anotá lo que te deben, aunque la otra persona no use GastApp.
                </p>
                <div className="avatar-stack">
                  <span>A</span>
                  <span>M</span>
                  <small>Contactos y conexiones</small>
                </div>
                <button
                  className="text-link"
                  onClick={() => setParams({ seccion: "compartidos" })}
                >
                  Ver compartidos
                  <ArrowRight size={16} />
                </button>
              </section>
            </aside>
          </div>
        </>
      ) : section === "tarjetas" ? (
        <div className="secondary-grid">
          <article className="bank-card">
            <div>
              <span>MI TARJETA</span>
              <CreditCard size={26} />
            </div>
            <h2>Visa Galicia</h2>
            <p>•••• &nbsp; •••• &nbsp; •••• &nbsp; 4821</p>
            <footer>
              <span>
                Resumen de octubre<strong>Vence el 28 oct</strong>
              </span>
              <span>VISA</span>
            </footer>
          </article>
          <section className="card detail-panel">
            <Badge tone="amber">Por conciliar</Badge>
            <h2>
              Primero revisás.
              <br />
              Después pagás.
            </h2>
            <p>
              Compará tus consumos esperados con el resumen real. Confirmá las
              diferencias antes de marcar el resumen completo como pagado.
            </p>
            <Button variant="secondary" onClick={() => setDetail("card")}>
              Ver ejemplo de conciliación
              <ArrowRight size={16} />
            </Button>
          </section>
        </div>
      ) : section === "compartidos" ? (
        <>
          <div className="section-intro">
            <Users size={20} />
            <p>
              Podés registrar contactos sin cuenta. Conectar una cuenta real
              requiere aceptación para compartir información.
            </p>
          </div>
          <div className="contacts-grid">
            {[
              {
                id: "ana" as const,
                name: "Ana García",
                initial: "A",
                kind: "Contacto sin cuenta",
                amount: "15425000",
                color: "purple",
              },
              {
                id: "martin" as const,
                name: "Martín López",
                initial: "M",
                kind: "Usuario conectado",
                amount: "2400000",
                color: "blue",
              },
            ].map((person) => (
              <article className="card contact-card" key={person.id}>
                <header>
                  <span className={`person-avatar ${person.color}`}>
                    {person.initial}
                  </span>
                  <Badge tone={person.id === "ana" ? "neutral" : "green"}>
                    {person.kind}
                  </Badge>
                </header>
                <h2>{person.name}</h2>
                <p>Te debe · ARS</p>
                <strong className="contact-amount">
                  {money(person.amount)}
                </strong>
                <small>Saldo de gastos compartidos de ejemplo</small>
                <Button
                  variant="secondary"
                  onClick={() => setDetail(person.id)}
                >
                  Ver detalle
                  <ArrowUpRight size={16} />
                </Button>
              </article>
            ))}
          </div>
          <div className="inline-tip">
            <ShieldCheck size={20} />
            <p>
              <strong>Compartir un gasto no es compartir tu cuenta.</strong> Un
              contacto manual es solo tu registro. Un usuario conectado ve
              únicamente el detalle que tenga autorizado.
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="section-intro">
            <HandCoins size={21} />
            <p>
              Las deudas personales se registran aparte de los gastos
              compartidos. Cada pago conserva su fecha e importe.
            </p>
          </div>
          <section className="card debt-card">
            <div className="debt-person">
              <span className="person-avatar amber">L</span>
              <div>
                <h2>Préstamo a Lucía</h2>
                <p>Préstamo personal · en dólares</p>
              </div>
              <Badge tone="amber">Pago parcial</Badge>
            </div>
            <div className="debt-values">
              <div>
                <span>Importe original</span>
                <strong>US$ 1.000,00</strong>
              </div>
              <div>
                <span>Ya te devolvió</span>
                <strong>US$ 250,00</strong>
              </div>
              <div>
                <span>Falta devolver</span>
                <strong>US$ 750,00</strong>
              </div>
            </div>
            <Button variant="secondary" onClick={() => setDetail("debt")}>
              Ver pagos de ejemplo
              <ArrowRight size={16} />
            </Button>
          </section>
        </>
      )}
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
            {lastPayment && (
              <Button
                variant="ghost"
                className="toast-undo"
                onClick={undoLastPayment}
              >
                Deshacer
              </Button>
            )}
            <button
              className="icon-button"
              aria-label="Cerrar aviso"
              onClick={() => {
                setNotice("");
                setLastPayment(null);
              }}
            >
              ×
            </button>
          </>
        )}
      </div>
      {section === "mes" && (
        <Button className="mobile-create" onClick={() => setCreating(true)}>
          <Plus size={20} />
          Crear gasto
        </Button>
      )}
      <Modal
        open={creating}
        onOpenChange={setCreating}
        title="Crear gasto de ejemplo"
        description="Probá cómo se siente agregar un gasto. No se guardará en tu cuenta."
      >
        <ExpenseForm
          lastDay={period === 1 ? 31 : 30}
          onAdd={(expense) => {
            setMonths((current) => ({
              ...current,
              [period]: [...current[period], expense],
            }));
            setCreating(false);
            setSearch("");
            setLastPayment(null);
            setFilter("all");
            setNotice(
              `${expense.name} se agregó a ${periods[period].toLowerCase()} en la demo.`,
            );
          }}
        />
      </Modal>
      <Modal
        open={detail !== null}
        onOpenChange={(open) => {
          if (!open) setDetail(null);
        }}
        title={
          detail === "card"
            ? "Conciliación · ejemplo"
            : detail === "debt"
              ? "Pagos de Lucía · ejemplo"
              : `Compartido con ${detail === "ana" ? "Ana" : "Martín"}`
        }
        description="Vista ilustrativa. Los datos son ficticios y no generan operaciones reales."
      >
        {detail === "card" ? (
          <>
            <div className="reconcile-row">
              <span>
                Compra en 6 cuotas<small>Cuota 2 de 6 · ARS</small>
              </span>
              <strong>$ 25.000,00</strong>
              <Badge tone="green">Coincide</Badge>
            </div>
            <div className="reconcile-row">
              <span>
                Servicio mensual<small>Esperado: $ 10.000,00</small>
              </span>
              <strong>$ 10.000,50</strong>
              <Badge tone="amber">Revisar</Badge>
            </div>
            <p className="notice">
              La conciliación se confirma después de revisar todas las
              diferencias. Las cuotas no se pagan individualmente.
            </p>
          </>
        ) : detail === "debt" ? (
          <>
            <div className="reconcile-row">
              <span>
                15 de octubre de 2026<small>Pago parcial recibido</small>
              </span>
              <strong>US$ 250,00</strong>
              <ArrowDownLeft size={18} />
            </div>
            <p className="notice">
              Saldo pendiente: US$ 750,00. Este préstamo no proviene de gastos
              compartidos.
            </p>
          </>
        ) : (
          <>
            <div className="reconcile-row">
              <span>
                {detail === "ana" ? "Alquiler + internet" : "Compra compartida"}
                <small>
                  Parte asignada a {detail === "ana" ? "Ana" : "Martín"} · ARS
                </small>
              </span>
              <strong>
                {detail === "ana" ? "$ 154.250,00" : "$ 24.000,00"}
              </strong>
            </div>
            <p className="notice">
              {detail === "ana"
                ? "Ana no tiene cuenta ni recibe avisos. Este saldo es un registro privado para vos."
                : "Martín es un usuario conectado. La vista compartida debe limitarse a los datos autorizados de este gasto."}
            </p>
          </>
        )}
      </Modal>
    </AppShell>
  );
}
function WalletIcon() {
  return <CreditCard size={18} />;
}
