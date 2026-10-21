import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withUser } from "../../server/persistence/database";
import type { Month } from "../../shared/contracts/expenses";
import type { Contact, SharedMonth } from "../../shared/contracts/sharing";
import { addMonths, todayIn } from "../../shared/domain/periods";
import { startTestApp } from "./harness";

// La aceptación usa el período actual del invitado (zona horaria por defecto).
const current = todayIn("America/Argentina/Tucuman").slice(0, 7);
const previous = addMonths(current, -1);
const next = addMonths(current, 1);

test("compartidos: contactos, reparto, saldos derivados y conexiones", async (t) => {
  const {
    config,
    databases,
    userA,
    userB,
    userC,
    cookieA,
    cookieB,
    cookieC,
    call,
    close,
  } = await startTestApp();
  const send = async (
    method: string,
    path: string,
    body: unknown,
    cookie = cookieA,
  ) => {
    const response = await call(`/api/v2${path}`, cookie, {
      method,
      headers: { origin: config.origin, "Idempotency-Key": randomUUID() },
      body: JSON.stringify(body),
    });
    const json = await response.json();
    return { status: response.status, data: json.data, code: json.error?.code };
  };
  const get = async <T>(path: string, cookie = cookieA) => {
    const response = await call(`/api/v2${path}`, cookie);
    assert.equal(response.status, 200, path);
    return (await response.json()).data as T;
  };
  const contact = async (body: Record<string, unknown>, cookie = cookieA) => {
    const result = await send("POST", "/contacts", body, cookie);
    assert.equal(result.status, 201, JSON.stringify(result));
    return result.data as Contact;
  };
  const expense = async (body: Record<string, unknown>, cookie = cookieA) => {
    const result = await send(
      "POST",
      "/expenses",
      { currency: "ARS", dueDay: 10, firstPeriod: previous, ...body },
      cookie,
    );
    assert.equal(result.status, 201, JSON.stringify(result));
    return result.data;
  };
  const find = async (period: string, name: string, cookie = cookieA) => {
    const month = await get<Month>(`/months/${period}`, cookie);
    const row = month.occurrences.find((o) => o.name === name);
    assert.ok(row, `${name} en ${period}`);
    return row;
  };
  const shared = (period: string, cookie = cookieA) =>
    get<SharedMonth>(`/shared/${period}`, cookie);
  const personOf = (month: SharedMonth, name: string) =>
    month.people.find((p) => p.name === name);

  try {
    let ana: Contact;
    await t.test(
      "un contacto manual solo necesita apodo y es privado",
      async () => {
        assert.equal(
          (await send("POST", "/contacts", { nickname: "  " })).status,
          400,
        );
        assert.equal(
          (await send("POST", "/contacts", { nickname: "X", email: "no" }))
            .status,
          400,
        );
        ana = await contact({ nickname: "Ana" });
        assert.equal(ana.email, null);
        assert.equal(ana.connection, null);
        const renamed = await send("PATCH", `/contacts/${ana.id}`, {
          version: ana.version,
          nickname: "Ana (depto)",
        });
        assert.equal(renamed.status, 200);
        ana = renamed.data;
        assert.equal(
          (
            await send("PATCH", `/contacts/${ana.id}`, {
              version: 1,
              nickname: "Viejo",
            })
          ).code,
          "VERSION_CONFLICT",
        );
        assert.equal(
          (
            await send(
              "PATCH",
              `/contacts/${ana.id}`,
              { version: ana.version, nickname: "Ajeno" },
              cookieB,
            )
          ).status,
          404,
        );
        assert.deepEqual(await get<Contact[]>("/contacts", cookieB), []);
        const rows = await withUser(databases.app, userB.id, (tx) =>
          tx.contact.findMany(),
        );
        assert.deepEqual(rows, []);
      },
    );

    await t.test(
      "el reparto valida porcentajes, contactos propios y archivados",
      async () => {
        const base = { name: "Inválido", amountMinor: "1000" };
        for (const shares of [
          [{ contactId: ana.id, shareBps: 10_001 }],
          [
            { contactId: ana.id, shareBps: 5000 },
            { contactId: ana.id, shareBps: 1000 },
          ],
          [{ contactId: ana.id, shareBps: 0 }],
        ])
          assert.equal(
            (await send("POST", "/expenses", { ...base, shares })).status,
            400,
          );
        assert.equal(
          (
            await send("POST", "/expenses", {
              ...base,
              currency: "ARS",
              dueDay: 1,
              firstPeriod: previous,
              shares: [{ contactId: randomUUID(), shareBps: 5000 }],
            })
          ).status,
          404,
        );
        const foreign = await contact({ nickname: "De Juan" }, cookieB);
        assert.equal(
          (
            await send("POST", "/expenses", {
              ...base,
              currency: "ARS",
              dueDay: 1,
              firstPeriod: previous,
              shares: [{ contactId: foreign.id, shareBps: 5000 }],
            })
          ).status,
          404,
        );
        const archived = await contact({ nickname: "Archivado" });
        await send("PATCH", `/contacts/${archived.id}`, {
          version: archived.version,
          archived: true,
        });
        assert.equal(
          (
            await send("POST", "/expenses", {
              ...base,
              currency: "ARS",
              dueDay: 1,
              firstPeriod: previous,
              shares: [{ contactId: archived.id, shareBps: 5000 }],
            })
          ).code,
          "CONTACT_ARCHIVED",
        );
      },
    );

    await t.test(
      "un contacto sin cuenta tiene su parte exacta en cada mes",
      async () => {
        await expense({
          name: "Alquiler",
          amountMinor: "10000001",
          shares: [{ contactId: ana.id, shareBps: 5000 }],
        });
        const rent = await find(previous, "Alquiler");
        assert.equal(rent.sharing?.ownerShareBps, 5000);
        const part = rent.sharing!.participants[0];
        assert.equal(part.nickname, "Ana (depto)");
        assert.equal(part.shareBps, 5000);
        assert.ok(["5000000", "5000001"].includes(part.amountMinor!));
        const view = await shared(previous);
        const person = personOf(view, "Ana (depto)")!;
        assert.equal(person.connected, false);
        assert.deepEqual(person.balances, [
          { currency: "ARS", theyOweMinor: part.amountMinor, iOweMinor: "0" },
        ]);
        assert.equal(person.theyOwe[0].expenseName, "Alquiler");
        assert.equal(person.theyOwe[0].totalMinor, "10000001");
        // La otra persona puede llevarse el 100%; el propietario queda en 0%.
        await expense({
          name: "Regalo",
          amountMinor: "500000",
          shares: [{ contactId: ana.id, shareBps: 10_000 }],
        });
        const gift = await find(previous, "Regalo");
        assert.equal(gift.sharing?.ownerShareBps, 0);
        assert.equal(gift.sharing?.participants[0].amountMinor, "500000");
      },
    );

    await t.test(
      "pagar no salda la parte compartida y congela el snapshot",
      async () => {
        const rent = await find(previous, "Alquiler");
        const paid = await send("POST", `/occurrences/${rent.id}/payments`, {
          version: rent.version,
        });
        assert.equal(paid.status, 201);
        assert.deepEqual(paid.data.sharing, rent.sharing);
        assert.equal(
          personOf(await shared(previous), "Ana (depto)")!.theyOwe.length,
          2,
        );
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.occurrenceAllocation.deleteMany({
              where: { occurrenceId: rent.id },
            }),
          ),
        );
        await assert.rejects(
          () =>
            withUser(databases.app, userA.id, (tx) =>
              tx.occurrenceAllocation.create({
                data: {
                  ownerId: userA.id,
                  occurrenceId: rent.id,
                  contactId: null,
                  period: new Date(`${previous}-01T00:00:00Z`),
                  expenseName: "Extra",
                  shareBps: 100,
                  baseAmountMinor: 1n,
                  amountMinor: 0n,
                  currency: "ARS",
                },
              }),
            ),
          "una fila suelta rompe la suma del 100%",
        );
      },
    );

    await t.test(
      "cambiar importe o reparto rehace el snapshot desde ese mes",
      async () => {
        const october = await find(current, "Alquiler");
        const changed = await send("PATCH", `/occurrences/${october.id}`, {
          version: october.version,
          amount: { amountMinor: "20000000", scope: "THIS_MONTH" },
        });
        assert.equal(changed.status, 200);
        assert.equal(
          changed.data.sharing.participants[0].amountMinor,
          "10000000",
        );
        await find(next, "Alquiler");
        const reshared = await send(
          "PUT",
          `/occurrences/${october.id}/shares`,
          {
            version: changed.data.version,
            shares: [{ contactId: ana.id, shareBps: 2500 }],
          },
        );
        assert.equal(reshared.status, 200);
        assert.equal(reshared.data.sharing.ownerShareBps, 7500);
        assert.equal(
          reshared.data.sharing.participants[0].amountMinor,
          "5000000",
        );
        assert.equal(
          (await find(next, "Alquiler")).sharing?.participants[0].shareBps,
          2500,
        );
        // El mes pagado conserva su reparto original.
        assert.equal(
          (await find(previous, "Alquiler")).sharing?.participants[0].shareBps,
          5000,
        );
        // Quitar el reparto convierte el gasto en personal desde ese mes.
        const personal = await send(
          "PUT",
          `/occurrences/${reshared.data.id}/shares`,
          { version: reshared.data.version, shares: [] },
        );
        assert.equal(personal.data.sharing, null);
        assert.equal((await find(next, "Alquiler")).sharing, null);
      },
    );

    await t.test(
      "omitido no reparte y el pago anual reparte una sola vez",
      async () => {
        const gift = await find(current, "Regalo");
        await send("POST", `/occurrences/${gift.id}/skip`, {
          version: gift.version,
          reason: "No hubo",
        });
        const view = await shared(current);
        assert.equal(
          personOf(view, "Ana (depto)")?.theyOwe.some(
            (line) => line.expenseName === "Regalo",
          ) ?? false,
          false,
        );
        await expense({
          name: "Seguro",
          currency: "USD",
          amountMinor: "10000",
          firstPeriod: current,
          shares: [{ contactId: ana.id, shareBps: 5000 }],
        });
        await find(next, "Seguro");
        const insurance = await find(current, "Seguro");
        const annual = await send(
          "POST",
          `/occurrences/${insurance.id}/annual-payments`,
          { version: insurance.version, months: 12, amountMinor: "100000" },
        );
        assert.equal(annual.status, 201);
        assert.equal(annual.data.sharing.participants[0].amountMinor, "50000");
        const usd = (month: SharedMonth) =>
          personOf(month, "Ana (depto)")?.balances.find(
            (b) => b.currency === "USD",
          );
        assert.equal(usd(await shared(current))?.theyOweMinor, "50000");
        assert.equal(usd(await shared(next)), undefined);
        assert.equal(
          (await find(next, "Seguro")).sharing?.participants[0].amountMinor,
          null,
        );
        const undone = await send(
          "POST",
          `/occurrences/${insurance.id}/undo-payment`,
          { version: annual.data.version },
        );
        assert.equal(undone.data.sharing.participants[0].amountMinor, "5000");
        assert.equal(usd(await shared(next))?.theyOweMinor, "5000");
      },
    );

    let juan: Contact;
    await t.test(
      "invitar exige email, no admite auto-invitación y solo lo ve el destinatario",
      async () => {
        juan = await contact({ nickname: "Juancito" });
        assert.equal(
          (await send("POST", `/contacts/${juan.id}/invitation`, {})).code,
          "CONTACT_EMAIL_REQUIRED",
        );
        const me = await contact({
          nickname: "Yo",
          email: "Ricky@Example.test",
        });
        assert.equal(me.email, "ricky@example.test");
        assert.equal(
          (await send("POST", `/contacts/${me.id}/invitation`, {})).code,
          "SELF_INVITE",
        );
        // Un gasto compartido antes de invitar: al aceptar se ve su historial completo.
        juan = (
          await send("PATCH", `/contacts/${juan.id}`, {
            version: juan.version,
            email: "juan@example.test",
          })
        ).data;
        await expense({
          name: "Internet",
          amountMinor: "3000000",
          shares: [{ contactId: juan.id, shareBps: 5000 }],
        });
        await find(previous, "Internet");
        await find(current, "Internet");
        const invited = await send(
          "POST",
          `/contacts/${juan.id}/invitation`,
          {},
        );
        assert.equal(invited.status, 201);
        juan = invited.data;
        assert.equal(juan.connection?.status, "PENDING");
        assert.equal(juan.connection?.direction, "SENT");
        assert.equal(
          (await send("POST", `/contacts/${juan.id}/invitation`, {})).code,
          "ALREADY_CONNECTED",
        );
        assert.equal(
          (
            await send("PATCH", `/contacts/${juan.id}`, {
              version: juan.version,
              email: "otro@example.test",
            })
          ).code,
          "CONTACT_CONNECTED",
        );
        assert.deepEqual(await get("/invitations", cookieC), []);
        const incoming = await get<{ id: string; inviterName: string }[]>(
          "/invitations",
          cookieB,
        );
        assert.equal(incoming.length, 1);
        assert.equal(incoming[0].inviterName, "Ricky");
        // Pendiente no concede acceso.
        assert.deepEqual((await shared(current, cookieB)).people, []);
        assert.equal(
          (
            await send(
              "POST",
              `/invitations/${incoming[0].id}/accept`,
              {},
              cookieC,
            )
          ).status,
          404,
        );
      },
    );

    await t.test(
      "al aceptar, la contraparte ve solo su parte, con historial y en lectura",
      async () => {
        const [invitation] = await get<{ id: string }[]>(
          "/invitations",
          cookieB,
        );
        const accepted = await send(
          "POST",
          `/invitations/${invitation.id}/accept`,
          {},
          cookieB,
        );
        assert.equal(accepted.status, 200);
        const ricky = accepted.data as Contact;
        assert.equal(ricky.nickname, "Ricky");
        assert.equal(ricky.connection?.status, "ACCEPTED");
        assert.equal(ricky.connection?.direction, "RECEIVED");
        assert.equal(ricky.connection?.acceptedPeriod, current);
        assert.equal(
          (
            await send(
              "POST",
              `/invitations/${invitation.id}/accept`,
              {},
              cookieB,
            )
          ).status,
          404,
        );
        const contacts = await get<Contact[]>("/contacts");
        const linked = contacts.find((c) => c.id === juan.id)!;
        assert.equal(linked.connection?.status, "ACCEPTED");
        assert.equal(linked.connection?.otherName, "Juan");

        const view = await shared(current, cookieB);
        const person = personOf(view, "Ricky")!;
        assert.equal(person.connected, true);
        assert.deepEqual(
          person.iOwe.map((line) => [line.expenseName, line.shareBps]),
          [["Internet", 5000]],
        );
        assert.deepEqual(person.balances, [
          { currency: "ARS", theyOweMinor: "0", iOweMinor: "1500000" },
        ]);
        // El historial previo a la aceptación también es visible.
        const history = personOf(await shared(previous, cookieB), "Ricky")!;
        assert.deepEqual(
          history.iOwe.map((line) => [line.expenseName, line.amountMinor]),
          [["Internet", "1500000"]],
        );
        // La contraparte no ve el mes, ni otros gastos, ni otros participantes.
        assert.deepEqual(
          (await get<Month>(`/months/${current}`, cookieB)).occurrences,
          [],
        );
        const visible = await withUser(databases.app, userB.id, (tx) =>
          tx.occurrenceAllocation.findMany(),
        );
        assert.ok(visible.length >= 1);
        assert.ok(
          visible.every(
            (row) => row.ownerId === userA.id && row.contactId === juan.id,
          ),
        );
        assert.equal(
          await withUser(databases.app, userB.id, (tx) =>
            tx.monthlyExpenseOccurrence.count(),
          ),
          0,
        );
        const internet = await find(current, "Internet");
        assert.equal(
          (
            await send(
              "PATCH",
              `/occurrences/${internet.id}`,
              { version: internet.version, dueDay: 1 },
              cookieB,
            )
          ).status,
          404,
        );
        // Una tercera cuenta no ve nada.
        assert.deepEqual((await shared(current, cookieC)).people, []);
        assert.deepEqual(
          await withUser(databases.app, userC.id, (tx) =>
            tx.occurrenceAllocation.findMany(),
          ),
          [],
        );

        // Bidireccional: Juan comparte un gasto propio con Ricky.
        await expense(
          {
            name: "Cena",
            amountMinor: "800000",
            firstPeriod: current,
            shares: [{ contactId: ricky.id, shareBps: 10_000 }],
          },
          cookieB,
        );
        await find(current, "Cena", cookieB);
        const mine = personOf(await shared(current), "Juancito")!;
        assert.deepEqual(mine.balances, [
          { currency: "ARS", theyOweMinor: "1500000", iOweMinor: "800000" },
        ]);
        assert.equal(mine.iOwe[0].expenseName, "Cena");
      },
    );

    await t.test(
      "desconectar corta la visibilidad sin borrar los saldos propios",
      async () => {
        const contacts = await get<Contact[]>("/contacts", cookieB);
        const ricky = contacts.find((c) => c.nickname === "Ricky")!;
        const cut = await send(
          "POST",
          `/connections/${ricky.connection!.id}/disconnect`,
          {},
          cookieB,
        );
        assert.equal(cut.data.status, "BLOCKED");
        const forJuan = personOf(await shared(current, cookieB), "Ricky")!;
        assert.equal(forJuan.iOwe.length, 0);
        assert.equal(forJuan.theyOwe[0].expenseName, "Cena");
        const forRicky = personOf(await shared(current), "Juancito")!;
        assert.equal(forRicky.connected, false);
        assert.equal(forRicky.iOwe.length, 0);
        assert.equal(forRicky.theyOwe[0].expenseName, "Internet");
        const again = await send("POST", `/contacts/${juan.id}/invitation`, {});
        assert.equal(again.status, 201);
        assert.equal(again.data.connection.status, "PENDING");
      },
    );

    await t.test("rechazar o una invitación vencida no conectan", async () => {
      const caro = await contact({
        nickname: "Caro",
        email: "caro@example.test",
      });
      const sent = await send("POST", `/contacts/${caro.id}/invitation`, {});
      const id = sent.data.connection.id;
      const rejected = await send(
        "POST",
        `/invitations/${id}/reject`,
        {},
        cookieC,
      );
      assert.equal(rejected.data.status, "REJECTED");
      const resent = await send("POST", `/contacts/${caro.id}/invitation`, {});
      await withUser(databases.app, userA.id, (tx) =>
        tx.userConnection.update({
          where: { id: resent.data.connection.id },
          data: { expiresAt: new Date(Date.now() - 1000) },
        }),
      );
      assert.deepEqual(await get("/invitations", cookieC), []);
      assert.equal(
        (
          await send(
            "POST",
            `/invitations/${resent.data.connection.id}/accept`,
            {},
            cookieC,
          )
        ).code,
        "INVITATION_EXPIRED",
      );
    });
  } finally {
    await close();
  }
});
