import { useLocation, Link, useNavigate } from "react-router";
import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { useCurrentUser } from "../lib/account";
import { Workspace } from "../components/workspace";
import { Brand } from "../components/brand";
import { Button } from "../components/ui";
import { invitationLinkSchema } from "../../shared/contracts/notifications";
import { ApiError, request, send } from "../../shared/api-client";
export default function Invitation() {
  const account = useCurrentUser(),
    location = useLocation(),
    navigate = useNavigate();
  // Mantener el enlace al usar “Saltar al contenido”, que cambia el fragmento.
  const [params] = useState(() => new URLSearchParams(location.hash.slice(1))),
    [acceptKey] = useState(() => crypto.randomUUID()),
    id = params.get("id"),
    token = params.get("token");
  const valid =
    z.uuid().safeParse(id).success &&
    z
      .string()
      .regex(/^[A-Za-z0-9_-]{43}$/)
      .safeParse(token).success;
  const preview = useQuery({
    queryKey: ["invitation-link", id, token],
    enabled: !!account.data && valid,
    queryFn: () =>
      request(`/invitations/${id}/inspect`, invitationLinkSchema, {
        method: "POST",
        body: JSON.stringify({ token }),
      }),
    retry: false,
  });
  const accept = useMutation({
    mutationFn: () =>
      send(`/invitations/${id}/accept-link`, z.unknown(), {
        method: "POST",
        body: { token },
        idempotencyKey: acceptKey,
      }),
    onSuccess: () => navigate("/compartidos", { replace: true }),
  });
  const message = (
    <div className="mx-auto max-w-xl rounded-card border border-line bg-white p-6">
      <h1 className="mb-4 text-2xl">Invitación para compartir</h1>
      {!valid ? (
        <p>Este enlace no es válido. Pedí una invitación nueva.</p>
      ) : account.isPending ? (
        <p role="status">Revisando tu cuenta…</p>
      ) : account.isError ? (
        <div role="alert">
          <p className="mb-4 text-sm text-danger">
            No pudimos verificar tu cuenta.
          </p>
          <Button onClick={() => void account.refetch()}>Reintentar</Button>
        </div>
      ) : !account.data ? (
        <>
          <p className="mb-5 text-sm leading-relaxed text-muted">
            Ingresá con Google usando el mismo email que recibió la invitación.
            Después podrás revisarla y decidir si querés conectar.
          </p>
          <Link
            className="inline-flex min-h-11 items-center rounded-lg bg-brand px-4 font-semibold text-white"
            to={`/acceso?volver=${encodeURIComponent("/invitacion#" + params.toString())}`}
          >
            Ingresar para revisar
          </Link>
        </>
      ) : preview.isPending ? (
        <p role="status">Revisando invitación…</p>
      ) : preview.isError ? (
        <>
          <p className="mb-4 text-sm text-danger">
            {preview.error instanceof ApiError &&
            [404, 409].includes(preview.error.status)
              ? "La invitación venció, ya se usó o corresponde a otro email."
              : "No pudimos revisar la invitación. Intentá de nuevo."}
          </p>
          <Button variant="ghost" onClick={() => void preview.refetch()}>
            Reintentar
          </Button>
          <Link to="/compartidos" className="text-brand underline">
            Ver mis invitaciones
          </Link>
        </>
      ) : preview.data ? (
        <>
          <p className="mb-4">
            {preview.data.inviterName} te invitó a conectar en GastApp.
          </p>
          <p className="mb-5 text-sm leading-relaxed text-muted">
            Verán exclusivamente los gastos que compartan, incluido su
            historial. Aceptar no crea deudas ni marca pagos.
          </p>
          <Button onClick={() => accept.mutate()} disabled={accept.isPending}>
            {accept.isPending ? "Conectando…" : "Aceptar invitación"}
          </Button>
          {accept.isError && (
            <p role="alert" className="mt-3 text-sm text-danger">
              No pudimos aceptar. La invitación puede haber cambiado; actualizá
              para revisarla.
            </p>
          )}
        </>
      ) : null}
    </div>
  );
  return account.data ? (
    <Workspace>{() => message}</Workspace>
  ) : (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-10">
        <Brand />
      </div>
      {message}
    </main>
  );
}
