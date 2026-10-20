import { test } from "node:test";
import assert from "node:assert/strict";
import {
  moneyFromDecimal,
  addMoney,
  allocateMoney,
} from "../../shared/domain/money";
import { dueDateForPeriod, occursInPeriod } from "../../shared/domain/periods";
import { preferencesInputSchema } from "../../shared/contracts/account";
import { parseConfig } from "../../server/config";

const env = {
  NODE_ENV: "test",
  APP_ORIGIN: "http://localhost:3000",
  DATABASE_URL: "postgresql://app:test@localhost/gastappv2",
  AUTH_DATABASE_URL: "postgresql://auth:test@localhost/gastappv2",
  BETTER_AUTH_SECRET: "test-secret-with-more-than-thirty-two-characters",
};
test("dinero exacto, incluyendo valores fuera del rango seguro de Number", () => {
  assert.equal(
    moneyFromDecimal("9007199254740993.01", "ARS").amountMinor,
    "900719925474099301",
  );
  assert.equal(
    addMoney(moneyFromDecimal("0.10", "ARS"), moneyFromDecimal("0.20", "ARS"))
      .amountMinor,
    "30",
  );
  assert.throws(() => moneyFromDecimal("1.005", "ARS"));
  assert.throws(() =>
    addMoney(moneyFromDecimal("10", "ARS"), moneyFromDecimal("10", "USD")),
  );
});
test("reparto conserva cada centavo y desempata por identidad, independiente del orden", () => {
  const shares = [
    { id: "b", shareBps: 5000 },
    { id: "a", shareBps: 5000 },
  ];
  const result = allocateMoney(moneyFromDecimal("0.01", "ARS"), shares);
  assert.deepEqual(
    Object.fromEntries(result.map((item) => [item.id, item.money.amountMinor])),
    { b: "0", a: "1" },
  );
  const reversed = allocateMoney(
    moneyFromDecimal("0.01", "ARS"),
    [...shares].reverse(),
  );
  assert.equal(
    reversed.find((item) => item.id === "a")?.money.amountMinor,
    "1",
  );
  const full = allocateMoney(moneyFromDecimal("1000", "USD"), [
    { id: "owner", shareBps: 0 },
    { id: "contact", shareBps: 10000 },
  ]);
  assert.deepEqual(
    full.map((item) => item.money.amountMinor),
    ["0", "100000"],
  );
  assert.equal(
    allocateMoney(moneyFromDecimal("-0.01", "ARS"), shares).find(
      (item) => item.id === "a",
    )?.money.amountMinor,
    "-1",
  );
});
test("porcentajes inválidos y participantes duplicados se rechazan", () => {
  assert.throws(() =>
    allocateMoney(moneyFromDecimal("1", "ARS"), [{ id: "a", shareBps: 9999 }]),
  );
  assert.throws(() =>
    allocateMoney(moneyFromDecimal("1", "ARS"), [
      { id: "a", shareBps: 5000 },
      { id: "a", shareBps: 5000 },
    ]),
  );
});
test("vencimientos en meses cortos y años bisiestos no desbordan", () => {
  assert.equal(dueDateForPeriod("2026-02", 31), "2026-02-28");
  assert.equal(dueDateForPeriod("2028-02", 30), "2028-02-29");
  assert.equal(dueDateForPeriod("2100-02", 29), "2100-02-28");
  assert.equal(dueDateForPeriod("2026-04", 31), "2026-04-30");
  assert.throws(() => dueDateForPeriod("2026-13", 1));
});
test("bimestral respeta anclaje, meses intermedios y cambio de año", () => {
  assert.equal(occursInPeriod("2027-01", "2026-11", 2), true);
  assert.equal(occursInPeriod("2026-12", "2026-11", 2), false);
  assert.equal(occursInPeriod("2026-09", "2026-11", 2), false);
});
test("preferencias rechazan identidades del cliente y zonas inválidas", () => {
  assert.equal(
    preferencesInputSchema.safeParse({ timeZone: "UTC", userId: "other" })
      .success,
    false,
  );
  assert.equal(
    preferencesInputSchema.safeParse({ timeZone: "Invalid/Zone" }).success,
    false,
  );
  assert.equal(
    preferencesInputSchema.safeParse({ timeZone: "America/Argentina/Tucuman" })
      .success,
    true,
  );
});
test("configuración requiere roles separados y evita un Google incompleto", () => {
  assert.equal(parseConfig(env).googleConfigured, false);
  assert.throws(() => parseConfig({ ...env, GOOGLE_CLIENT_ID: "client" }));
  assert.throws(() =>
    parseConfig({ ...env, AUTH_DATABASE_URL: env.DATABASE_URL }),
  );
  assert.throws(() =>
    parseConfig({ ...env, APP_ORIGIN: "http://localhost:3000/path" }),
  );
  assert.throws(() => parseConfig({ ...env, NODE_ENV: "production" }));
});
