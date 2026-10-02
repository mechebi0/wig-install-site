/**
 * Appointment add-ons: the optional extras a customer can attach to a booking.
 *
 * ---------------------------------------------------------------------------
 * ONE CONFIGURATION, READ THREE WAYS
 * ---------------------------------------------------------------------------
 * Every surface that offers, prices or describes an add-on reads this file:
 *   - the add-ons step in the booking flow (components/booking/booking-flow.tsx)
 *   - the price and duration arithmetic on the confirm step
 *   - the booking selection (lib/booking-selection.ts), which carries the
 *     chosen ids through to the notes Nat receives
 *
 * Nothing here types an add-on name or a price twice, so a price Nat corrects
 * is corrected in one place and the flow, the summary and the notes all agree.
 *
 * ---------------------------------------------------------------------------
 * THE FOUR, AND WHY TWO OF THEM CARRY A TIME WINDOW
 * ---------------------------------------------------------------------------
 *   after-hours            after 9:00 PM. No price: the pricing reference
 *                           does not supply one, and inventing one would put
 *                           a figure in front of a customer that Nat has never
 *                           quoted. It is a time window only.
 *   early-bird              before 10:00 AM, +30%.
 *   same-day-customization  +$25, +40 minutes.
 *   styling                 +$15, +35 minutes.
 *
 * The two time-window add-ons are mutually exclusive with each other (a slot
 * cannot be both before 10 AM and after 9 PM) and each one, when selected,
 * narrows the calendar to its own window. See the window constants below and
 * slotsForDay() in lib/booking/availability.ts, which is what reads them.
 *
 * ---------------------------------------------------------------------------
 * PRICING TYPES
 * ---------------------------------------------------------------------------
 *   percentage  a share of the service price. Early Bird is 30%: a $100
 *               frontal becomes $130, not a flat $30. The two only coincide
 *               at $100, which is exactly the coincidence that makes a flat
 *               number look like a safe shortcut.
 *   fixed       a flat dollar amount, stored in dollars and converted to
 *               cents only at the edge, the same way the service prices are.
 *   none        no price. After Hours.
 *
 * Durations are additive and only ever the two figures the reference supplies
 * (+40 and +35 minutes). No base service duration is invented here; those live
 * on the service, and the confirm step adds the two together.
 */

export type AddOnId =
  | "after-hours"
  | "early-bird"
  | "same-day-customization"
  | "styling";

export type AddOnPricingType = "percentage" | "fixed" | "none";

export type AddOn = {
  id: AddOnId;
  /** Display name, used verbatim on the add-on card and in the notes. */
  name: string;
  pricingType: AddOnPricingType;
  /**
   * Dollars for a fixed add-on, percent for a percentage one, null for none.
   * Null is a real state (After Hours), not a missing value: it is what keeps
   * a price from being invented for a service the reference did not price.
   */
  price: number | null;
  /** Extra chair time, in minutes. 0 for the two time-window add-ons. */
  additionalMinutes: number;
  /**
   * The window this add-on books inside, when it is a time-window add-on.
   * The same window the calendar switches to when the add-on is selected.
   */
  timeWindow?: { open: string; close: string };
  /** Short price fragment for the card, e.g. "+30%". "" when there is none. */
  priceLabel: string;
  /** Short duration fragment, e.g. "+40 min". "" when there is none. */
  durationLabel: string;
  /** When a time-window add-on applies, e.g. "Before 10:00 AM". "" otherwise. */
  windowLabel: string;
};

/**
 * The four, in the order the reference lists them.
 *
 * The two time-window bounds are the booking windows either side of the
 * normal 10:00 AM - 9:00 PM day. The reference fixes the inner edge of each
 * (before 10 AM, after 9 PM) but not the outer one, so the outer edges are
 * the studio's own to set: 08:00 is the earliest the diary has ever opened
 * (the old Saturday grid and the database floor both started there) and 23:00
 * is the symmetric two-hour evening extension. Change the two bounds here and
 * the calendar, the price and the notes follow.
 */
export const ADD_ONS: readonly AddOn[] = [
  {
    id: "after-hours",
    name: "After Hours",
    pricingType: "none",
    price: null,
    additionalMinutes: 0,
    timeWindow: { open: "21:00", close: "23:00" },
    priceLabel: "",
    durationLabel: "",
    windowLabel: "After 9:00 PM",
  },
  {
    id: "early-bird",
    name: "Early Bird",
    pricingType: "percentage",
    price: 30,
    additionalMinutes: 0,
    timeWindow: { open: "08:00", close: "10:00" },
    priceLabel: "+30%",
    durationLabel: "",
    windowLabel: "Before 10:00 AM",
  },
  {
    id: "same-day-customization",
    name: "Same-Day Customization",
    pricingType: "fixed",
    price: 25,
    additionalMinutes: 40,
    priceLabel: "+$25",
    durationLabel: "+40 min",
    windowLabel: "",
  },
  {
    id: "styling",
    name: "Styling",
    pricingType: "fixed",
    price: 15,
    additionalMinutes: 35,
    priceLabel: "+$15",
    durationLabel: "+35 min",
    windowLabel: "",
  },
] as const;

/** The two time-window add-ons, which cannot both apply to one booking. */
export const TIME_WINDOW_ADD_ONS: readonly AddOnId[] = [
  "after-hours",
  "early-bird",
] as const;

/** An add-on from untrusted text, or null. The one place ids are checked. */
export function parseAddOn(value: string | null | undefined): AddOnId | null {
  return ADD_ONS.find((addOn) => addOn.id === value)?.id ?? null;
}

export function getAddOn(id: AddOnId): AddOn {
  // ADD_ONS is keyed by the union above, so this cannot miss.
  return ADD_ONS.find((addOn) => addOn.id === id)!;
}

/**
 * The add-on's price in cents, given the service price it applies to.
 *
 * Percentage is rounded to the nearest cent rather than truncated, so a 30%
 * early-bird on a $90 closure is $27.00 and not $26.99. A fixed add-on is
 * already a whole number of dollars. A none add-on is 0, always.
 */
export function addOnPriceCents(addOn: AddOn, baseCents: number): number {
  if (addOn.pricingType === "percentage") {
    return Math.round((baseCents * (addOn.price ?? 0)) / 100);
  }
  if (addOn.pricingType === "fixed") {
    return Math.round((addOn.price ?? 0) * 100);
  }
  return 0;
}

/**
 * The window the calendar should offer for the selected add-ons, or null for
 * the normal booking window.
 *
 * Early Bird and After Hours each narrow the day to their own window. When
 * neither is selected the calendar uses the normal 10:00 AM - 9:00 PM grid,
 * which is what the studio displays as its booking hours.
 */
export function windowForAddOns(addOns: readonly AddOnId[]): {
  open: string;
  close: string;
} | null {
  if (addOns.includes("early-bird")) {
    return getAddOn("early-bird").timeWindow ?? null;
  }
  if (addOns.includes("after-hours")) {
    return getAddOn("after-hours").timeWindow ?? null;
  }
  return null;
}

/**
 * The selection after toggling one add-on on or off.
 *
 * The two time-window add-ons (Early Bird, After Hours) are mutually
 * exclusive: turning one on turns the other off, because a single appointment
 * cannot be both before 10 AM and after 9 PM. The two fixed add-ons combine
 * freely with each other and with either time-window one.
 */
export function toggleAddOn(
  current: readonly AddOnId[],
  id: AddOnId,
): AddOnId[] {
  if (current.includes(id)) return current.filter((other) => other !== id);
  if (TIME_WINDOW_ADD_ONS.includes(id)) {
    return [...current.filter((other) => !TIME_WINDOW_ADD_ONS.includes(other)), id];
  }
  return [...current, id];
}

/** Extra chair time for the selected add-ons, in minutes. */
export function addOnMinutes(addOns: readonly AddOnId[]): number {
  return addOns.reduce((sum, id) => sum + getAddOn(id).additionalMinutes, 0);
}

/**
 * The service price plus every selected add-on, in cents. Each percentage
 * add-on is a share of the SERVICE price, not of a running total, so the
 * order the add-ons were picked in can never change the figure.
 *
 * After Hours adds nothing here because it has no price yet; callers say so
 * next to the total rather than letting it look included.
 */
export function totalWithAddOns(
  baseCents: number,
  addOns: readonly AddOnId[],
): number {
  return addOns.reduce(
    (sum, id) => sum + addOnPriceCents(getAddOn(id), baseCents),
    baseCents,
  );
}

/** True when a selected add-on has no price, so a total leaves it out. */
export function hasUnpricedAddOn(addOns: readonly AddOnId[]): boolean {
  return addOns.some((id) => getAddOn(id).pricingType === "none");
}
