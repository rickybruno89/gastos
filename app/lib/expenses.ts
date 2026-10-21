import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeMutation } from "./mutation";
import { z } from "zod";
import {
  monthSchema,
  monthlyExpenseSchema,
  occurrenceSchema,
  type changeOccurrenceSchema,
  type createMonthlyExpenseSchema,
  type Occurrence,
} from "../../shared/contracts/expenses";
import { ApiError, request, send } from "../../shared/api-client";
import { usePrefetchNeighbors } from "./prefetch";

const monthKey = (userId: string, period: string) => ["months", userId, period];

const monthQuery = (userId: string, period: string) => ({
  queryKey: monthKey(userId, period),
  queryFn: () => request(`/months/${period}`, monthSchema),
});

export function useMonth(userId: string, period: string) {
  const month = useQuery({ ...monthQuery(userId, period), staleTime: 10_000 });
  usePrefetchNeighbors(period, month.isSuccess, (p) => monthQuery(userId, p));
  return month;
}

type Month = z.infer<typeof monthSchema>;

// Cada intención tiene su clave de idempotencia (reusada solo al reintentar lo mismo).
function useExpenseMutation<V, T, C = unknown>(
  userId: string,
  operation: (variables: V, idempotencyKey: string) => Promise<T>,
  extra: {
    lockKey?: (variables: V) => string;
    onMutate?: (variables: V) => Promise<C> | C;
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: Error, variables: V, context: C | undefined) => void;
  } = {},
) {
  const client = useQueryClient();
  return useSafeMutation<T, V>({
    idempotent: operation,
    lockKey: extra.lockKey,
    onMutate: extra.onMutate,
    onSuccess:
      extra.onSuccess &&
      ((data, variables) => extra.onSuccess!(data, variables)),
    onError:
      extra.onError &&
      ((error, variables, context) =>
        extra.onError!(error, variables, context as C | undefined)),
    onSettled: (_data, error) => {
      // Un conflicto o un cambio de regla puede afectar otros meses ya cargados.
      void client.invalidateQueries({ queryKey: ["months", userId] });
      void client.invalidateQueries({ queryKey: ["shared", userId] });
      if (error instanceof ApiError && error.status === 401)
        void client.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useCreateExpense(userId: string) {
  return useExpenseMutation(
    userId,
    (body: z.input<typeof createMonthlyExpenseSchema>, idempotencyKey) =>
      send("/expenses", monthlyExpenseSchema, {
        method: "POST",
        body,
        idempotencyKey,
      }),
  );
}

export function useChangeOccurrence(userId: string) {
  return useExpenseMutation(
    userId,
    (
      {
        occurrence,
        ...body
      }: { occurrence: Occurrence } & Omit<
        z.infer<typeof changeOccurrenceSchema>,
        "version"
      >,
      idempotencyKey,
    ) =>
      send(`/occurrences/${occurrence.id}`, occurrenceSchema, {
        method: "PATCH",
        body: { version: occurrence.version, ...body },
        idempotencyKey,
      }),
  );
}

// Pagar o deshacer se ve al instante; si el servidor rechaza, se restaura el mes.
// El bloqueo es por gasto: no se puede deshacer antes de que llegue la nueva
// versión, pero sí pagar otro gasto en paralelo. Un pago anual no se simula
// porque deshacerlo afecta otros meses.
export function useTogglePayment(userId: string) {
  const client = useQueryClient();
  return useExpenseMutation(
    userId,
    (occurrence: Occurrence, idempotencyKey) =>
      send(
        occurrence.status === "PAID"
          ? `/occurrences/${occurrence.id}/undo-payment`
          : `/occurrences/${occurrence.id}/payments`,
        occurrenceSchema,
        {
          method: "POST",
          body: { version: occurrence.version },
          idempotencyKey,
        },
      ),
    {
      lockKey: (occurrence) => occurrence.id,
      onMutate: async (occurrence) => {
        if (occurrence.payment?.annual) return undefined;
        const key = monthKey(userId, occurrence.period);
        await client.cancelQueries({ queryKey: key });
        const previous = client.getQueryData<Month>(key);
        if (previous)
          client.setQueryData<Month>(key, togglePaid(previous, occurrence));
        return { key, previous };
      },
      onSuccess: (updated) =>
        client.setQueryData<Month>(
          monthKey(userId, updated.period),
          (month) =>
            month && {
              ...month,
              occurrences: month.occurrences.map((o) =>
                o.id === updated.id ? updated : o,
              ),
            },
        ),
      onError: (_error, _occurrence, context) => {
        if (context?.previous)
          client.setQueryData(context.key, context.previous);
      },
    },
  );
}

export function togglePaid(month: Month, occurrence: Occurrence): Month {
  const paying = occurrence.status !== "PAID";
  const amount = BigInt(
    paying
      ? occurrence.amountMinor
      : (occurrence.payment?.amountMinor ?? occurrence.amountMinor),
  );
  return {
    ...month,
    occurrences: month.occurrences.map((o) =>
      o.id !== occurrence.id
        ? o
        : {
            ...o,
            status: paying ? "PAID" : "PLANNED",
            payment: paying
              ? {
                  paidOn: month.today,
                  channel: null,
                  amountMinor: occurrence.amountMinor,
                  annual: false,
                }
              : null,
          },
    ),
    totals: month.totals.map((t) =>
      t.currency !== occurrence.currency
        ? t
        : {
            ...t,
            pendingMinor: (
              BigInt(t.pendingMinor) + (paying ? -amount : amount)
            ).toString(),
            paidMinor: (
              BigInt(t.paidMinor) + (paying ? amount : -amount)
            ).toString(),
          },
    ),
  };
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "No pudimos completar la operación. Revisá tu conexión e intentá de nuevo.";
}

export function useRenameExpense(userId: string) {
  return useExpenseMutation(
    userId,
    (
      { occurrence, name }: { occurrence: Occurrence; name: string },
      idempotencyKey,
    ) =>
      send(`/expenses/${occurrence.seriesId}`, monthlyExpenseSchema, {
        method: "PATCH",
        body: { version: occurrence.seriesVersion, name },
        idempotencyKey,
      }),
  );
}

export type OccurrenceAction =
  | { action: "skip" | "cancel"; reason: string }
  | { action: "restore" }
  | { action: "annual-payments"; months: number; amountMinor: string };

// Omitir, dar de baja, restaurar y pago anual comparten forma: POST con versión.
export function useOccurrenceAction(userId: string) {
  return useExpenseMutation(
    userId,
    (
      {
        occurrence,
        action: { action, ...body },
      }: { occurrence: Occurrence; action: OccurrenceAction },
      idempotencyKey,
    ) =>
      send(`/occurrences/${occurrence.id}/${action}`, occurrenceSchema, {
        method: "POST",
        body: { version: occurrence.version, ...body },
        idempotencyKey,
      }),
  );
}
