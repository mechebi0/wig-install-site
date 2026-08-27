/**
 * When the studio is open, and which of those slots are still free.
 *
 * ---------------------------------------------------------------------------
 * WHY THE OPENING GRID LIVES HERE AND THE OVERLAP RULE LIVES IN POSTGRES
 * ---------------------------------------------------------------------------
 * These are two different kinds of rule and they belong in two different
 * places.
 *
 * The opening grid is business configuration. It changes when Nat decides to
 * start opening Mondays, and changing it should be an edit to one array, not a
 * database migration. It is a CONVENIENCE: it stops the calendar offering
 * times nobody could take.
 *
 * Whether two appointments collide is a correctness rule, and it is enforced
 * by an EXCLUDE constraint in supabase/migrations/0001, where two people
 * clicking the same slot at the same moment resolve to one winner and one
 * clear error. Nothing in this file is load bearing for that. If someone
 * bypasses the whole UI and posts a hand-rolled request, Postgres still says
 * no; the worst this file's absence would cost is a worse error message.
 *
 * The database also carries a coarse floor of its own (half-hour boundaries,
 * 08:00 to 19:00, closed Sunday and Monday) so that a forged request cannot
 * land at 03:17 on a Sunday even though the fine grid is only here.
 *
 * ---------------------------------------------------------------------------
 * THE HONEST LIMITS OF THIS PHASE
 * ---------------------------------------------------------------------------
 * There is no per-day override, no holiday calendar, no blocked-out lunch, and
 * no way for Nat to close a single afternoon from the dashboard. Those need a
 * business-hours table and an availability screen, which is the next phase.
 * What exists now is a fixed weekly grid plus a real collision constraint,
 * which is a foundation rather than an imitation of one.
 */
import {
  minutesToTime,
  parseDateOnly,
  timeToMinutes,
  todayInStudio,
  minutesNowInStudio,
} from "@/lib/format";
import type { BookedSlot } from "@/lib/supabase/types";

/** Starts are offered every half hour. Matches the CHECK constraint in SQL. */
export const SLOT_STEP_MINUTES = 30;

/**
 * How far ahead the calendar opens. Six weeks is long enough to plan a wedding
 * install around and short enough that Nat is not committed to a date she
 * cannot yet see her own diary for.
 */
export const BOOKING_WINDOW_DAYS = 42;

/**
 * The smallest gap between now and a bookable slot. Nat needs to see the
 * request and answer it, so "in twenty minutes" is not a real appointment.
 */
export const MINIMUM_NOTICE_HOURS = 12;

/**
 * Opening hours, indexed by JavaScript's getDay(): 0 = Sunday.
 * Kept in step with STUDIO.hours in lib/content.ts, which is what the public
 * pages print. Null means closed.
 */
type OpeningHours = { open: string; close: string } | null;

export const WEEKLY_HOURS: readonly OpeningHours[] = [
  null,                             // Sunday, closed
  null,                             // Monday, closed
  { open: "09:00", close: "19:00" }, // Tuesday
  { open: "09:00", close: "19:00" }, // Wednesday
  { open: "09:00", close: "19:00" }, // Thursday
  { open: "09:00", close: "19:00" }, // Friday
  { open: "08:00", close: "16:00" }, // Saturday
] as const;

export function hoursForDate(iso: string): OpeningHours {
  return WEEKLY_HOURS[parseDateOnly(iso).getDay()] ?? null;
}

export function isOpenOn(iso: string): boolean {
  return hoursForDate(iso) !== null;
}

/**
 * Every date the calendar will offer, open days only, starting today.
 * Closed days are omitted rather than rendered as disabled: a strip of six
 * greyed-out cells is noise, and the visitor does not need to be told twice
 * that the studio shuts on Sundays.
 */
export function bookableDates(): string[] {
  const start = parseDateOnly(todayInStudio());
  const dates: string[] = [];

  for (let offset = 0; offset < BOOKING_WINDOW_DAYS; offset += 1) {
    const day = new Date(start);
    day.setDate(day.getDate() + offset);
    const month = `${day.getMonth() + 1}`.padStart(2, "0");
    const date = `${day.getDate()}`.padStart(2, "0");
    const iso = `${day.getFullYear()}-${month}-${date}`;
    if (isOpenOn(iso)) dates.push(iso);
  }

  return dates;
}

export type SlotOption = {
  /** "14:00" */
  time: string;
  available: boolean;
  /** Why not, when it is not. Shown as a tooltip rather than left to guesswork. */
  reason?: "taken" | "past" | "too-soon" | "closing";
};

/**
 * The slots for one day at one location, marked up with why each one is or is
 * not takeable.
 *
 * A slot is unavailable when:
 *   taken     an existing live appointment overlaps it
 *   past      it is earlier today
 *   too-soon  it is inside the minimum notice window
 *   closing   the service would run past closing time
 *
 * The `taken` test walks existing bookings rather than comparing start times,
 * because a two-hour frontal at 2pm also consumes 2:30 and 3:00. That is the
 * same interval logic the database enforces, computed here only so the visitor
 * sees it before they click rather than after.
 */
export function slotsForDay(
  iso: string,
  serviceMinutes: number,
  booked: BookedSlot[],
): SlotOption[] {
  const hours = hoursForDate(iso);
  if (!hours) return [];

  const open = timeToMinutes(hours.open);
  const close = timeToMinutes(hours.close);
  const duration = Math.max(serviceMinutes, SLOT_STEP_MINUTES);

  const today = todayInStudio();
  const isToday = iso === today;
  const nowMinutes = minutesNowInStudio();
  const noticeCutoff = nowMinutes + MINIMUM_NOTICE_HOURS * 60;

  /*
    The notice window can run past midnight, and when it does it disqualifies
    part of tomorrow as well. Comparing a minutes-since-midnight cutoff against
    tomorrow's minutes-since-midnight is only meaningful once the cutoff is
    rebased onto that day, which is what the offset does.
  */
  const dayOffset = Math.round(
    (parseDateOnly(iso).getTime() - parseDateOnly(today).getTime()) / 86_400_000,
  );
  const cutoffForThisDay = noticeCutoff - dayOffset * 24 * 60;

  const busy = booked.map((slot) => {
    const start = timeToMinutes(slot.slot_time);
    return { start, end: start + (slot.slot_minutes || 60) };
  });

  const options: SlotOption[] = [];

  for (let start = open; start + duration <= close; start += SLOT_STEP_MINUTES) {
    const end = start + duration;
    const overlaps = busy.some((slot) => start < slot.end && end > slot.start);

    /*
      ORDER MATTERS, and the clock is checked BEFORE the diary.

      A 9am slot looked at from 1pm is both "already passed" and, if somebody
      took it last week, "already booked". Reporting it as booked is technically
      true and practically useless: it tells the visitor to try a different
      time, when what they actually need to know is that the whole morning is
      behind them.

      It also makes "is this day closed by the clock" answerable. With the diary
      checked first, one existing appointment on an otherwise unreachable day
      would break `every(past or too-soon)` and the booking panel would announce
      that today is FULL when the real answer is that today has closed. See
      dayClosedByNotice in components/booking/booking-flow.tsx.
    */
    let reason: SlotOption["reason"];
    if (isToday && start <= nowMinutes) reason = "past";
    else if (start < cutoffForThisDay) reason = "too-soon";
    else if (overlaps) reason = "taken";

    options.push({
      time: minutesToTime(start),
      available: reason === undefined,
      reason,
    });
  }

  return options;
}

/** Plain-language version of a slot's reason, for the aria-label. */
export function slotReasonLabel(reason: SlotOption["reason"]): string {
  switch (reason) {
    case "taken":
      return "already booked";
    case "past":
      return "already passed";
    case "too-soon":
      return `less than ${MINIMUM_NOTICE_HOURS} hours away`;
    case "closing":
      return "runs past closing";
    default:
      return "";
  }
}
