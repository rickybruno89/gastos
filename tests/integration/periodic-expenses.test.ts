import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { withUser } from "../../server/persistence/database";
import type { Month, Occurrence } from "../../shared/contracts/expenses";
import { startTestApp } from "./harness";

test("gastos periódicos: bimestrales, omitir, baja, pago anual y renombrar", async (t) => {
  const { config, databases, userA, cookieA, cookieB, call, close } =
    await startTestApp();
  const send = (
    method: string,
    path: string,
    body: unknown,
    cookie = cookieA,
  ) =>
    call(`/api/v2${path}`, cookie, {
      method,
      headers: { origin: config.origin, "Idempotency-Key": randomUUID() },
      body: JSON.stringify(body),
    });
  const month = async (period: string) => {
    const response = await call(`/api/v2/months/${period}`, cookieA);
    assert.equal(response.status, 200);
    return (await response.json()).data as Month;
  };
  const maybe = async (period: string, name: string) =>
    (await month(period)).occurrences.find((o) => o.name === name);
  const find = async (period: string, name: string) => {
    const row = await maybe(period, name);
    assert.ok(row, `${name} en ${period}`);
    return row;
  };
  const create = async (body: Record<string, unknown>) => {
    const response = await send("POST", "/expenses", {
      currency: "ARS",
      dueDay: 10,
      ...body,
    });
    assert.equal(response.status, 201);
    return (await response.json()).data;
  };
  const act = async (
    path: string,
    body: Record<string, unknown>,
    status = 200,
  ) => {
    const response = await send("POST", path, body);
    const json = await response.json();
    assert.equal(response.status, status, JSON.stringify(json));
    return status < 300 ? (json.data as Occurrence) : json.error.code;
  };
  const totals = async (period: string, currency = "ARS") =>
    (await month(period)).totals.find((total) => total.currency === currency);
  try {
    await t.test(
      "bimestral: anclado en su primer mes, sin importe en los intermedios",
      async () => {
        const series = await create({
          name: "Agua",
          amountMinor: "1500000",
          intervalMonths: 2,
          firstPeriod: "2026-11",
        });
        assert.equal(series.intervalMonths, 2);
        assert.equal(await maybe("2026-10", "Agua"), undefined);
        assert.equal((await find("2026-11", "Agua")).intervalMonths, 2);
        assert.equal(await maybe("2026-12", "Agua"), undefined);
        assert.equal(await totals("2026-12"), undefined);
        const january = await find("2027-01", "Agua");
        assert.equal(await maybe("2027-02", "Agua"), undefined);
        await send("PATCH", `/occurrences/${january.id}`, {
          version: january.version,
          amount: { amountMinor: "1800000", scope: "THIS_AND_FUTURE" },
        });
        assert.equal((await find("2026-11", "Agua")).amountMinor, "1500000");
        assert.equal((await find("2027-03", "Agua")).amountMinor, "1800000");
        assert.equal(await maybe("2027-04", "Agua"), undefined);
      },
    );

    await t.test(
      "omitir exige motivo, sale del pendiente y se puede restaurar",
      async () => {
        await create({
          name: "Luz",
          amountMinor: "4200000",
          firstPeriod: "2026-10",
        });
        const october = await find("2026-10", "Luz");
        assert.equal(
          await act(
            `/occurrences/${october.id}/skip`,
            { version: october.version, reason: "  " },
            400,
          ),
          "VALIDATION_ERROR",
        );
        const skipped = await act(`/occurrences/${october.id}/skip`, {
          version: october.version,
          reason: "Sin consumo por viaje",
        });
        assert.equal(skipped.status, "SKIPPED");
        assert.equal(skipped.statusReason, "Sin consumo por viaje");
        assert.equal((await totals("2026-10"))?.pendingMinor, "0");
        assert.equal(
          await act(
            `/occurrences/${october.id}/payments`,
            { version: skipped.version },
            409,
          ),
          "OCCURRENCE_SKIPPED",
        );
        const restored = await act(`/occurrences/${october.id}/restore`, {
          version: skipped.version,
        });
        assert.equal(restored.status, "PLANNED");
        assert.equal(restored.statusReason, null);
        assert.equal((await totals("2026-10"))?.pendingMinor, "4200000");
        assert.equal(
          await act(
            `/occurrences/${october.id}/restore`,
            { version: restored.version },
            409,
          ),
          "NOT_RESTORABLE",
        );
      },
    );

    await t.test(
      "dar de baja corta la serie, protege meses resueltos y se revierte",
      async () => {
        await create({
          name: "Streaming",
          amountMinor: "900000",
          firstPeriod: "2026-10",
        });
        await find("2026-12", "Streaming");
        const november = await find("2026-11", "Streaming");
        const before = BigInt((await totals("2026-11"))!.pendingMinor);
        const ended = await act(`/occurrences/${november.id}/cancel`, {
          version: november.version,
          reason: "Ya no lo uso",
        });
        assert.equal(ended.status, "CANCELLED");
        assert.equal(
          BigInt((await totals("2026-11"))!.pendingMinor),
          before - 900000n,
        );
        assert.equal((await find("2026-10", "Streaming")).status, "PLANNED");
        assert.equal(await maybe("2026-12", "Streaming"), undefined);
        assert.equal(await maybe("2027-03", "Streaming"), undefined);
        assert.equal(
          await act(
            `/occurrences/${november.id}/payments`,
            { version: ended.version },
            409,
          ),
          "OCCURRENCE_CANCELLED",
        );
        const restored = await act(`/occurrences/${november.id}/restore`, {
          version: ended.version,
        });
        assert.equal(restored.status, "PLANNED");
        const december = await find("2026-12", "Streaming");
        assert.equal(december.status, "PLANNED");
        assert.ok(await maybe("2027-03", "Streaming"));

        await act(
          `/occurrences/${december.id}/payments`,
          { version: december.version },
          201,
        );
        assert.equal(
          await act(
            `/occurrences/${november.id}/cancel`,
            { version: restored.version, reason: "Baja" },
            409,
          ),
          "FUTURE_RESOLVED",
        );
      },
    );

    await t.test(
      "pago anual: un desembolso, meses cubiertos sin pendiente y undo completo",
      async () => {
        await create({
          name: "Seguro",
          currency: "USD",
          amountMinor: "10000",
          firstPeriod: "2026-09",
        });
        await find("2026-09", "Seguro");
        const november = await find("2026-11", "Seguro");
        const october = await find("2026-10", "Seguro");
        for (const invalid of [
          { months: 1, amountMinor: "100000" },
          { months: 25, amountMinor: "100000" },
          { months: 12, amountMinor: "0" },
        ])
          await act(
            `/occurrences/${october.id}/annual-payments`,
            { version: october.version, ...invalid },
            400,
          );
        const attempts = await Promise.all(
          Array.from({ length: 3 }, () =>
            send("POST", `/occurrences/${october.id}/annual-payments`, {
              version: october.version,
              months: 12,
              amountMinor: "100000",
              paidOn: "2026-10-02",
            }),
          ),
        );
        assert.deepEqual(
          attempts.map((response) => response.status).sort(),
          [201, 409, 409],
        );
        const paid = await find("2026-10", "Seguro");
        assert.equal(paid.status, "PAID");
        assert.equal(paid.amountMinor, "10000");
        assert.deepEqual(paid.payment, {
          paidOn: "2026-10-02",
          channel: null,
          amountMinor: "100000",
          annual: true,
        });
        assert.deepEqual(paid.coverage, {
          fromPeriod: "2026-10",
          toPeriod: "2027-09",
        });
        assert.deepEqual(await totals("2026-10", "USD"), {
          currency: "USD",
          pendingMinor: "0",
          paidMinor: "100000",
        });
        // Ya materializado antes del pago y sin consultar: ambos quedan cubiertos.
        const coveredNovember = await find("2026-11", "Seguro");
        assert.equal(coveredNovember.status, "COVERED");
        assert.ok(coveredNovember.version > november.version);
        const march = await find("2027-03", "Seguro");
        assert.equal(march.status, "COVERED");
        assert.equal(march.amountMinor, "10000");
        assert.deepEqual(march.coverage, paid.coverage);
        assert.deepEqual(await totals("2027-03", "USD"), {
          currency: "USD",
          pendingMinor: "0",
          paidMinor: "0",
        });
        assert.equal((await find("2027-10", "Seguro")).status, "PLANNED");

        assert.equal(
          await act(
            `/occurrences/${march.id}/payments`,
            { version: march.version },
            409,
          ),
          "OCCURRENCE_COVERED",
        );
        const edit = await send("PATCH", `/occurrences/${march.id}`, {
          version: march.version,
          dueDay: 1,
        });
        assert.equal((await edit.json()).error.code, "OCCURRENCE_COVERED");
        const september = await find("2026-09", "Seguro");
        assert.equal(
          await act(
            `/occurrences/${september.id}/annual-payments`,
            { version: september.version, months: 3, amountMinor: "25000" },
            409,
          ),
          "COVERAGE_OVERLAP",
        );
        // Un cambio de regla anterior no altera los meses cubiertos.
        await send("PATCH", `/occurrences/${september.id}`, {
          version: september.version,
          amount: { amountMinor: "12000", scope: "THIS_AND_FUTURE" },
        });
        assert.equal((await find("2027-03", "Seguro")).amountMinor, "10000");
        assert.equal((await find("2027-10", "Seguro")).amountMinor, "12000");
        await assert.rejects(() =>
          withUser(databases.app, userA.id, (tx) =>
            tx.monthlyExpenseOccurrence.update({
              where: { id: march.id },
              data: { amountMinor: 1n },
            }),
          ),
        );

        const undone = await act(`/occurrences/${october.id}/undo-payment`, {
          version: paid.version,
        });
        assert.equal(undone.status, "PLANNED");
        assert.equal(undone.coverage, null);
        assert.equal((await find("2026-11", "Seguro")).status, "PLANNED");
        assert.equal((await find("2027-03", "Seguro")).status, "PLANNED");
        assert.equal((await find("2027-05", "Seguro")).status, "PLANNED");
        assert.equal((await totals("2026-10", "USD"))?.paidMinor, "0");
        const coverages = await withUser(databases.app, userA.id, (tx) =>
          tx.coveragePeriod.findMany(),
        );
        assert.equal(coverages.length, 1);
        assert.ok(coverages[0].revertedAt);
      },
    );

    await t.test(
      "el pago anual no pisa meses pagados ni supera una baja",
      async () => {
        await create({
          name: "Gimnasio",
          amountMinor: "3000000",
          firstPeriod: "2026-10",
        });
        const december = await find("2026-12", "Gimnasio");
        await act(
          `/occurrences/${december.id}/payments`,
          { version: december.version },
          201,
        );
        const october = await find("2026-10", "Gimnasio");
        assert.equal(
          await act(
            `/occurrences/${october.id}/annual-payments`,
            { version: october.version, months: 6, amountMinor: "15000000" },
            409,
          ),
          "COVERAGE_CONFLICT",
        );
        await create({
          name: "Club",
          amountMinor: "2000000",
          firstPeriod: "2026-10",
        });
        const clubNovember = await find("2026-11", "Club");
        await act(`/occurrences/${clubNovember.id}/cancel`, {
          version: clubNovember.version,
          reason: "Me mudo",
        });
        const clubOctober = await find("2026-10", "Club");
        assert.equal(
          await act(
            `/occurrences/${clubOctober.id}/annual-payments`,
            { version: clubOctober.version, months: 12, amountMinor: "1" },
            409,
          ),
          "COVERAGE_AFTER_END",
        );
      },
    );

    await t.test(
      "renombrar actualiza todos los meses con control de versión",
      async () => {
        const series = await create({
          name: "Internet",
          amountMinor: "2850000",
          firstPeriod: "2026-10",
        });
        const renamed = await send("PATCH", `/expenses/${series.id}`, {
          version: series.version,
          name: "Internet fibra",
        });
        assert.equal(renamed.status, 200);
        assert.equal((await renamed.json()).data.version, series.version + 1);
        assert.ok(await find("2026-10", "Internet fibra"));
        assert.ok(await find("2027-06", "Internet fibra"));
        assert.equal(
          (
            await send("PATCH", `/expenses/${series.id}`, {
              version: series.version,
              name: "Otro",
            })
          ).status,
          409,
        );
        assert.equal(
          (
            await send(
              "PATCH",
              `/expenses/${series.id}`,
              { version: series.version + 1, name: "Ajeno" },
              cookieB,
            )
          ).status,
          404,
        );
      },
    );
  } finally {
    await close();
  }
});
