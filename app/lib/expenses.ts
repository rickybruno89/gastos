import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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

const monthKey = (userId: string, period: string) => ["months", userId, period];

export function useMonth(userId: string, period: string) {
  return useQuery({
    queryKey: monthKey(userId, period),
    queryFn: () => request(`/months/${period}`, monthSchema),
    staleTime: 10_000,
  });
}

// Cada llamada a mutate() representa una intención: genera su propia clave.
function useExpenseMutation<V, T>(
  userId: string,
  operation: (variables: V, idempotencyKey: string) => Promise<T>,
) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => operation(variables, crypto.randomUUID()),
    onSettled: (_data, error) => {
      // Un conflicto o un cambio de regla puede afectar otros meses ya cargados.
      void client.invalidateQueries({ queryKey: ["months", userId] });
      if (error instanceof ApiError && error.status === 401)
        void client.invalidateQueries({ queryKey: ["account"] });
    },
  });
}

export function useCreateExpense(userId: string) {
  return useExpenseMutation(
    userId,
    (body: z.infer<typeof createMonthlyExpenseSchema>, idempotencyKey) =>
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

export function useTogglePayment(userId: string) {
  return useExpenseMutation(userId, (occurrence: Occurrence, idempotencyKey) =>
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
  );
}

export function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "No pudimos completar la operación. Revisá tu conexión e intentá de nuevo.";
}
