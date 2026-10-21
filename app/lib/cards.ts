import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { z } from "zod";
import {
  cardListSchema,
  cardMonthSchema,
  statementSchema,
} from "../../shared/contracts/cards";
import { request, send } from "../../shared/api-client";
export function useCards(userId: string) {
  return useQuery({
    queryKey: ["cards", userId],
    queryFn: () => request("/cards", cardListSchema),
  });
}
export function useCardMonth(userId: string, period: string) {
  return useQuery({
    queryKey: ["card-months", userId, period],
    queryFn: () => request(`/card-months/${period}`, cardMonthSchema),
    staleTime: 10000,
  });
}
export function useCardStatement(
  userId: string,
  cardId: string | null,
  period: string,
) {
  return useQuery({
    queryKey: ["card-statements", userId, cardId, period],
    queryFn: () =>
      request(`/cards/${cardId}/statements/${period}`, statementSchema),
    enabled: !!cardId,
    staleTime: 10000,
  });
}
export function useCardWrite<T>(userId: string, schema: z.ZodType<T>) {
  const client = useQueryClient();
  return useMutation({
    mutationFn: (v: {
      path: string;
      body: unknown;
      method?: "POST" | "PATCH";
    }) =>
      send(v.path, schema, {
        method: v.method ?? "POST",
        body: v.body,
        idempotencyKey: crypto.randomUUID(),
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
