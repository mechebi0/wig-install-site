/**
 * Display formatting for dates, times, money and appointment status.
 *
 * ---------------------------------------------------------------------------
 * THE DATE BUG THIS FILE EXISTS TO PREVENT
 * ---------------------------------------------------------------------------
 * `appointment_date` is a Postgres DATE and arrives as "2026-09-18". Passing
 * that straight to `new Date()` parses it as UTC midnight, and anywhere west
 * of Greenwich that renders as the 17th. A booking system that shows people
 * the wrong day is worse than one that shows them nothing, so every date in
 * this file goes through `parseDateOnly`, which splits the string and builds a
 * LOCAL date. Nothing here should ever call `new Date(someIsoDate)` directly.
 *
 * `appointment_time` gets the same treatment: it arrives as "14:00:00" and is
 * a wall-clock time at the studio, not an instant. It is formatted by
 * arithmetic on the string rather than by constructing a Date, because
 * constructing one would invite a timezone conversion that must not happen.
 */

/** Both studios are in Maryland. See public.business_timezone() in the SQL. */
export const STUDIO_TIME_ZONE = "America/New_York";

/** "2026-09-18" -> a Date at local midnight on that calendar day. */
export function parseDateOnly(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, day ?? 1);
}

/** A Date -> "2026-09-18", using its LOCAL calendar day. */
export function toDateOnly(date: Date): string {
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Today's calendar date at the studio, regardless of where the visitor is.
 *
 * Someone booking from London at 2am is still booking against a Maryland
 * calendar, and `new Date()` on their machine would offer them a day the
 * studio has not reached yet. `en-CA` is used purely because it formats as
 * YYYY-MM-DD, which is the shape the database wants.
 */
export function todayInStudio(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: STUDIO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

/** Minutes since midnight, right now, at the studio. */
export function minutesNowInStudio(): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: STUDIO_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date());
  const [hours, minutes] = parts.split(":").map(Number);
  return hours * 60 + minutes;
}

/** "14:00:00" or "14:00" -> minutes since midnight. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + (minutes ?? 0);
}

/** Minutes since midnight -> "14:00". */
export function minutesToTime(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${`${hours}`.padStart(2, "0")}:${`${rest}`.padStart(2, "0")}`;
}

/** "14:00:00" -> "2:00 PM". No Date object, so no timezone can interfere. */
export function formatTime(time: string): string {
  const total = timeToMinutes(time);
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${`${minutes}`.padStart(2, "0")} ${suffix}`;
}

/** "2026-09-18" -> "Friday, September 18, 2026". */
export function formatDateLong(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(parseDateOnly(iso));
}

/** "2026-09-18" -> "Fri 18 Sep". For dense lists where the long form wraps. */
export function formatDateShort(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(parseDateOnly(iso));
}

/** "2026-09-18" -> "September 18". Used where the year is already obvious. */
export function formatDateMedium(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
  }).format(parseDateOnly(iso));
}

/**
 * 18000 -> "$180". Whole dollars stay whole: a price list reading "$180.00"
 * beside "$95.00" is a checkout, and this is a service menu.
 */
export function formatPrice(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "On request";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: cents % 100 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** 120 -> "2 hours". 90 -> "90 minutes". Matches the copy already on /book. */
export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return "";
  if (minutes % 60 === 0) {
    const hours = minutes / 60;
    return hours === 1 ? "1 hour" : `${hours} hours`;
  }
  return `${minutes} minutes`;
}

/** True once the appointment's start time has passed at the studio. */
export function isPast(startsAt: string): boolean {
  return new Date(startsAt).getTime() < Date.now();
}
