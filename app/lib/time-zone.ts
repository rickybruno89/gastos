import { timeZoneSchema } from "../../shared/contracts/account";
import { DEFAULT_TIME_ZONE } from "../../shared/domain/periods";

export function deviceTimeZone() {
  try {
    return timeZoneSchema.parse(
      Intl.DateTimeFormat().resolvedOptions().timeZone,
    );
  } catch {
    return DEFAULT_TIME_ZONE;
  }
}
