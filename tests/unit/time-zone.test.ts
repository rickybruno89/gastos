import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { deviceTimeZone } from "../../app/lib/time-zone";
import { DEFAULT_TIME_ZONE, todayIn } from "../../shared/domain/periods";

test("zona automática: respeta el día del dispositivo y usa Argentina si no está disponible", () => {
  const original = Intl.DateTimeFormat.prototype.resolvedOptions;
  const detection = mock.method(
    Intl.DateTimeFormat.prototype,
    "resolvedOptions",
    function (this: Intl.DateTimeFormat) {
      return { ...original.call(this), timeZone: "Europe/Madrid" };
    },
  );
  try {
    assert.equal(deviceTimeZone(), "Europe/Madrid");
    const instant = new Date("2026-11-01T01:00:00Z");
    assert.equal(todayIn(deviceTimeZone(), instant), "2026-11-01");
    detection.mock.mockImplementation(() => ({
      ...original.call(new Intl.DateTimeFormat()),
      timeZone: "Invalid/Zone",
    }));
    assert.equal(deviceTimeZone(), DEFAULT_TIME_ZONE);
    assert.equal(todayIn(deviceTimeZone(), instant), "2026-10-31");
    detection.mock.mockImplementation(() => {
      throw new Error("Detección no disponible");
    });
    assert.equal(deviceTimeZone(), DEFAULT_TIME_ZONE);
  } finally {
    detection.mock.restore();
  }
});
