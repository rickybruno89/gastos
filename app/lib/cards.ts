import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeMutation } from "./mutation";
import type { z } from "zod";
import {
  cardListSchema,
  cardMonthSchema,
  statementSchema,
} from "../../shared/contracts/cards";
import { request, send } from "../../shared/api-client";
import { usePrefetchNeighbors } from "./prefetch";
export function useCards(userId: string) {
  return useQuery({
    queryKey: ["cards", userId],
    queryFn: () => request("/cards", cardListSchema),
  });
}
const cardMonthQuery = (userId: string, period: string) => ({
  queryKey: ["card-months", userId, period],
  queryFn: () => request(`/card-months/${period}`, cardMonthSchema),
});
export function useCardMonth(userId: string, period: string) {
  const month = useQuery({
    ...cardMonthQuery(userId, period),
    staleTime: 10000,
  });
  usePrefetchNeighbors(period, month.isSuccess, (p) =>
    cardMonthQuery(userId, p),
  );
  return month;
}
const statementQuery = (
  userId: string,
  cardId: string | null,
  period: string,
) => ({
  queryKey: ["card-statements", userId, cardId, period],
  queryFn: () =>
    request(`/cards/${cardId}/statements/${period}`, statementSchema),
});
export function useCardStatement(
  userId: string,
  cardId: string | null,
  period: string,
) {
  const statement = useQuery({
    ...statementQuery(userId, cardId, period),
    enabled: !!cardId,
    staleTime: 10000,
  });
  usePrefetchNeighbors(period, !!cardId && statement.isSuccess, (p) =>
    statementQuery(userId, cardId, p),
  );
  return statement;
}
export function useCardWrite<T>(userId: string, schema: z.ZodType<T>) {
  const client = useQueryClient();
  return useSafeMutation({
    idempotent: (
      v: { path: string; body: unknown; method?: "POST" | "PATCH" },
      idempotencyKey: string,
    ) =>
      send(v.path, schema, {
        method: v.method ?? "POST",
        body: v.body,
        idempotencyKey,
      }),
    onSettled: () => {
      for (const key of [
        "cards",
        "card-months",
        "card-statements",
        "shared",
        "months",
      ])
        void client.invalidateQueries({ queryKey: [key, userId] });
    },
  });
}
