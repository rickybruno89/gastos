import { useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Check, Globe2, LockKeyhole, UserRound } from "lucide-react";
import { Workspace } from "../components/workspace";
import { Badge, Button } from "../components/ui";
import { GoogleMark } from "../components/brand";
import { request } from "../../shared/api-client";
import type { CurrentUser } from "../../shared/contracts/account";

const zones: Record<string, string> = {
  "America/Argentina/Tucuman": "Tucumán, Argentina",
  "America/Argentina/Buenos_Aires": "Buenos Aires, Argentina",
  "America/Montevideo": "Montevideo, Uruguay",
  "America/Santiago": "Santiago, Chile",
  "America/Sao_Paulo": "São Paulo, Brasil",
  "America/New_York": "Nueva York, Estados Unidos",
  "Europe/Madrid": "Madrid, España",
  UTC: "Tiempo universal (UTC)",
};
function Preferences({ user }: { user: CurrentUser }) {
  const [timeZone, setTimeZone] = useState(user.preferences.timeZone);
  const client = useQueryClient();
  const save = useMutation({
    mutationFn: () =>
      request(
        "/me/preferences",
        z.object({ timeZone: z.string(), locale: z.string() }),
        { method: "PATCH", body: JSON.stringify({ timeZone }) },
      ),
    onSuccess: () => client.invalidateQueries({ queryKey: ["account"] }),
  });
  function submit(event: FormEvent) {
    event.preventDefault();
    save.mutate();
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">A TU MANERA</p>
          <h1>Tu cuenta</h1>
          <p className="page-description">
            Un espacio personal, con tus preferencias.
          </p>
        </div>
      </div>
      <div className="settings-layout">
        <div>
          <section className="card settings-card">
            <header>
              <span className="tile-icon blue">
                <UserRound size={21} />
              </span>
              <div>
                <h2>Información personal</h2>
                <p>Los datos de tu cuenta de Google.</p>
              </div>
            </header>
            <dl className="profile-details">
              <div>
                <dt>Nombre</dt>
                <dd>{user.name}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{user.email}</dd>
              </div>
              <div>
                <dt>Forma de ingreso</dt>
                <dd className="provider">
                  <GoogleMark />
                  Google<Badge tone="green">Conectado</Badge>
                </dd>
              </div>
            </dl>
          </section>
          <form className="card settings-card" onSubmit={submit}>
            <header>
              <span className="tile-icon purple">
                <Globe2 size={21} />
              </span>
              <div>
                <h2>Fechas y períodos</h2>
                <p>Para que cada fecha esté en su lugar.</p>
              </div>
            </header>
            <div className="form-field">
              <label htmlFor="time-zone">Zona horaria</label>
              <select
                id="time-zone"
                value={timeZone}
                onChange={(event) => {
                  setTimeZone(event.target.value);
                  save.reset();
                }}
              >
                {[
                  ...new Set([
                    user.preferences.timeZone,
                    ...Object.keys(zones),
                  ]),
                ].map((zone) => (
                  <option key={zone} value={zone}>
                    {zones[zone] ?? zone.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
              <span className="field-help">
                Usamos esta zona horaria para mostrar las fechas de tu cuenta.
              </span>
            </div>
            <div className="form-actions">
              <Button
                disabled={
                  save.isPending || timeZone === user.preferences.timeZone
                }
                type="submit"
              >
                {save.isPending ? "Guardando…" : "Guardar cambios"}
              </Button>
              {save.isSuccess && (
                <p className="success-message" role="status">
                  <Check size={16} />
                  Preferencias guardadas.
                </p>
              )}
              {save.isError && (
                <p className="error-message" role="alert">
                  No pudimos guardar los cambios. Intentá nuevamente.
                </p>
              )}
            </div>
          </form>
        </div>
        <aside className="account-aside">
          <span className="tile-icon green">
            <LockKeyhole size={23} />
          </span>
          <h3>Tu espacio es privado</h3>
          <p>
            Conectar con alguien no le da acceso a toda tu cuenta. Vos elegís
            qué gastos compartir.
          </p>
        </aside>
      </div>
    </>
  );
}
export default function Account() {
  return <Workspace>{(user) => <Preferences user={user} />}</Workspace>;
}
