import { cn } from "../lib/cn";
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
import { FormField, Badge, Button, Modal } from "../components/ui";

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
      <FormField>
        <label htmlFor="expense-name">Nombre del gasto</label>
        <input
          id="expense-name"
          name="name"
          placeholder="Ej. Gimnasio"
          required
          maxLength={80}
          pattern=".*\S.*"
        />
      </FormField>
      <div className="grid grid-cols-2 gap-3">
        <FormField>
          <label htmlFor="expense-amount">Importe</label>
          <input
            id="expense-amount"
            name="amount"
            inputMode="decimal"
            placeholder="0,00"
            required
            maxLength={12}
          />
        </FormField>
        <FormField>
          <label htmlFor="expense-currency">Moneda</label>
          <select name="currency" id="expense-currency">
            <option value="ARS">Pesos (ARS)</option>
            <option value="USD">Dólares (USD)</option>
          </select>
        </FormField>
      </div>
      <FormField>
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
        <span className="field-help text-[0.75rem] text-muted leading-[1.7]">
          Este ejemplo crea un gasto personal para el mes seleccionado.
        </span>
      </FormField>
      {error && (
        <p
          role="alert"
          className="error-message text-[12px] text-[#b64f51] leading-[1.7] mx-0 my-3"
        >
          {error}
        </p>
      )}
      <div className="dialog-actions sticky bottom-[-1px] pt-3 pb-[1px] [background:white]">
        <Button type="submit" className="w-full">
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
        className={cn(
          `page-heading flex items-center justify-between mb-4.5 flex-wrap gap-3.5 desktop:mb-[25px] [&_h1]:text-[1.875rem] desktop:[&_h1]:text-[2rem] ${section === "mes" ? "month-heading [&_.eyebrow]:hidden desktop:[&_.eyebrow]:block [&_.page-description]:hidden desktop:[&_.page-description]:block" : ""} `,
        )}
      >
        <div>
          <p className="eyebrow text-muted tracking-[1.45px] text-[11px] font-[650] mb-[11px]">
            TODO UN POCO MÁS CLARO
          </p>
          <h1>
            {label}
            <span className="title-dot text-brand">.</span>
          </h1>
          <p className="page-description text-muted text-[0.8125rem] leading-[1.7] mt-2.5">
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
          <div className="heading-actions flex items-center w-full justify-between gap-2 min-[701px]:gap-3 min-[1251px]:w-auto max-[701px]:[&>.button]:text-[11px] max-[701px]:[&>.button]:pl-2.5 max-[701px]:[&>.button]:pr-2.5">
            <div className="month-switcher flex items-center [background:white] flex-1 justify-between p-0.5 border border-solid border-line rounded-[9px] desktop:flex-none [&>span]:flex [&>span]:items-center [&>span]:text-[0.875rem] [&>span]:font-semibold [&>span]:min-w-0 [&>span]:justify-center [&>span]:gap-2 desktop:[&>span]:text-[0.75rem] desktop:[&>span]:min-w-[138px] [&>span>svg]:text-muted [&>span>svg]:block [&_small]:text-muted [&_small]:text-[0.8125rem] [&_small]:font-[450] [&_small]:inline desktop:[&_small]:text-[0.6875rem] [&_.icon-button]:w-11 [&_.icon-button]:min-h-11">
              <button
                className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
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
                className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
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
              className="desktop-create hidden desktop:inline-flex"
              onClick={() => setCreating(true)}
            >
              <Plus size={18} />
              Crear gasto
            </Button>
          </div>
        )}
      </div>
      <div className="demo-note max-[701px]:leading-[1.7] flex items-center text-muted text-[0.75rem] mt-0 mb-4 mx-0 gap-2 max-[701px]:[&_svg]:mt-0.5">
        <Info size={15} />
        <span className="wide-copy hidden desktop:flex">
          Estás explorando un diseño con datos de ejemplo. Los cambios solo
          duran en esta visita.
        </span>
        <span className="compact-copy block desktop:hidden">
          Datos de ejemplo · cambios temporales
        </span>
      </div>
      {section === "mes" ? (
        <>
          <section
            className="metrics grid grid-cols-2 mb-5 gap-2.5 desktop:grid-cols-[1.14fr_1fr_1fr] desktop:mb-6.5 desktop:gap-4.5"
            aria-label="Resumen por moneda"
          >
            <article
              className={
                'metric-card metric-featured [background:linear-gradient(115deg,_#3156d1,_#4569e5)] min-w-0 text-white shadow-[0_8px_18px_#3358d219] relative overflow-hidden col-span-full px-4.5 py-4 border border-solid border-transparent rounded-card desktop:[grid-column:auto] desktop:px-[23px] desktop:py-5 after:[content:""] after:absolute after:w-[180px] after:h-[180px] after:-right-20 after:top-[-75px] after:pointer-events-none after:border-[25px] after:border-solid after:border-[#ffffff05] after:rounded-full [&_.metric-label]:text-[#e0e8ff] [&_.metric-label]:mb-0.5 [&_.metric-label]:text-[0.8125rem] desktop:[&_.metric-label]:mb-[13px] desktop:[&_.metric-label]:text-[0.75rem] desktop:[&>p]:min-h-0 [&>p]:text-[11px] [&>p]:text-[#e5ecff] [&>p]:mt-[7px] [&>p]:mb-4.5 [&>p]:hidden [&>p]:mx-0 desktop:[&>p]:text-[0.6875rem] desktop:[&>p]:block [&>.badge]:mt-[7px] max-desktop:[&_.badge]:text-[11px] [&_.metric-value]:text-[2rem] desktop:[&_.metric-value]:text-[clamp(23px,_2.15vw,_33px)] [&:not(.metric-featured)_.metric-icon]:hidden desktop:[&:not(.metric-featured)_.metric-icon]:grid [&:not(.metric-featured)]:p-3.5 desktop:[&:not(.metric-featured)]:px-[23px] desktop:[&:not(.metric-featured)]:py-5 [&:not(.metric-featured)_.metric-label]:text-[0.75rem] [&:not(.metric-featured)_.metric-label]:mb-[5px] desktop:[&:not(.metric-featured)_.metric-label]:mb-[13px] [&:not(.metric-featured)_.metric-value]:text-[clamp(19px,_5.3vw,_25px)] desktop:[&:not(.metric-featured)_.metric-value]:text-[clamp(23px,_2.15vw,_33px)] max-[701px]:[&:not(.metric-featured)>p]:text-[11px] desktop:[&:not(.metric-featured)>p]:text-[0.6875rem] max-[701px]:[&:not(.metric-featured)>p]:leading-[1.8] max-[701px]:[&:not(.metric-featured)>p]:min-h-10 desktop:[&:not(.metric-featured)>p]:min-h-0 max-[701px]:[&:not(.metric-featured)>p]:mt-2 max-[701px]:[&:not(.metric-featured)>p]:mr-0 max-[701px]:[&:not(.metric-featured)>p]:mb-2 max-[701px]:[&:not(.metric-featured)>p]:ml-0 [&:not(.metric-featured)>p]:hidden desktop:[&:not(.metric-featured)>p]:block max-[701px]:[&:not(.metric-featured)_.badge]:text-[11px] max-[701px]:[&:not(.metric-featured)_.badge]:pt-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pr-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pb-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pl-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:mt-1.5 [&:not(.metric-featured)>.badge]:hidden desktop:[&:not(.metric-featured)>.badge]:inline-flex [&_.metric-icon]:grid'
              }
            >
              <div className="metric-label flex justify-between items-center text-[11px] text-muted mb-[13px]">
                <span>Por pagar · ARS</span>
                <span className="metric-icon h-[29px] w-[29px] grid place-content-center [background:#ffffff1c] rounded-[9px] min-[701px]:hidden desktop:grid">
                  <ArrowUpRight size={18} />
                </span>
              </div>
              <strong className="metric-value text-[20px] font-[620] tracking-[-0.6px] tabular-nums whitespace-normal wrap-anywhere desktop:text-[25px] desktop:tracking-[-0.8px] min-[1251px]:text-[clamp(23px,_2.15vw,_33px)] min-[1650px]:text-[35px]">
                {money(sum(rows, "ARS", false))}
              </strong>
              <p>Importes completos de tus gastos pendientes</p>
              <div className="payment-progress [&>div]:flex [&>div]:mb-2 [&>div]:h-1 [&>div]:gap-1 [&>div>span]:flex-1 [&>div>span]:[background:#ffffff27] [&>div>span]:rounded-[3px] [&>div>.complete]:[background:#c5d5ff] [&>span]:flex [&>span]:justify-between [&>span]:items-center [&>span]:text-[0.75rem] [&>span]:text-[#e3eaff] desktop:[&>span]:text-[0.6875rem] mt-2.5 desktop:mt-0">
                <div>
                  {rows.map((e) => (
                    <span key={e.id} className={cn(e.paid ? "complete" : "")} />
                  ))}
                </div>
                <span>
                  {paid} de {rows.length} gastos resueltos
                  <CheckCheck size={16} />
                </span>
              </div>
            </article>
            <article className="metric-card [background:white] min-w-0 px-4 py-3.5 border border-solid border-line rounded-card [&>p]:text-[11px] [&>p]:text-muted [&>p]:mt-[7px] [&>p]:mb-4.5 [&>p]:mx-0 [&>.badge]:mt-[7px] max-desktop:[&_.badge]:text-[11px] [&:not(.metric-featured)_.metric-icon]:hidden desktop:[&:not(.metric-featured)_.metric-icon]:grid [&:not(.metric-featured)]:p-3.5 desktop:[&:not(.metric-featured)]:px-[23px] desktop:[&:not(.metric-featured)]:py-5 [&:not(.metric-featured)_.metric-label]:text-[0.75rem] [&:not(.metric-featured)_.metric-label]:mb-[5px] desktop:[&:not(.metric-featured)_.metric-label]:mb-[13px] [&:not(.metric-featured)_.metric-value]:text-[clamp(19px,_5.3vw,_25px)] desktop:[&:not(.metric-featured)_.metric-value]:text-[clamp(23px,_2.15vw,_33px)] max-[701px]:[&:not(.metric-featured)>p]:text-[11px] desktop:[&:not(.metric-featured)>p]:text-[0.6875rem] max-[701px]:[&:not(.metric-featured)>p]:leading-[1.8] max-[701px]:[&:not(.metric-featured)>p]:min-h-10 desktop:[&:not(.metric-featured)>p]:min-h-0 max-[701px]:[&:not(.metric-featured)>p]:mt-2 max-[701px]:[&:not(.metric-featured)>p]:mr-0 max-[701px]:[&:not(.metric-featured)>p]:mb-2 max-[701px]:[&:not(.metric-featured)>p]:ml-0 [&:not(.metric-featured)>p]:hidden desktop:[&:not(.metric-featured)>p]:block max-[701px]:[&:not(.metric-featured)_.badge]:text-[11px] max-[701px]:[&:not(.metric-featured)_.badge]:pt-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pr-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pb-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pl-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:mt-1.5 [&:not(.metric-featured)>.badge]:hidden desktop:[&:not(.metric-featured)>.badge]:inline-flex">
              <div className="metric-label flex justify-between items-center text-[11px] text-muted mb-[13px]">
                <span>Ya pagaste · ARS</span>
                <span className="metric-icon green text-[#2e9278] [background:#ffffff1c] h-[29px] w-[29px] grid place-content-center rounded-[9px] min-[701px]:hidden desktop:grid">
                  <CheckCheck size={18} />
                </span>
              </div>
              <strong className="metric-value text-[20px] font-[620] tracking-[-0.6px] tabular-nums whitespace-normal wrap-anywhere desktop:text-[25px] desktop:tracking-[-0.8px] min-[1251px]:text-[clamp(23px,_2.15vw,_33px)] min-[1650px]:text-[35px]">
                {money(sum(rows, "ARS", true))}
              </strong>
              <p>Una cosa menos en tu cabeza.</p>
              <Badge tone="green">
                <CircleCheck size={12} />
                {rows.filter((e) => e.paid && e.currency === "ARS").length}{" "}
                pagos en pesos
              </Badge>
            </article>
            <article className="metric-card [background:white] min-w-0 px-4 py-3.5 border border-solid border-line rounded-card [&>p]:text-[11px] [&>p]:text-muted [&>p]:mt-[7px] [&>p]:mb-4.5 [&>p]:mx-0 [&>.badge]:mt-[7px] max-desktop:[&_.badge]:text-[11px] [&:not(.metric-featured)_.metric-icon]:hidden desktop:[&:not(.metric-featured)_.metric-icon]:grid [&:not(.metric-featured)]:p-3.5 desktop:[&:not(.metric-featured)]:px-[23px] desktop:[&:not(.metric-featured)]:py-5 [&:not(.metric-featured)_.metric-label]:text-[0.75rem] [&:not(.metric-featured)_.metric-label]:mb-[5px] desktop:[&:not(.metric-featured)_.metric-label]:mb-[13px] [&:not(.metric-featured)_.metric-value]:text-[clamp(19px,_5.3vw,_25px)] desktop:[&:not(.metric-featured)_.metric-value]:text-[clamp(23px,_2.15vw,_33px)] max-[701px]:[&:not(.metric-featured)>p]:text-[11px] desktop:[&:not(.metric-featured)>p]:text-[0.6875rem] max-[701px]:[&:not(.metric-featured)>p]:leading-[1.8] max-[701px]:[&:not(.metric-featured)>p]:min-h-10 desktop:[&:not(.metric-featured)>p]:min-h-0 max-[701px]:[&:not(.metric-featured)>p]:mt-2 max-[701px]:[&:not(.metric-featured)>p]:mr-0 max-[701px]:[&:not(.metric-featured)>p]:mb-2 max-[701px]:[&:not(.metric-featured)>p]:ml-0 [&:not(.metric-featured)>p]:hidden desktop:[&:not(.metric-featured)>p]:block max-[701px]:[&:not(.metric-featured)_.badge]:text-[11px] max-[701px]:[&:not(.metric-featured)_.badge]:pt-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pr-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pb-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:pl-[5px] max-[701px]:[&:not(.metric-featured)_.badge]:mt-1.5 [&:not(.metric-featured)>.badge]:hidden desktop:[&:not(.metric-featured)>.badge]:inline-flex">
              <div className="metric-label flex justify-between items-center text-[11px] text-muted mb-[13px]">
                <span>Por pagar · USD</span>
                <span className="metric-icon purple text-[#8b6cc8] [background:#ffffff1c] h-[29px] w-[29px] grid place-content-center rounded-[9px] min-[701px]:hidden desktop:grid">
                  <WalletIcon />
                </span>
              </div>
              <strong className="metric-value text-[20px] font-[620] tracking-[-0.6px] tabular-nums whitespace-normal wrap-anywhere desktop:text-[25px] desktop:tracking-[-0.8px] min-[1251px]:text-[clamp(23px,_2.15vw,_33px)] min-[1650px]:text-[35px]">
                {money(sum(rows, "USD", false), "USD")}
              </strong>
              <p>Los dólares, siempre por separado.</p>
              <Badge>Sin conversión de monedas</Badge>
            </article>
          </section>
          <div className="dashboard-grid grid grid-cols-1 items-start gap-5 min-[1251px]:grid-cols-[minmax(0,_1fr)_255px]">
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
                aria-label="Gastos de ejemplo"
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
                    const Icon = icons[row.icon];
                    const overdue = period === 1 && row.day < 20 && !row.paid;
                    return (
                      <div
                        className={cn(
                          `expense-row max-[701px]:relative grid grid-cols-[minmax(0,_1fr)_auto] items-center min-h-19.5 border-b [border-bottom-style:solid] border-b-[#f0f3f8] px-3.5 py-4 gap-2.5 desktop:grid-cols-[minmax(155px,_1fr)_66px_112px_108px] desktop:px-5.5 desktop:py-[13px] [&_.due-date]:[grid-column:1] [&_.due-date]:[grid-row:2] [&_.due-date]:pl-10 [&_.due-date]:text-[0.75rem] [&_.due-date]:flex [&_.due-date]:items-center [&_.due-date]:flex-wrap [&_.due-date]:gap-[5px] desktop:[&_.due-date]:[grid-column:auto] desktop:[&_.due-date]:[grid-row:auto] desktop:[&_.due-date]:pl-0 desktop:[&_.due-date]:text-[0.6875rem] desktop:[&_.due-date]:block ${row.paid ? "is-paid [&_.expense-name_strong]:text-muted [&_.tile-icon]:opacity-[0.6]" : ""} `,
                        )}
                        role="row"
                        key={row.id}
                      >
                        <div
                          role="cell"
                          className="expense-name flex items-center min-w-0 [grid-column:1] [grid-row:1] gap-2 desktop:[grid-column:auto] desktop:[grid-row:auto] [&>div]:min-w-0 [&_strong]:block [&_strong]:text-[0.875rem] [&_strong]:font-[550] [&_strong]:wrap-anywhere desktop:[&_strong]:text-[0.8125rem] [&_small]:block [&_small]:text-muted [&_small]:text-[0.75rem] [&_small]:mt-1 desktop:[&_small]:text-[0.6875rem] [&_.tile-icon]:w-8 [&_.tile-icon]:h-8 desktop:[&_.tile-icon]:w-[39px] desktop:[&_.tile-icon]:h-[39px]"
                        >
                          <span
                            className={cn(
                              `tile-icon inline-flex items-center justify-center h-[39px] w-[39px] shrink-0 [background:#f1f4f9] text-muted rounded-[11px] ${row.icon === "home" ? "purple text-[#8b6cc8] [background:#f2edfb]" : row.icon === "zap" ? "amber text-[#bc8a35] [background:#fff5e4]" : "blue text-[#4b70d9] [background:#edf3ff]"} `,
                            )}
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
                          className={cn(
                            overdue
                              ? 'due-date overdue text-muted text-[10px] min-[701px]:text-[11px] [&_small]:block [&_small]:text-[#a74849] [&_small]:text-[0.6875rem] [&_small]:m-0 desktop:[&_small]:mt-0.5 [&.overdue]:text-[#a74849] before:[content:"Vence"] before:text-muted before:text-[0.75rem] desktop:before:[content:none]'
                              : 'due-date text-muted text-[10px] min-[701px]:text-[11px] [&_small]:block [&_small]:text-[#a74849] [&_small]:text-[0.6875rem] [&_small]:m-0 desktop:[&_small]:mt-0.5 [&.overdue]:text-[#a74849] before:[content:"Vence"] before:text-muted before:text-[0.75rem] desktop:before:[content:none]',
                          )}
                        >
                          {row.day} {periods[period].slice(0, 3).toLowerCase()}
                          {overdue && <small>Vencido</small>}
                        </span>
                        <strong
                          role="cell"
                          className="expense-amount text-right text-[0.9375rem] font-[550] tabular-nums [grid-column:2] [grid-row:1] wrap-anywhere max-w-[42vw] desktop:text-[0.75rem] desktop:[grid-column:auto] desktop:[grid-row:auto] desktop:max-w-none [&.is-excluded]:text-muted [&.is-excluded]:font-[450]"
                        >
                          {money(row.amount, row.currency)}
                        </strong>
                        <div
                          role="cell"
                          className="expense-action flex justify-end [grid-column:2] [grid-row:2] desktop:[grid-column:auto] desktop:[grid-row:auto]"
                        >
                          <button
                            className={cn(
                              row.paid
                                ? "paid-action [background:#edf8f2] flex items-center justify-center min-h-11 w-auto text-[#267354] text-[0.75rem] min-w-[108px] px-3 py-2 border border-solid border-transparent rounded-[7px] gap-1.5 desktop:text-[0.6875rem] desktop:min-w-22 desktop:px-2 desktop:py-[5px] [&:hover>span:not(.undo-label)]:hidden [&:focus-visible>span:not(.undo-label)]:hidden [&:hover_.undo-label]:inline [&:focus-visible_.undo-label]:inline [&>span:not(.undo-label)]:hidden desktop:[&>span:not(.undo-label)]:inline [&_.undo-label]:inline desktop:[&_.undo-label]:hidden"
                                : "pay-action [background:transparent] flex items-center justify-center min-h-11 w-auto text-muted text-[0.75rem] min-w-[108px] px-3 py-2 border border-solid border-[#e2e8f4] rounded-[7px] gap-1.5 desktop:text-[0.6875rem] desktop:min-w-22 desktop:px-2 desktop:py-[5px] hover:[background:#edf2ff] hover:text-brand hover:border-muted",
                            )}
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
                                <span className="undo-label hidden">
                                  Deshacer
                                </span>
                              </>
                            ) : (
                              <>
                                <span className="empty-check w-3 h-3 border border-solid border-[#c3cede] rounded-full" />
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
                <div className="empty-state text-center text-muted px-5.5 py-[35px] [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
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
              <footer className="list-footer flex items-start text-muted text-[0.75rem] leading-[1.7] p-4 gap-[7px] max-[701px]:[&>svg]:mt-0.5">
                <ShieldCheck size={14} />
                <span>
                  Los pagos se pueden deshacer. Las monedas nunca se suman entre
                  sí.
                </span>
              </footer>
            </section>
            <aside className="dashboard-aside grid grid-cols-1 gap-5 desktop:grid-cols-[1fr_1fr] min-[1251px]:grid-cols-1">
              <section className="card next-panel [background:white] shadow-[0_3px_10px_#1b2d4f02] border border-solid border-line rounded-card [&_.panel-heading]:pt-[21px] [&_.panel-heading]:pb-[7px] [&_.panel-heading]:px-5">
                <header className="panel-heading flex justify-between items-center p-4 gap-3.5 desktop:pt-[23px] desktop:pb-4.5 desktop:px-5.5 [&_h2]:text-[1rem] [&_h2]:flex [&_h2]:items-center [&_h2]:gap-[9px] desktop:[&_h2]:text-[0.875rem] [&_p]:text-muted [&_p]:text-[0.75rem] [&_p]:mt-[5px] [&>svg]:text-muted">
                  <h2>Lo próximo</h2>
                  <CalendarDays size={18} />
                </header>
                {next.length ? (
                  next.map((row) => (
                    <div
                      className="upcoming-row flex items-center px-5 py-[17px] gap-[11px] [&+.upcoming-row]:border-t [&+.upcoming-row]:[border-top-style:solid] [&+.upcoming-row]:border-t-[#f1f4f8] [&>div>strong]:block [&>div>strong]:text-[11px] [&>div>strong]:font-[550] [&>div>small]:block [&>div>small]:text-[11px] [&>div>small]:text-muted [&>div>small]:mt-1"
                      key={row.id}
                    >
                      <span className="date-tile flex flex-col items-center justify-center [background:#f6f8fc] h-11 w-10 border border-solid border-[#eaf0f8] rounded-[9px] [&_small]:text-[11px] [&_small]:text-muted [&_small]:font-[550] [&_strong]:text-[16px] [&_strong]:font-semibold [&_strong]:text-[#566984]">
                        <small>
                          {periods[period].slice(0, 3).toUpperCase()}
                        </small>
                        <strong>{row.day}</strong>
                      </span>
                      <div>
                        <strong>{row.name}</strong>
                        <small>{money(row.amount, row.currency)}</small>
                      </div>
                      <span className="upcoming-dot h-[5px] w-[5px] [background:#bdcbed] ml-auto rounded-full" />
                    </div>
                  ))
                ) : (
                  <div className="all-done text-center text-muted px-5.5 py-[35px] [&_h3]:mt-3 [&_h3]:mb-[7px] [&_h3]:text-[#586987] [&_h3]:mx-0 [&_p]:text-[11px] [&_p]:mb-[17px]">
                    <CircleCheck size={30} />
                    <h3>Todo resuelto</h3>
                    <p>No quedan pagos pendientes en este ejemplo.</p>
                  </div>
                )}
              </section>
              <section className="shared-teaser [background:#edf2ff] p-[21px] border border-solid border-[#e0e8fc] rounded-card [&>.tile-icon]:[background:#dfe8ff] [&>.tile-icon]:text-muted [&>.tile-icon]:mb-[13px] [&_h3]:text-[13px] [&_h3]:text-[#415785] [&_p]:text-[11px] [&_p]:text-muted [&_p]:leading-[1.8] [&_p]:mt-1.5">
                <span className="tile-icon inline-flex items-center justify-center h-[39px] w-[39px] shrink-0 [background:#f1f4f9] text-muted rounded-[11px]">
                  <Users size={20} />
                </span>
                <h3>Compartir, sin enredos.</h3>
                <p>
                  Anotá lo que te deben, aunque la otra persona no use GastApp.
                </p>
                <div className="avatar-stack flex items-center pl-0.5 mx-0 my-[17px] [&>span]:h-[25px] [&>span]:w-[25px] [&>span]:[background:#d4d9f7] [&>span]:text-muted [&>span]:grid [&>span]:place-content-center [&>span]:text-[11px] [&>span]:-ml-0.5 [&>span]:border-[2px] [&>span]:border-solid [&>span]:border-brand-soft [&>span]:rounded-full [&>span+span]:[background:#d8e9f7] [&>span+span]:ml-[-5px] [&_small]:text-[11px] [&_small]:text-muted [&_small]:ml-[7px]">
                  <span>A</span>
                  <span>M</span>
                  <small>Contactos y conexiones</small>
                </div>
                <button
                  className="text-link flex items-center [background:transparent] text-[#3656ad] text-[11px] font-semibold min-h-11 p-0 border-0 border-none border-current gap-2 hover:underline"
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
        <div className="secondary-grid grid grid-cols-1 max-w-[900px] gap-[25px] desktop:grid-cols-[minmax(280px,_0.9fr)_1.1fr]">
          <article className="bank-card [background:radial-gradient(ellipse_at_85%_110%,_#4b68d0,_transparent_65%),_#273d83] text-white shadow-[0_15px_25px_#263d8320] p-6.5 rounded-[20px] min-[701px]:p-7.5 [&>div]:flex [&>div]:justify-between [&>div]:items-center [&>div>span]:text-[11px] [&>div>span]:tracking-[2px] [&>div>span]:opacity-[0.6] [&_h2]:text-[21px] [&_h2]:mx-0 [&_h2]:my-5.5 [&_p]:tracking-[2px] [&_p]:text-[17px] [&_p]:text-[#c7d3fa] min-[701px]:[&_p]:tracking-[3px] [&_footer]:flex [&_footer]:justify-between [&_footer]:items-end [&_footer]:mt-10 [&_footer_span]:text-[11px] [&_footer_span]:text-[#d1ddff] [&_footer_strong]:block [&_footer_strong]:mt-1 [&_footer_strong]:text-white [&_footer_strong]:text-[11px] [&_footer_strong]:font-medium [&_footer_span:last-child]:text-[22px] [&_footer_span:last-child]:text-white [&_footer_span:last-child]:font-bold [&_footer_span:last-child]:[font-style:italic]">
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
          <section className="card detail-panel [background:white] shadow-[0_3px_10px_#1b2d4f02] p-6.5 border border-solid border-line rounded-card min-[701px]:p-7.5 [&_h2]:text-[23px] [&_h2]:leading-[1.35] [&_h2]:mt-4 [&_h2]:mb-3 [&_h2]:mx-0 [&_p]:text-muted [&_p]:text-[0.8125rem] [&_p]:leading-[1.8] [&_p]:mb-5">
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
          <div className="section-intro max-[701px]:leading-[1.8] text-muted [background:#eef3fc] flex items-center text-[11px] mb-[25px] max-w-[900px] p-4 border border-solid border-[#e5ecf9] rounded-[12px] gap-3 min-[701px]:text-[12px] min-[701px]:px-5.5 min-[701px]:py-[19px] min-[701px]:gap-[15px] [&_p]:text-[0.8125rem]">
            <Users size={20} />
            <p>
              Podés registrar contactos sin cuenta. Conectar una cuenta real
              requiere aceptación para compartir información.
            </p>
          </div>
          <div className="contacts-grid grid grid-cols-1 max-w-[900px] gap-5 min-[701px]:gap-3.5 desktop:grid-cols-2 desktop:gap-[23px]">
            {[
              {
                id: "ana" as const,
                name: "Ana García",
                initial: "A",
                kind: "Contacto sin cuenta",
                amount: "15425000",
                color: "purple text-[#8b6cc8] [background:#f2edfb]",
              },
              {
                id: "martin" as const,
                name: "Martín López",
                initial: "M",
                kind: "Usuario conectado",
                amount: "2400000",
                color: "blue text-[#4b70d9] [background:#edf3ff]",
              },
            ].map((person) => (
              <article
                className="card contact-card [background:white] shadow-[0_3px_10px_#1b2d4f02] p-6 border border-solid border-line rounded-card min-[701px]:p-5 desktop:p-[27px] max-[701px]:[&_header]:flex-nowrap min-[701px]:max-desktop:[&_header]:flex-wrap [&_header]:flex [&_header]:justify-between [&_header]:items-center [&_header]:mb-5 [&_header]:gap-2.5 [&_h2]:text-[19px] [&_p]:text-muted [&_p]:text-[0.8125rem] [&_p]:mt-[25px] [&>small]:block [&>small]:text-muted [&>small]:mt-[5px] [&>small]:mb-[25px] [&>small]:text-[0.8125rem] [&>small]:mx-0 [&>.button]:w-full [&>.button]:justify-between"
                key={person.id}
              >
                <header>
                  <span
                    className={cn(
                      `person-avatar w-11.5 h-11.5 inline-grid place-content-center font-[550] rounded-[15px] ${person.color} `,
                    )}
                  >
                    {person.initial}
                  </span>
                  <Badge tone={person.id === "ana" ? "neutral" : "green"}>
                    {person.kind}
                  </Badge>
                </header>
                <h2>{person.name}</h2>
                <p>Te debe · ARS</p>
                <strong className="contact-amount block text-[28px] tracking-[-0.8px] mt-[5px] min-[701px]:text-[23px] desktop:text-[28px]">
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
          <div className="inline-tip max-[701px]:text-[11px] flex items-start text-muted max-w-[850px] px-0 py-7 gap-3.5 [&_p]:text-[11px] [&_p]:leading-[1.9] [&_strong]:text-muted">
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
          <div className="section-intro max-[701px]:leading-[1.8] text-muted [background:#eef3fc] flex items-center text-[11px] mb-[25px] max-w-[900px] p-4 border border-solid border-[#e5ecf9] rounded-[12px] gap-3 min-[701px]:text-[12px] min-[701px]:px-5.5 min-[701px]:py-[19px] min-[701px]:gap-[15px] [&_p]:text-[0.8125rem]">
            <HandCoins size={21} />
            <p>
              Las deudas personales se registran aparte de los gastos
              compartidos. Cada pago conserva su fecha e importe.
            </p>
          </div>
          <section className="card debt-card [background:white] shadow-[0_3px_10px_#1b2d4f02] max-w-[900px] p-5.5 border border-solid border-line rounded-card min-[701px]:p-7">
            <div className="debt-person max-[701px]:flex-wrap flex items-center gap-[13px] [&>.badge]:ml-[59px] min-[701px]:[&>.badge]:ml-auto [&_p]:text-muted [&_p]:text-[0.8125rem] [&_p]:mt-[3px] max-[701px]:[&_h2]:text-[14px]">
              <span className="person-avatar amber text-[#bc8a35] [background:#fff5e4] w-11.5 h-11.5 inline-grid place-content-center font-[550] rounded-[15px]">
                L
              </span>
              <div>
                <h2>Préstamo a Lucía</h2>
                <p>Préstamo personal · en dólares</p>
              </div>
              <Badge tone="amber">Pago parcial</Badge>
            </div>
            <div className="debt-values grid grid-cols-1 border-t [border-top-style:solid] border-t-line border-b [border-bottom-style:solid] border-b-line mt-7 mb-5.5 mx-0 px-0 py-5 gap-4.5 min-[701px]:pt-[25px] min-[701px]:pb-[25px] desktop:grid-cols-3 [&_span]:block [&_span]:text-[11px] [&_span]:text-muted max-[701px]:[&_strong]:mr-0 max-[701px]:[&_strong]:mb-0 max-[701px]:[&_strong]:ml-0 [&_strong]:block [&_strong]:text-[17px] [&_strong]:font-semibold [&_strong]:mt-0 min-[701px]:[&_strong]:text-[16px] desktop:[&_strong]:text-[20px] desktop:[&_strong]:mt-[7px] [&>div]:flex [&>div]:items-center [&>div]:justify-between [&>div]:gap-2.5 desktop:[&>div]:block">
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
              className="icon-button [background:transparent] w-11 min-h-11 inline-flex justify-center items-center p-1.5 border-0 border-none border-current rounded-[7px] [&:hover:not(:disabled)]:[background:#eaf0fb]"
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
        <Button
          className="mobile-create desktop:hidden fixed right-[max(16px,_env(safe-area-inset-right))] bottom-[calc(var(--navigation-height)_+_12px_+_env(safe-area-inset-bottom))] z-[29] min-h-12 shadow-[0_6px_24px_#253f9840] px-4.5 py-3 rounded-[16px] [body:has(.search-field_input:focus)_&]:hidden"
          onClick={() => setCreating(true)}
        >
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
            <div className="reconcile-row max-[701px]:flex-wrap flex items-center border-b [border-bottom-style:solid] border-b-line text-[11px] px-0 py-4.5 gap-[15px] min-[701px]:text-[12px] [&>span:first-child]:mr-auto [&_small]:block [&_small]:text-muted [&_small]:text-[11px] [&_small]:mt-[5px] [&_strong]:whitespace-nowrap max-[701px]:[&>.badge]:ml-auto">
              <span>
                Compra en 6 cuotas<small>Cuota 2 de 6 · ARS</small>
              </span>
              <strong>$ 25.000,00</strong>
              <Badge tone="green">Coincide</Badge>
            </div>
            <div className="reconcile-row max-[701px]:flex-wrap flex items-center border-b [border-bottom-style:solid] border-b-line text-[11px] px-0 py-4.5 gap-[15px] min-[701px]:text-[12px] [&>span:first-child]:mr-auto [&_small]:block [&_small]:text-muted [&_small]:text-[11px] [&_small]:mt-[5px] [&_strong]:whitespace-nowrap max-[701px]:[&>.badge]:ml-auto">
              <span>
                Servicio mensual<small>Esperado: $ 10.000,00</small>
              </span>
              <strong>$ 10.000,50</strong>
              <Badge tone="amber">Revisar</Badge>
            </div>
            <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
              La conciliación se confirma después de revisar todas las
              diferencias. Las cuotas no se pagan individualmente.
            </p>
          </>
        ) : detail === "debt" ? (
          <>
            <div className="reconcile-row max-[701px]:flex-wrap flex items-center border-b [border-bottom-style:solid] border-b-line text-[11px] px-0 py-4.5 gap-[15px] min-[701px]:text-[12px] [&>span:first-child]:mr-auto [&_small]:block [&_small]:text-muted [&_small]:text-[11px] [&_small]:mt-[5px] [&_strong]:whitespace-nowrap max-[701px]:[&>.badge]:ml-auto">
              <span>
                15 de octubre de 2026<small>Pago parcial recibido</small>
              </span>
              <strong>US$ 250,00</strong>
              <ArrowDownLeft size={18} />
            </div>
            <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
              Saldo pendiente: US$ 750,00. Este préstamo no proviene de gastos
              compartidos.
            </p>
          </>
        ) : (
          <>
            <div className="reconcile-row max-[701px]:flex-wrap flex items-center border-b [border-bottom-style:solid] border-b-line text-[11px] px-0 py-4.5 gap-[15px] min-[701px]:text-[12px] [&>span:first-child]:mr-auto [&_small]:block [&_small]:text-muted [&_small]:text-[11px] [&_small]:mt-[5px] [&_strong]:whitespace-nowrap max-[701px]:[&>.badge]:ml-auto">
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
            <p className="notice text-muted [background:#f2f5fb] text-[11px] leading-[1.7] mx-0 my-4 px-[15px] py-[13px] rounded-[9px]">
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
