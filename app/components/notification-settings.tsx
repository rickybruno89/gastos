import { useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSafeMutation } from "../lib/mutation";
import { Bell } from "lucide-react";
import { request, send } from "../../shared/api-client";
import {
  notificationPreferenceSchema,
  type notificationPreferenceInput,
} from "../../shared/contracts/notifications";
import type { z } from "zod";
import { Button, FormField, Skeleton } from "./ui";
export function NotificationSettings({ userId }: { userId: string }) {
  const prefs = useQuery({
    queryKey: ["notification-preferences", userId],
    queryFn: () => request("/me/notifications", notificationPreferenceSchema),
  });
  const client = useQueryClient(),
    [error, setError] = useState("");
  const save = useSafeMutation({
    idempotent: (
      body: z.infer<typeof notificationPreferenceInput>,
      idempotencyKey: string,
    ) =>
      send("/me/notifications", notificationPreferenceSchema, {
        method: "PUT",
        body,
        idempotencyKey,
      }),
    onSuccess: (data) => {
      client.setQueryData(["notification-preferences", userId], data);
      setError("");
    },
    onError: () =>
      setError("No pudimos guardar los avisos. Actualizá e intentá de nuevo."),
  });
  function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!prefs.data) return;
    const d = new FormData(e.currentTarget);
    save.mutate({
      version: prefs.data.version,
      emailEnabled: d.has("emailEnabled"),
      monthly: d.has("monthly"),
      cards: d.has("cards"),
      debts: d.has("debts"),
      daysBefore: Number(d.get("daysBefore")),
    });
  }
  return (
    <section className="mb-6 rounded-card border border-line bg-white p-5.5">
      <header className="mb-5 flex items-center gap-3">
        <span className="inline-grid size-10 place-content-center rounded-xl bg-brand-soft text-brand">
          <Bell size={21} />
        </span>
        <div>
          <h2>Avisos por correo</h2>
          <p className="mt-1 text-sm text-muted">
            Elegí qué vencimientos querés recordar.
          </p>
        </div>
      </header>
      {prefs.isPending ? (
        <div role="status" className="grid gap-3">
          <span className="sr-only">Cargando avisos…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="size-5 shrink-0 rounded-[5px]" />
              <Skeleton className="h-3.5 w-1/2" />
            </div>
          ))}
        </div>
      ) : prefs.isError ? (
        <div role="alert">
          <p>No pudimos cargar tus preferencias.</p>
          <Button variant="ghost" onClick={() => void prefs.refetch()}>
            Reintentar
          </Button>
        </div>
      ) : (
        <form key={prefs.data.version} onSubmit={submit}>
          {!prefs.data.emailAvailable && (
            <p className="mb-4 text-sm text-muted">
              Los avisos por correo no están disponibles en este momento. Podés
              dejar guardadas tus preferencias.
            </p>
          )}
          <label className="mb-4 flex min-h-11 items-center gap-3 text-sm font-semibold">
            <input
              type="checkbox"
              name="emailEnabled"
              defaultChecked={prefs.data.emailEnabled}
              className="size-4 accent-brand"
            />
            Recibir recordatorios por email
          </label>
          <fieldset className="mb-4 grid min-w-0 gap-2 border-0 p-0">
            <legend className="mb-2 text-sm font-medium">
              Qué querés recordar
            </legend>
            {[
              ["monthly", "Gastos mensuales y bimestrales"],
              ["cards", "Resúmenes de tarjeta"],
              ["debts", "Deudas por cobrar y por pagar"],
            ].map(([name, label]) => (
              <label
                key={name}
                className="flex min-h-11 items-center gap-3 text-sm"
              >
                <input
                  type="checkbox"
                  name={name}
                  defaultChecked={
                    prefs.data[name as "monthly" | "cards" | "debts"]
                  }
                  className="size-4 accent-brand"
                />
                {label}
              </label>
            ))}
          </fieldset>
          <FormField>
            <label htmlFor="reminder-days">Avisar desde</label>
            <select
              id="reminder-days"
              name="daysBefore"
              defaultValue={prefs.data.daysBefore}
            >
              {Array.from({ length: 15 }, (_, n) => n).map((n) => (
                <option key={n} value={n}>
                  {n === 0
                    ? "El día del vencimiento"
                    : `${n} ${n === 1 ? "día antes" : "días antes"}`}
                </option>
              ))}
            </select>
          </FormField>
          <p className="mb-4 text-sm leading-relaxed text-muted">
            Un correo diario desde las 9, en el horario de tu dispositivo, hasta
            el día del vencimiento. Solo incluye lo que siga pendiente. Podés
            desactivarlo cuando quieras.
          </p>
          <Button type="submit" loading={save.isPending}>
            {save.isPending ? "Guardando…" : "Guardar avisos"}
          </Button>
          {save.isSuccess && !error && (
            <p role="status" className="mt-3 text-sm text-success">
              Preferencias guardadas.
            </p>
          )}
          {error && (
            <p role="alert" className="mt-3 text-sm text-danger">
              {error}
            </p>
          )}
        </form>
      )}
    </section>
  );
}
