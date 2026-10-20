import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import {
  createContactSchema,
  sharesSchema,
} from "../../shared/contracts/sharing";
import { formatShare, parseShare } from "../../app/lib/format";

test("el reparto admite hasta 100% entre contactos distintos", () => {
  const a = randomUUID();
  const b = randomUUID();
  assert.equal(sharesSchema.safeParse([]).success, true);
  assert.equal(
    sharesSchema.safeParse([
      { contactId: a, shareBps: 5000 },
      { contactId: b, shareBps: 5000 },
    ]).success,
    true,
  );
  for (const invalid of [
    [
      { contactId: a, shareBps: 6000 },
      { contactId: b, shareBps: 4001 },
    ],
    [
      { contactId: a, shareBps: 10 },
      { contactId: a, shareBps: 10 },
    ],
    [{ contactId: a, shareBps: 0 }],
    [{ contactId: "no-uuid", shareBps: 100 }],
    [{ contactId: a, shareBps: 50.5 }],
  ])
    assert.equal(sharesSchema.safeParse(invalid).success, false);
});
test("contactos: apodo obligatorio y email normalizado", () => {
  assert.equal(createContactSchema.safeParse({ nickname: " " }).success, false);
  assert.equal(
    createContactSchema.parse({ nickname: "Juan", email: " Juan@Mail.COM " })
      .email,
    "juan@mail.com",
  );
  assert.equal(
    createContactSchema.safeParse({ nickname: "Juan", ownerId: "x" }).success,
    false,
  );
});
test("porcentajes en pantalla ida y vuelta a basis points", () => {
  assert.equal(parseShare("50"), 5000);
  assert.equal(parseShare("33,33"), 3333);
  assert.equal(parseShare("12.5"), 1250);
  assert.equal(parseShare("100"), 10_000);
  for (const invalid of ["0", "100,01", "abc", "1,234", ""])
    assert.equal(parseShare(invalid), null, invalid);
  assert.equal(formatShare(3333), "33,33%");
  assert.equal(formatShare(5000), "50%");
  assert.equal(formatShare(1250), "12,50%");
});
