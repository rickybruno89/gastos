import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeMutation } from "./mutation";
import type { z } from "zod";
import {
  debtDetailSchema,
  debtListSchema,
  type DebtDetail,
  type createDebtSchema,
  type updateDebtSchema,
} from "../../shared/contracts/debts";
import { request, send } from "../../shared/api-client";

export function useDebts(userId: string) {
  return useQuery({
    queryKey: ["debts", userId],
    queryFn: () => request("/debts", debtListSchema),
  });
}
export function useDebt(userId: string, id: string | null) {
  return useQuery({
    queryKey: ["debts", userId, id],
    queryFn: () => request(`/debts/${id}`, debtDetailSchema),
    enabled: id !== null,
  });
}

export type DebtAction =
  | { action: "payments"; amountMinor: string; paidOn: string; note?: string }
  | {
      action: "adjustments";
      kind: "INCREASE" | "FORGIVE";
      amountMinor: string;
      effectiveOn: string;
      reason: string;
    }
  | { action: "cancel"; reason: string }
  | { action: "reopen" }
  | { action: "undo"; paymentId: string };

function useDebtMutation<V>(
  userId: string,
  operation: (variables: V, idempotencyKey: string) => Promise<DebtDetail>,
) {
  const client = useQueryClient();
  return useSafeMutation({
    idempotent: operation,
    onSuccess: (debt) => client.setQueryData(["debts", userId, debt.id], debt),
    onSettled: () =>
      void client.invalidateQueries({ queryKey: ["debts", userId] }),
  });
}

export function useCreateDebt(userId: string) {
  return useDebtMutation(
    userId,
    (body: z.input<typeof createDebtSchema>, idempotencyKey) =>
      send("/debts", debtDetailSchema, {
        method: "POST",
        body,
        idempotencyKey,
      }),
  );
}
export function useUpdateDebt(userId: string) {
  return useDebtMutation(
    userId,
    (
      {
        debt,
        ...body
      }: { debt: DebtDetail } & Omit<
        z.input<typeof updateDebtSchema>,
        "version"
      >,
      idempotencyKey,
    ) =>
      send(`/debts/${debt.id}`, debtDetailSchema, {
        method: "PATCH",
        body: { version: debt.version, ...body },
        idempotencyKey,
      }),
  );
}
// Pagos, ajustes, cancelar, reabrir y deshacer: POST con la versión de la deuda.
export function useDebtAction(userId: string) {
  return useDebtMutation(
    userId,
    (
      {
        debt,
        action: { action, ...body },
      }: { debt: DebtDetail; action: DebtAction },
      idempotencyKey,
    ) => {
      const path =
        action === "undo" && "paymentId" in body
          ? `/debts/${debt.id}/payments/${body.paymentId}/undo`
          : `/debts/${debt.id}/${action}`;
      const payload =
        action === "undo" ? {} : (body as Record<string, unknown>);
      return send(path, debtDetailSchema, {
        method: "POST",
        body: { version: debt.version, ...payload },
        idempotencyKey,
      });
    },
  );
}
