import { test } from "node:test";
import assert from "node:assert/strict";
import { addMonths, todayIn } from "../../shared/domain/periods";
import {
  changeOccurrenceSchema,
  createMonthlyExpenseSchema,
  payOccurrenceSchema,
} from "../../shared/contracts/expenses";

test("períodos avanzan y retroceden cruzando años", () => {
  assert.equal(addMonths("2026-12", 1), "2027-01");
  assert.equal(addMonths("2026-01", -1), "2025-12");
  assert.equal(addMonths("2026-10", 15), "2028-01");
});
test("la fecha de hoy depende de la zona horaria del usuario", () => {
  const instant = new Date("2026-11-01T02:30:00Z");
  assert.equal(todayIn("UTC", instant), "2026-11-01");
  assert.equal(todayIn("America/Argentina/Tucuman", instant), "2026-10-31");
});
test("crear gasto exige importe exacto positivo y no acepta campos extra", () => {
  const valid = {
    name: "  Internet ",
    currency: "ARS",
    amountMinor: "2850000",
    dueDay: 18,
    firstPeriod: "2026-10",
  };
  assert.equal(createMonthlyExpenseSchema.parse(valid).name, "Internet");
  for (const invalid of [
    { ...valid, amountMinor: "-1" },
    { ...valid, amountMinor: "0100" },
    { ...valid, amountMinor: 2850000 },
    { ...valid, name: "   " },
    { ...valid, dueDay: 0 },
    { ...valid, firstPeriod: "1999-12" },
    { ...valid, intervalMonths: 2 },
  ])
    assert.equal(
      createMonthlyExpenseSchema.safeParse(invalid).success,
      false,
      JSON.stringify(invalid),
    );
});
test("cambios y pagos requieren versión y datos acotados", () => {
  assert.equal(changeOccurrenceSchema.safeParse({ version: 1 }).success, false);
  assert.equal(
    changeOccurrenceSchema.safeParse({
      version: 1,
      amount: { amountMinor: "100", scope: "ALWAYS" },
    }).success,
    false,
  );
  assert.equal(
    changeOccurrenceSchema.safeParse({ version: 2, dueDay: 31 }).success,
    true,
  );
  assert.equal(payOccurrenceSchema.safeParse({}).success, false);
  assert.equal(
    payOccurrenceSchema.safeParse({ version: 1, paidOn: "2026-02-30" }).success,
    false,
  );
});
