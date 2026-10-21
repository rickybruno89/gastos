import { test } from "node:test";
import assert from "node:assert/strict";
import { togglePaid } from "../../app/lib/expenses";
import type { Occurrence } from "../../shared/contracts/expenses";

const base: Occurrence = {
  id: "o1",
  seriesId: "s1",
  name: "Alquiler",
  period: "2026-10",
  dueDate: "2026-10-10",
  dueDay: 10,
  amountMinor: "150000",
  currency: "ARS",
  status: "PLANNED",
  statusReason: null,
  version: 1,
  intervalMonths: 1,
  seriesVersion: 1,
  payment: null,
  coverage: null,
  sharing: null,
};
const month = {
  period: "2026-10",
  today: "2026-10-21",
  occurrences: [base, { ...base, id: "o2", currency: "USD" as const }],
  totals: [
    { currency: "ARS" as const, pendingMinor: "150000", paidMinor: "0" },
    { currency: "USD" as const, pendingMinor: "150000", paidMinor: "0" },
  ],
};

test("pago optimista: mueve el importe de pendiente a pagado solo en su moneda", () => {
  const paid = togglePaid(month, base);
  assert.equal(paid.occurrences[0].status, "PAID");
  assert.equal(paid.occurrences[0].payment?.paidOn, "2026-10-21");
  assert.equal(paid.occurrences[0].version, 1);
  assert.equal(paid.occurrences[1].status, "PLANNED");
  assert.deepEqual(paid.totals, [
    { currency: "ARS", pendingMinor: "0", paidMinor: "150000" },
    { currency: "USD", pendingMinor: "150000", paidMinor: "0" },
  ]);
  // Deshacer vuelve exactamente al estado original.
  const undone = togglePaid(paid, paid.occurrences[0]);
  assert.deepEqual(undone, month);
});
