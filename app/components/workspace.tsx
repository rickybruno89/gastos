import type { ReactNode } from "react";
import { Navigate, useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Brand } from "./brand";
import { Button } from "./ui";
import { AppShell } from "./app-shell";
import { authClient, useCurrentUser } from "../lib/account";
import type { CurrentUser } from "../../shared/contracts/account";

export function useSignOut() {
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
  return { signOut: () => void signOut(), signingOut, error };
}

export function Workspace({
  children,
}: {
  children: (user: CurrentUser) => ReactNode;
}) {
  const account = useCurrentUser();
  if (account.isPending)
    return (
      <main className="standalone max-w-[640px] m-auto px-6 py-20 [&_h1]:mt-[65px] [&_h1]:mb-[17px] [&_h1]:mx-0 [&>p]:text-muted [&>p]:mb-6">
        <Brand />
        <div
          className="loading-block mt-17.5 [&_p]:text-[12px] [&_p]:text-muted [&_p]:mt-[25px]"
          role="status"
        >
          <span className="skeleton h-6 block [background:linear-gradient(90deg,_#e5eaf4,_#f0f3f9,_#e5eaf4)] bg-size-[200%] animate-loading mb-[15px] rounded-[7px] [&:nth-child(2)]:max-w-[60%]" />
          <span className="skeleton h-6 block [background:linear-gradient(90deg,_#e5eaf4,_#f0f3f9,_#e5eaf4)] bg-size-[200%] animate-loading mb-[15px] rounded-[7px] [&:nth-child(2)]:max-w-[60%]" />
          <p>Abriendo tu espacio…</p>
        </div>
      </main>
    );
  if (account.isError)
    return (
      <main className="standalone max-w-[640px] m-auto px-6 py-20 [&_h1]:mt-[65px] [&_h1]:mb-[17px] [&_h1]:mx-0 [&>p]:text-muted [&>p]:mb-6">
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
      image={account.data.image}
    >
      {children(account.data)}
    </AppShell>
  );
}
