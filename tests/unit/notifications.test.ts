import { test } from "node:test";
import assert from "node:assert/strict";
import {
  invitationToken,
  tokenHash,
  validToken,
} from "../../server/jobs/invitation-token";
import { reminderWindow } from "../../server/jobs/reminders";
import { retryAt } from "../../server/jobs/worker";
import { notificationPreferenceInput } from "../../shared/contracts/notifications";
test("enlace estable por invitación, resistente a alteraciones y rotación del secreto", () => {
  const token = invitationToken("id", "a".repeat(32));
  assert.ok(validToken(token, tokenHash(token)));
  assert.equal(validToken(token, null), false);
  assert.equal(
    validToken(invitationToken("other", "a".repeat(32)), tokenHash(token)),
    false,
  );
  assert.notEqual(token, invitationToken("id", "b".repeat(32)));
});
test("recordatorio usa fecha y hora local y atraviesa el año sin mover fechas civiles", () => {
  const instant = new Date("2027-01-01T01:00:00Z");
  assert.deepEqual(reminderWindow("America/Argentina/Tucuman", 3, instant), {
    today: "2026-12-31",
    end: "2027-01-03",
    hour: 22,
  });
  assert.equal(reminderWindow("Europe/Madrid", 0, instant).today, "2027-01-01");
  assert.equal(retryAt(5, instant).getTime() - instant.getTime(), 960_000);
  assert.equal(
    notificationPreferenceInput.safeParse({
      version: 1,
      emailEnabled: true,
      monthly: true,
      cards: true,
      debts: false,
      daysBefore: 15,
    }).success,
    false,
  );
});
