import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeMutation } from "./mutation";
import { z } from "zod";
import {
  contactSchema,
  invitationSchema,
  sharedMonthSchema,
  type ShareInput,
  type createContactSchema,
  type updateContactSchema,
} from "../../shared/contracts/sharing";
import {
  occurrenceSchema,
  type Occurrence,
} from "../../shared/contracts/expenses";
import { request, send } from "../../shared/api-client";
import { usePrefetchNeighbors } from "./prefetch";

export function useContacts(userId: string) {
  return useQuery({
    queryKey: ["contacts", userId],
    queryFn: () => request("/contacts", z.array(contactSchema)),
  });
}
export function useInvitations(userId: string) {
  return useQuery({
    queryKey: ["invitations", userId],
    queryFn: () => request("/invitations", z.array(invitationSchema)),
    // Sin realtime: las invitaciones nuevas aparecen al volver a la pestaña o cada minuto.
    refetchInterval: 60_000,
  });
}
const sharedQuery = (userId: string, period: string) => ({
  queryKey: ["shared", userId, period],
  queryFn: () => request(`/shared/${period}`, sharedMonthSchema),
});
export function useSharedMonth(userId: string, period: string) {
  const shared = useQuery({
    ...sharedQuery(userId, period),
    staleTime: 10_000,
  });
  usePrefetchNeighbors(period, shared.isSuccess, (p) => sharedQuery(userId, p));
  return shared;
}

// Contactos, conexiones y repartos afectan meses, saldos y listas: se invalidan juntos.
function useSharingMutation<V, T>(
  userId: string,
  operation: (variables: V, idempotencyKey: string) => Promise<T>,
) {
  const client = useQueryClient();
  return useSafeMutation({
    idempotent: operation,
    onSettled: () => {
      for (const key of ["contacts", "invitations", "shared", "months"])
        void client.invalidateQueries({ queryKey: [key, userId] });
    },
  });
}

export function useCreateContact(userId: string) {
  return useSharingMutation(
    userId,
    (body: z.input<typeof createContactSchema>, idempotencyKey) =>
      send("/contacts", contactSchema, {
        method: "POST",
        body,
        idempotencyKey,
      }),
  );
}
export function useUpdateContact(userId: string) {
  return useSharingMutation(
    userId,
    (
      { id, ...body }: { id: string } & z.input<typeof updateContactSchema>,
      idempotencyKey,
    ) =>
      send(`/contacts/${id}`, contactSchema, {
        method: "PATCH",
        body,
        idempotencyKey,
      }),
  );
}
export function useConnectionAction(userId: string) {
  return useSharingMutation(
    userId,
    (
      {
        action,
        id,
      }: {
        action: "invite" | "accept" | "reject" | "disconnect";
        id: string;
      },
      idempotencyKey,
    ) =>
      send(
        action === "invite"
          ? `/contacts/${id}/invitation`
          : action === "disconnect"
            ? `/connections/${id}/disconnect`
            : `/invitations/${id}/${action}`,
        z.unknown(),
        { method: "POST", body: {}, idempotencyKey },
      ),
  );
}
export function useChangeShares(userId: string) {
  return useSharingMutation(
    userId,
    (
      { occurrence, shares }: { occurrence: Occurrence; shares: ShareInput },
      idempotencyKey,
    ) =>
      send(`/occurrences/${occurrence.id}/shares`, occurrenceSchema, {
        method: "PUT",
        body: { version: occurrence.version, shares },
        idempotencyKey,
      }),
  );
}
