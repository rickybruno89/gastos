import { createServer, type Socket } from "node:net";
import { once } from "node:events";
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startTestApp } from "./harness";
import { inviteContact } from "../../server/application/sharing";
import { withUser } from "../../server/persistence/database";
import {
  workerPool,
  scheduleReminders,
  deliverBatch,
  cleanupIdempotency,
} from "../../server/jobs/worker";
import { invitationToken } from "../../server/jobs/invitation-token";
import { createMailSender } from "../../server/jobs/mail";
import type { Mail } from "../../server/jobs/mail";

test("notificaciones: outbox, permisos, enlaces y recordatorios durables", async (t) => {
  const h = await startTestApp(),
    pool = workerPool(h.config),
    dir = await mkdtemp(path.join(tmpdir(), "gastapp-mail-test-"));
  const config = { ...h.config, mail: { ...h.config.mail, captureDir: dir } };
  async function post(
    url: string,
    body: unknown = {},
    cookie = h.cookieA,
    key = randomUUID(),
    method = "POST",
  ) {
    const response = await h.call("/api/v2" + url, cookie, {
      method,
      headers: { origin: h.config.origin, "Idempotency-Key": key },
      body: JSON.stringify(body),
    });
    return { status: response.status, ...(await response.json()) };
  }
  async function get(url: string, cookie = h.cookieA) {
    const response = await h.call("/api/v2" + url, cookie);
    assert.equal(response.status, 200);
    return (await response.json()).data;
  }
  let connectionId = "",
    jobId = "",
    now = new Date();
  try {
    await t.test(
      "avisos desactivados por defecto, versiones, CSRF y aislamiento",
      async () => {
        const prefs = await get("/me/notifications");
        assert.equal(prefs.emailEnabled, false);
        assert.equal(
          (
            await post(
              "/me/notifications",
              { ...prefs, ownerId: h.userB.id },
              h.cookieA,
              randomUUID(),
              "PUT",
            )
          ).status,
          400,
        );
        const body = {
          version: prefs.version,
          emailEnabled: true,
          monthly: true,
          cards: true,
          debts: true,
          daysBefore: 3,
        };
        assert.equal(
          (
            await post(
              "/me/notifications",
              body,
              h.cookieA,
              randomUUID(),
              "PUT",
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await post(
              "/me/notifications",
              body,
              h.cookieA,
              randomUUID(),
              "PUT",
            )
          ).status,
          409,
        );
        assert.equal(
          (await get("/me/notifications", h.cookieB)).emailEnabled,
          false,
        );
        assert.deepEqual(
          await withUser(h.databases.app, h.userB.id, (tx) =>
            tx.notificationJob.findMany(),
          ),
          [],
        );
      },
    );
    await t.test(
      "invitación y correo atómicos, reintento idempotente sin token persistido",
      async () => {
        const contact = await post("/contacts", {
            nickname: "Juan",
            email: h.userB.email,
          }),
          key = randomUUID();
        const invite = await post(
          `/contacts/${contact.data.id}/invitation`,
          {},
          h.cookieA,
          key,
        );
        assert.equal(invite.status, 201);
        connectionId = invite.data.connection.id;
        assert.deepEqual(
          (
            await post(
              `/contacts/${contact.data.id}/invitation`,
              {},
              h.cookieA,
              key,
            )
          ).data,
          invite.data,
        );
        const jobs = await withUser(h.databases.app, h.userA.id, (tx) =>
          tx.notificationJob.findMany(),
        );
        assert.equal(jobs.length, 1);
        jobId = jobs[0].id;
        assert.equal(
          JSON.stringify(jobs[0].payload).includes(
            invitationToken(connectionId, h.config.authSecret),
          ),
          false,
        );
        assert.deepEqual(
          await withUser(h.databases.app, h.userB.id, (tx) =>
            tx.notificationJob.findMany(),
          ),
          [],
        );
      },
    );
    await t.test(
      "fallo SMTP reintentable y dos workers no envían el mismo job",
      async () => {
        now = new Date(Date.now() + 1000);
        assert.equal(
          (
            await deliverBatch(pool, h.databases, config, {
              now,
              send: async () => {
                throw new Error("simulado");
              },
            })
          ).failed,
          1,
        );
        const retry = (
          await pool.query(
            'SELECT status,attempts,"nextAttemptAt" FROM public."NotificationJob" WHERE id=$1',
            [jobId],
          )
        ).rows[0];
        assert.equal(retry.status, "PENDING");
        assert.equal(retry.attempts, 1);
        assert.equal(
          (await deliverBatch(pool, h.databases, config, { now })).sent,
          0,
        );
        const sent: Mail[] = [];
        const sender = createMailSender(config);
        const send = async (mail: Mail) => {
          sent.push(mail);
          await sender(mail);
        };
        now = new Date(retry.nextAttemptAt.getTime() + 1);
        const batches = await Promise.all([
          deliverBatch(pool, h.databases, config, { now, send }),
          deliverBatch(pool, h.databases, config, { now, send }),
        ]);
        assert.equal(
          batches.reduce((n, b) => n + b.sent, 0),
          1,
        );
        assert.equal(sent.length, 1);
        const eml = await readFile(path.join(dir, jobId + ".eml"), "utf8");
        assert.match(eml, /Message-ID:/i);
        assert.ok(sent[0].text.includes("/invitacion#id=" + connectionId));
        assert.equal(
          (await deliverBatch(pool, h.databases, config, { now, send })).sent,
          0,
        );
      },
    );
    await t.test(
      "enlace exige token, email verificado destinatario y se consume una vez",
      async () => {
        const token = invitationToken(connectionId, h.config.authSecret);
        assert.equal(
          (
            await post(
              `/invitations/${connectionId}/inspect`,
              { token },
              h.cookieC,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await post(
              `/invitations/${connectionId}/inspect`,
              { token: "A".repeat(43) },
              h.cookieB,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await post(
              `/invitations/${connectionId}/inspect`,
              { token },
              h.cookieB,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await post(
              `/invitations/${connectionId}/accept-link`,
              { token },
              h.cookieB,
            )
          ).status,
          200,
        );
        assert.equal(
          (
            await post(
              `/invitations/${connectionId}/accept-link`,
              { token },
              h.cookieB,
            )
          ).status,
          404,
        );
        assert.equal(
          (
            await post(
              `/invitations/${connectionId}/inspect`,
              { token },
              h.cookieB,
            )
          ).status,
          404,
        );
      },
    );
    await t.test(
      "cola agotada tras cinco intentos y lease vencido recuperable",
      async () => {
        const c = await post("/contacts", {
          nickname: "Caro",
          email: h.userC.email,
        });
        await post(`/contacts/${c.data.id}/invitation`);
        for (let i = 0; i < 5; i++) {
          now = new Date(Date.now() + (i + 1) * 3_600_000);
          assert.equal(
            (
              await deliverBatch(pool, h.databases, config, {
                now,
                send: async () => {
                  throw new Error("simulado");
                },
              })
            ).failed,
            1,
          );
        }
        assert.equal(
          (
            await pool.query(
              `SELECT COUNT(*)::int AS n FROM public."NotificationJob" WHERE status='DEAD'`,
            )
          ).rows[0].n,
          1,
        );
        // Un proceso que cae antes de enviar deja un lease: otro lo retoma al vencer.
        const c2 = await post("/contacts", {
          nickname: "Otra",
          email: "otra@example.test",
        });
        await post(`/contacts/${c2.data.id}/invitation`);
        const queued = (
          await pool.query(
            `UPDATE public."NotificationJob" SET "leaseToken"=$1,"leaseUntil"=$2 WHERE status='PENDING' RETURNING id`,
            [randomUUID(), new Date(now.getTime() + 60_000)],
          )
        ).rows;
        assert.equal(queued.length, 1);
        assert.equal(
          (await deliverBatch(pool, h.databases, config, { now })).sent,
          0,
        );
        assert.equal(
          (
            await deliverBatch(pool, h.databases, config, {
              now: new Date(now.getTime() + 60_001),
            })
          ).sent,
          1,
        );
      },
    );
    await t.test(
      "invitaciones concurrentes no duplican correos y un rollback no deja un envío",
      async () => {
        const c = await post("/contacts", {
          nickname: "Concurrente",
          email: "concurrente@example.test",
        });
        const results = await Promise.all([
          post(`/contacts/${c.data.id}/invitation`),
          post(`/contacts/${c.data.id}/invitation`),
        ]);
        assert.deepEqual(results.map((r) => r.status).sort(), [201, 409]);
        const accepted = results.find((r) => r.status === 201)!;
        await post(`/connections/${accepted.data.connection.id}/disconnect`);
        const at = new Date(Date.now() + 1000);
        assert.equal(
          (await deliverBatch(pool, h.databases, config, { now: at }))
            .cancelled,
          1,
        );
        const rollback = await post("/contacts", {
          nickname: "Rollback",
          email: "rollback@example.test",
        });
        const before = (
          await pool.query(
            'SELECT COUNT(*)::int AS n FROM public."NotificationJob"',
          )
        ).rows[0].n;
        await assert.rejects(() =>
          withUser(h.databases.app, h.userA.id, async (tx) => {
            await inviteContact(
              { tx, ownerId: h.userA.id, requestId: randomUUID() },
              rollback.data.id,
              { ...h.userA, emailVerified: true },
              h.config.authSecret,
            );
            throw new Error("rollback simulado");
          }),
        );
        assert.equal(
          (
            await pool.query(
              'SELECT COUNT(*)::int AS n FROM public."NotificationJob"',
            )
          ).rows[0].n,
          before,
        );
      },
    );
    await t.test(
      "transporte SMTP contra un servidor de captura en localhost",
      async () => {
        const sockets = new Set<Socket>();
        let message = "";
        const server = createServer((socket) => {
          sockets.add(socket);
          socket.on("close", () => sockets.delete(socket));
          socket.setEncoding("utf8");
          socket.write("220 localhost ESMTP\r\n");
          let pending = "",
            data = false;
          socket.on("data", (chunk) => {
            pending += chunk;
            for (;;) {
              const end = pending.indexOf("\r\n");
              if (end < 0) break;
              const line = pending.slice(0, end);
              pending = pending.slice(end + 2);
              if (data) {
                if (line === ".") {
                  data = false;
                  socket.write("250 accepted\r\n");
                } else message += line + "\n";
              } else if (line.startsWith("EHLO") || line.startsWith("HELO"))
                socket.write("250 localhost\r\n");
              else if (line === "DATA") {
                data = true;
                socket.write("354 continue\r\n");
              } else if (line === "QUIT") {
                socket.end("221 bye\r\n");
              } else socket.write("250 OK\r\n");
            }
          });
        });
        server.listen(0, "127.0.0.1");
        await once(server, "listening");
        try {
          const address = server.address();
          assert.ok(address && typeof address !== "string");
          const send = createMailSender({
            ...config,
            mail: {
              ...config.mail,
              mode: "smtp",
              host: "127.0.0.1",
              port: address.port,
              secure: false,
              user: "",
              password: "",
            },
          });
          const id = randomUUID();
          await send({
            id,
            to: "prueba@example.test",
            subject: "Prueba SMTP local",
            text: "Contenido sintetico",
          });
          assert.match(message, /Contenido sintetico/);
          assert.ok(message.includes(id + "@localhost"));
        } finally {
          for (const socket of sockets) socket.destroy();
          await new Promise<void>((r) => server.close(() => r()));
        }
      },
    );
    await t.test(
      "recordatorios por día local, cruce de mes y exclusión de gastos resueltos",
      async () => {
        await h.call("/api/v2/me/preferences", h.cookieA, {
          method: "PATCH",
          headers: { origin: h.config.origin },
          body: JSON.stringify({ timeZone: "America/Argentina/Tucuman" }),
        });
        now = new Date("2027-01-31T13:00:00Z");
        await post("/expenses", {
          name: "Febrero",
          currency: "ARS",
          amountMinor: "10000",
          dueDay: 2,
          firstPeriod: "2027-02",
        });
        await post("/expenses", {
          name: "Cubierto anual",
          currency: "USD",
          amountMinor: "100",
          dueDay: 1,
          firstPeriod: "2027-01",
        });
        const january = await get("/months/2027-01"),
          annual = january.occurrences.find(
            (o: { name: string }) => o.name === "Cubierto anual",
          );
        await post(`/occurrences/${annual.id}/annual-payments`, {
          version: annual.version,
          months: 12,
          amountMinor: "1000",
        });
        const contact = await post("/contacts", { nickname: "Préstamo" });
        await post("/debts", {
          contactId: contact.data.id,
          description: "Por cobrar",
          currency: "USD",
          principalMinor: "2000",
          lentOn: "2027-01-01",
          dueOn: "2027-02-01",
        });
        const card = await post("/cards", {
          name: "Visa",
          closingDay: 28,
          dueDay: 2,
        });
        await post(`/cards/${card.data.id}/purchases`, {
          description: "Compra",
          occurredOn: "2027-01-10",
          firstPeriod: "2027-01",
          amountMinor: "100",
          currency: "ARS",
        });
        assert.equal(
          await scheduleReminders(
            pool,
            h.databases,
            new Date("2027-01-31T10:00:00Z"),
          ),
          0,
        ); // 07:00 local
        assert.equal(await scheduleReminders(pool, h.databases, now), 1);
        assert.equal(await scheduleReminders(pool, h.databases, now), 0);
        const sent: Mail[] = [];
        await deliverBatch(pool, h.databases, config, {
          now,
          send: async (mail) => {
            sent.push(mail);
          },
        });
        const reminder = sent.find((m) => m.subject.includes("vencimientos"))!;
        assert.match(reminder.text, /Febrero/);
        assert.match(reminder.text, /Visa/);
        assert.match(reminder.text, /Por cobrar/);
        assert.doesNotMatch(reminder.text, /Cubierto anual/);
        assert.equal(
          (await get("/months/2027-02")).occurrences.filter(
            (o: { name: string }) => o.name === "Febrero",
          ).length,
          1,
        );
      },
    );
    await t.test(
      "pago o baja de avisos después de encolar evita un correo obsoleto",
      async () => {
        now = new Date("2027-02-01T13:00:00Z");
        assert.equal(await scheduleReminders(pool, h.databases, now), 1);
        const prefs = await get("/me/notifications");
        const body = {
          version: prefs.version,
          monthly: prefs.monthly,
          cards: prefs.cards,
          debts: prefs.debts,
          daysBefore: prefs.daysBefore,
        };
        await post(
          "/me/notifications",
          { ...body, emailEnabled: false },
          h.cookieA,
          randomUUID(),
          "PUT",
        );
        assert.equal(
          (await deliverBatch(pool, h.databases, config, { now })).cancelled,
          1,
        );
      },
    );
    await t.test(
      "worker sin permisos sobre credenciales/finanzas y limpieza limitada a claves antiguas",
      async () => {
        await assert.rejects(() =>
          pool.query("SELECT token FROM auth.session"),
        );
        await assert.rejects(() =>
          pool.query('SELECT * FROM public."CardCharge"'),
        );
        await assert.rejects(() => pool.query("SELECT * FROM auth.account"));
        const before = (await pool.query('DELETE FROM public."IdempotencyKey"'))
          .rowCount;
        assert.equal(before, 0);
        assert.equal(await cleanupIdempotency(pool), 0);
        assert.ok(
          (await withUser(h.databases.app, h.userA.id, (tx) =>
            tx.idempotencyKey.count(),
          )) > 0,
        );
      },
    );
  } finally {
    await pool.end();
    await h.close();
    await rm(dir, { recursive: true, force: true });
  }
});
