import { useState, type ReactNode } from "react";
import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
  isRouteErrorResponse,
  useRouteError,
} from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@fontsource-variable/inter/wght.css";
import stylesheet from "./styles.css?url";

export const links = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
];
export const meta = () => [
  { title: "GastApp · Tu mes, más claro" },
  { name: "theme-color", content: "#f5f7fb" },
  {
    name: "description",
    content:
      "Organizá tus obligaciones mensuales, tarjetas y gastos compartidos.",
  },
];
export function Layout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-AR">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, viewport-fit=cover"
        />
        <Meta />
        <Links />
      </head>
      <body>
        {children}
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
export default function Root() {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
      }),
  );
  return (
    <QueryClientProvider client={client}>
      <Outlet />
    </QueryClientProvider>
  );
}
export function HydrateFallback() {
  return (
    <div
      className="startup min-h-svh grid place-content-center text-muted text-center gap-5.5"
      role="status"
    >
      <span className="brand inline-flex items-center text-[26px] font-[760] tracking-[-1.3px] leading-[1] min-h-11">
        gastapp.
      </span>
      <p>Preparando tu espacio…</p>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="standalone max-w-[640px] m-auto px-6 py-20 [&_h1]:mt-[65px] [&_h1]:mb-[17px] [&_h1]:mx-0 [&>p]:text-muted [&>p]:mb-6">
      <a
        className="brand inline-flex items-center text-[26px] font-[760] tracking-[-1.3px] leading-[1] min-h-11"
        href="/"
      >
        gastapp.
      </a>
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? "Esta página no existe."
          : "Algo no salió como esperábamos."}
      </h1>
      <p>Volvé al inicio para continuar.</p>
      <a
        className="button primary inline-flex items-center justify-center min-h-11 text-[0.875rem] font-semibold whitespace-nowrap text-white [background:var(--color-brand)] shadow-[0_3px_6px_#3458dd18] px-4 py-2.5 border border-solid border-transparent rounded-[9px] gap-[9px] [&:hover:not(:disabled)]:[background:var(--color-brand-hover)]"
        href="/"
      >
        Ir al inicio
      </a>
    </main>
  );
}
