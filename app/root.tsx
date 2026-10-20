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
    <div className="startup" role="status">
      <span className="brand">gastapp.</span>
      <p>Preparando tu espacio…</p>
    </div>
  );
}
export function ErrorBoundary() {
  const error = useRouteError();
  return (
    <main className="standalone">
      <a className="brand" href="/">
        gastapp.
      </a>
      <h1>
        {isRouteErrorResponse(error) && error.status === 404
          ? "Esta página no existe."
          : "Algo no salió como esperábamos."}
      </h1>
      <p>Volvé al inicio para continuar.</p>
      <a className="button primary" href="/">
        Ir al inicio
      </a>
    </main>
  );
}
