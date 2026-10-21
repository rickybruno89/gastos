import type { Databases } from "../persistence/database";
import { withUser } from "../persistence/database";
import { getMonth } from "../application/monthly-expenses";
import { listCards, getCardStatement } from "../application/cards";
import { listDebts } from "../application/debts";
import {
  todayIn,
  DEFAULT_TIME_ZONE,
  addMonths,
  dueDateForPeriod,
} from "../../shared/domain/periods";
export type ReminderPreference = {
  emailEnabled: boolean;
  monthly: boolean;
  cards: boolean;
  debts: boolean;
  daysBefore: number;
};
export type ReminderItem = {
  kind: "MONTHLY" | "CARD" | "DEBT";
  title: string;
  dueOn: string;
};
export function reminderWindow(
  timeZone: string,
  daysBefore: number,
  now: Date,
) {
  const today = todayIn(timeZone || DEFAULT_TIME_ZONE, now);
  const end = new Date(today + "T12:00:00Z");
  end.setUTCDate(end.getUTCDate() + daysBefore);
  return {
    today,
    end: end.toISOString().slice(0, 10),
    hour: Number(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: timeZone || DEFAULT_TIME_ZONE,
        hour: "2-digit",
        hourCycle: "h23",
      }).format(now),
    ),
  };
}
export async function reminderItems(
  databases: Databases,
  userId: string,
  prefs: ReminderPreference,
  timeZone: string,
  now: Date,
) {
  if (!prefs.emailEnabled) return [];
  const window = reminderWindow(timeZone, prefs.daysBefore, now);
  return withUser(databases.app, userId, async (tx) => {
    const result: ReminderItem[] = [];
    const inRange = (date: string) =>
      date >= window.today && date <= window.end;
    // Dos períodos como máximo; los demás meses continúan on-demand.
    const periods = [
      ...new Set([window.today.slice(0, 7), window.end.slice(0, 7)]),
    ];
    if (prefs.monthly)
      for (const period of periods) {
        const month = await getMonth(tx, userId, period);
        for (const o of month.occurrences)
          if (o.status === "PLANNED" && inRange(o.dueDate))
            result.push({ kind: "MONTHLY", title: o.name, dueOn: o.dueDate });
      }
    if (prefs.cards) {
      // El resumen de un período suele vencer al mes siguiente. Revisar además
      // los ya creados con vencimiento real fuera de esa sugerencia.
      const cards = await listCards(tx, userId);
      for (const duePeriod of periods)
        for (const card of cards)
          if (inRange(dueDateForPeriod(duePeriod, card.dueDay)))
            await getCardStatement(
              tx,
              userId,
              card.id,
              addMonths(duePeriod, -1),
            );
      const statements = await tx.cardStatement.findMany({
        where: {
          ownerId: userId,
          status: { not: "PAID" },
          dueDate: { gte: new Date(window.today), lte: new Date(window.end) },
          charges: { some: {} },
        },
        include: { card: { select: { name: true } } },
      });
      for (const s of statements)
        result.push({
          kind: "CARD",
          title: s.card.name,
          dueOn: s.dueDate.toISOString().slice(0, 10),
        });
    }
    if (prefs.debts) {
      const { debts } = await listDebts(tx, userId);
      for (const d of debts)
        if (
          d.dueOn &&
          inRange(d.dueOn) &&
          (d.status === "OPEN" || d.status === "PARTIALLY_PAID")
        )
          result.push({ kind: "DEBT", title: d.description, dueOn: d.dueOn });
    }
    return result.sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  });
}
