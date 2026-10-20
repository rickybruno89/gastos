import { z } from "zod";

// Validar los DTO también debe funcionar con la CSP del navegador, sin eval.
z.config({ jitless: true });

export const timeZoneSchema = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => {
    try {
      new Intl.DateTimeFormat("es-AR", { timeZone: value });
      return true;
    } catch {
      return false;
    }
  }, "Elegí una zona horaria válida.");
export const preferencesInputSchema = z
  .object({ timeZone: timeZoneSchema })
  .strict();
export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
  image: z.string().nullable(),
  preferences: z.object({ timeZone: timeZoneSchema, locale: z.string() }),
});
export const publicConfigSchema = z.object({
  googleSignInEnabled: z.boolean(),
});
export type CurrentUser = z.infer<typeof currentUserSchema>;
