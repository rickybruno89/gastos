import pg from "pg";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import type { AppConfig } from "../config";
import type { Databases } from "../persistence/database";
import { invitationToken, validToken } from "./invitation-token";
import { createMailSender, type MailSender } from "./mail";
import {
  reminderItems,
  reminderWindow,
  type ReminderPreference,
} from "./reminders";
import { DEFAULT_TIME_ZONE } from "../../shared/domain/periods";
const invitationPayload = z.object({
  connectionId: z.uuid(),
  inviterName: z.string().max(120),
});
const reminderPayload = z.object({ localDate: z.iso.date() });
type Job = {
  id: string;
  ownerId: string;
  kind: string;
  payload: unknown;
  attempts: number;
  leaseToken: string;
};
type Recipient = ReminderPreference & {
  id: string;
  email: string;
  emailVerified: boolean;
  timeZone: string;
};
export function workerPool(config: AppConfig) {
  if (!config.workerDatabaseUrl)
    throw new Error("Configurá WORKER_DATABASE_URL con el rol gastapp_worker.");
  return new pg.Pool({
    connectionString: config.workerDatabaseUrl,
    max: 2,
    options: "-c timezone=UTC",
  });
}
async function recipients(pool: pg.Pool, after = "", id?: string) {
  return (
    await pool.query<Recipient>(
      `SELECT u.id,u.email,u."emailVerified",COALESCE(p."timeZone",$1) AS "timeZone",n."emailEnabled",n.monthly,n.cards,n.debts,n."daysBefore" FROM auth."user" u JOIN public."NotificationPreference" n ON n."userId"=u.id LEFT JOIN public."UserPreferences" p ON p."userId"=u.id WHERE n."emailEnabled" AND u."emailVerified" AND u.id>$2 AND ($3::text IS NULL OR u.id=$3) ORDER BY u.id LIMIT 100`,
      [DEFAULT_TIME_ZONE, after, id ?? null],
    )
  ).rows;
}
export function retryAt(attempts: number, now: Date) {
  return new Date(
    now.getTime() + Math.min(3600, 60 * 2 ** (attempts - 1)) * 1000,
  );
}
export async function scheduleReminders(
  pool: pg.Pool,
  databases: Databases,
  now = new Date(),
) {
  let after = "",
    queued = 0;
  for (;;) {
    const users = await recipients(pool, after);
    if (!users.length) break;
    for (const user of users) {
      if (!user.emailEnabled || !user.emailVerified) continue;
      const window = reminderWindow(user.timeZone, user.daysBefore, now);
      if (window.hour < 9) continue;
      const key = `reminder:${user.id}:${window.today}`;
      if (
        (
          await pool.query(
            'SELECT id FROM public."NotificationJob" WHERE "dedupeKey"=$1',
            [key],
          )
        ).rowCount
      )
        continue;
      if (
        !(await reminderItems(databases, user.id, user, user.timeZone, now))
          .length
      )
        continue;
      queued +=
        (
          await pool.query(
            `INSERT INTO public."NotificationJob"(id,"ownerId",kind,"dedupeKey",payload,"nextAttemptAt") VALUES($1,$2,'REMINDER',$3,$4,$5) ON CONFLICT("dedupeKey") DO NOTHING`,
            [
              randomUUID(),
              user.id,
              key,
              JSON.stringify({ localDate: window.today }),
              now,
            ],
          )
        ).rowCount ?? 0;
    }
    after = users.at(-1)!.id;
  }
  return queued;
}
export async function deliverBatch(
  pool: pg.Pool,
  databases: Databases,
  config: AppConfig,
  options: { now?: Date; send?: MailSender; limit?: number } = {},
) {
  if (config.mail.mode === "disabled")
    return { sent: 0, cancelled: 0, failed: 0 };
  let now = options.now ?? new Date();
  const send = options.send ?? createMailSender(config),
    stats = { sent: 0, cancelled: 0, failed: 0 };
  await pool.query(
    `UPDATE public."NotificationJob" SET status='DEAD',"lastError"='LEASE_EXHAUSTED',"leaseToken"=NULL,"leaseUntil"=NULL WHERE status='PENDING' AND attempts>=5 AND ("leaseUntil" IS NULL OR "leaseUntil"<$1)`,
    [now],
  );
  for (let i = 0; i < (options.limit ?? 20); i++) {
    now = options.now ?? new Date();
    const claim = randomUUID();
    const job = (
      await pool.query<Job>(
        `UPDATE public."NotificationJob" SET "leaseToken"=$1,"leaseUntil"=$2,attempts=attempts+1 WHERE id=(SELECT id FROM public."NotificationJob" WHERE status='PENDING' AND attempts<5 AND "nextAttemptAt"<=$3 AND ("leaseUntil" IS NULL OR "leaseUntil"<$3) ORDER BY "nextAttemptAt",id FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`,
        [claim, new Date(now.getTime() + 120_000), now],
      )
    ).rows[0];
    if (!job) break;
    try {
      let mail: { to: string; subject: string; text: string } | null = null;
      if (job.kind === "INVITATION") {
        const payload = invitationPayload.parse(job.payload);
        const row = (
          await pool.query<{
            inviteeEmail: string;
            expiresAt: Date;
            status: string;
            invitationTokenHash: string | null;
          }>(
            `SELECT "inviteeEmail","expiresAt",status,"invitationTokenHash" FROM public."UserConnection" WHERE id=$1 AND "inviterId"=$2`,
            [payload.connectionId, job.ownerId],
          )
        ).rows[0];
        const token = invitationToken(payload.connectionId, config.authSecret);
        if (
          row &&
          row.status === "PENDING" &&
          row.expiresAt > now &&
          validToken(token, row.invitationTokenHash)
        ) {
          const link = `${config.origin}/invitacion#id=${payload.connectionId}&token=${token}`;
          mail = {
            to: row.inviteeEmail,
            subject: "Te invitaron a compartir gastos en GastApp",
            text: `${payload.inviterName} te invita a compartir gastos en GastApp.\n\nIngresá con Google usando este mismo email y revisá la invitación:\n${link}\n\nEl enlace vence el ${row.expiresAt.toISOString().slice(0, 10)} y solo puede aceptarse una vez. Conectarse permite ver exclusivamente lo compartido, con su historial. No crea deudas ni salda gastos. Si no esperabas esta invitación, podés ignorarla.`,
          };
        }
      } else {
        const payload = reminderPayload.parse(job.payload),
          user = (await recipients(pool, "", job.ownerId))[0];
        if (
          user?.emailEnabled &&
          user.emailVerified &&
          reminderWindow(user.timeZone, user.daysBefore, now).today ===
            payload.localDate
        ) {
          const items = await reminderItems(
            databases,
            user.id,
            user,
            user.timeZone,
            now,
          );
          if (items.length)
            mail = {
              to: user.email,
              subject: "Tus próximos vencimientos en GastApp",
              text: `Estos vencimientos siguen pendientes:\n\n${items
                .slice(0, 100)
                .map(
                  (item) =>
                    `${item.kind === "DEBT" && item.debtDirection === "RECEIVABLE" ? "Por cobrar" : "Por pagar"}: ${item.title} · ${item.dueOn}`,
                )
                .join(
                  "\n",
                )}\n\nRevisá el detalle actualizado en ${config.origin}/\nPodés desactivar estos avisos en ${config.origin}/cuenta. Los importes y monedas se consultan dentro de tu cuenta.`,
            };
        }
      }
      if (mail) await send({ id: job.id, ...mail });
      await pool.query(
        `UPDATE public."NotificationJob" SET status=$1,"sentAt"=$2,"leaseToken"=NULL,"leaseUntil"=NULL,"lastError"=NULL WHERE id=$3 AND "leaseToken"=$4`,
        [mail ? "SENT" : "CANCELLED", mail ? now : null, job.id, claim],
      );
      if (mail) stats.sent++;
      else stats.cancelled++;
    } catch {
      await pool.query(
        `UPDATE public."NotificationJob" SET status=$1,"nextAttemptAt"=$2,"lastError"='DELIVERY_FAILED',"leaseToken"=NULL,"leaseUntil"=NULL WHERE id=$3 AND "leaseToken"=$4`,
        [
          job.attempts >= 5 ? "DEAD" : "PENDING",
          retryAt(job.attempts, now),
          job.id,
          claim,
        ],
      );
      stats.failed++;
    }
  }
  return stats;
}
export async function cleanupIdempotency(pool: pg.Pool) {
  return (
    await pool.query(
      `DELETE FROM public."IdempotencyKey" WHERE ("ownerId",key) IN(SELECT "ownerId",key FROM public."IdempotencyKey" WHERE "createdAt"<now()-interval '30 days' LIMIT 1000)`,
    )
  ).rowCount;
}
