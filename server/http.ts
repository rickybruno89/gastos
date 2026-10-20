import type { z } from "zod";

export class HttpError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success)
    throw new HttpError(
      400,
      "VALIDATION_ERROR",
      "Revisá los datos enviados e intentá nuevamente.",
    );
  return result.data;
}
