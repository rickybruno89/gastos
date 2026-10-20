import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Brand } from "./brand";
import { Button } from "./ui";
import { AppShell } from "./app-shell";
import { authClient, useCurrentUser } from "../lib/account";
import type { CurrentUser } from "../../shared/contracts/account";

export function Workspace({
  children,
}: {
  children: (user: CurrentUser) => ReactNode;
}) {
  const account = useCurrentUser();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const [signingOut, setSigningOut] = useState(false);
  async function signOut() {
    setSigningOut(true);
    setError("");
    try {
      const result = await authClient.signOut();
      if (result.error) throw new Error("Error al cerrar sesión");
      client.clear();
      navigate("/acceso", { replace: true });
    } catch {
      setError("No pudimos cerrar la sesión. Intentá de nuevo.");
    } finally {
      setSigningOut(false);
    }
  }
  if (account.isPending)
    return (
      <main className="standalone">
        <Brand />
        <div className="loading-block" role="status">
          <span className="skeleton" />
          <span className="skeleton" />
          <p>Abriendo tu espacio…</p>
        </div>
      </main>
    );
  if (account.isError)
    return (
      <main className="standalone">
        <Brand />
        <h1>No pudimos abrir tu cuenta.</h1>
        <p>Comprobá tu conexión e intentá de nuevo.</p>
        <Button onClick={() => void account.refetch()}>Reintentar</Button>
      </main>
    );
  if (!account.data) return <Navigate to="/acceso" replace />;
  return (
    <AppShell
      name={account.data.name}
      email={account.data.email}
      signingOut={signingOut}
      onSignOut={() => void signOut()}
      error={error}
    >
      {children(account.data)}
    </AppShell>
  );
}
