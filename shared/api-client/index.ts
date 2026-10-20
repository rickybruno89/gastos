import type { z } from "zod";
export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code = "UNKNOWN",
  ) {
    super(message);
  }
}
export async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`/api/v2${path}`, {
    ...options,
    credentials: "same-origin",
    headers: { "Content-Type": "application/json", ...options?.headers },
  });
  const body = await response.json();
  if (!response.ok)
    throw new ApiError(
      body.error?.message ?? "No pudimos completar la solicitud.",
      response.status,
      body.error?.code,
    );
  return schema.parse(body.data);
}
// Las mutaciones financieras llevan una clave por intención del usuario:
// reintentar con la misma clave nunca duplica la operación.
export function send<T>(
  path: string,
  schema: z.ZodType<T>,
  options: { method: "POST" | "PATCH"; body: unknown; idempotencyKey: string },
) {
  return request(path, schema, {
    method: options.method,
    body: JSON.stringify(options.body),
    headers: { "Idempotency-Key": options.idempotencyKey },
  });
}
