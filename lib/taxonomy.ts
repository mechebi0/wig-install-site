/**
 * INSTALL TYPE - the one thing a client actually books.
 *
 * ---------------------------------------------------------------------------
 * TWO AXES, KEPT APART
 * ---------------------------------------------------------------------------
 * This site describes a wig install along two independent axes, and the whole
 * point of this file is that they never share a list.
 *
 *   INSTALL TYPE   how the unit is fitted. Frontal or closure. This is the
 *                  booking / service classification, and it is defined HERE
 *                  and nowhere else.
 *
 *   STYLE / LOOK   what the hair looks like: deep wave, sleek straight, bob,
 *                  body wave, colour. That lives in lib/collections.ts beside
 *                  the photographs, and it is a description of the hair rather
 *                  than a service. A body wave is a style; a frontal is an
 *                  install type; a body-wave frontal is both.
 *
 * Every consumer that needs to say "frontal" or "closure" reads it from here:
 * the homepage install panel, the booking service names in lib/content.ts,
 * the install-type label on each gallery photograph, and the booking link
 * builder. Nothing else types the words, so the taxonomy cannot drift.
 *
 * The ids are the same words the `services` table and SERVICES in
 * lib/content.ts already use as slugs, so a booking row and an install type
 * are the same key with no translation layer between them.
 *
 * ---------------------------------------------------------------------------
 * WHERE ACUITY PLUGS IN, LATER
 * ---------------------------------------------------------------------------
 * Nat has no Acuity account yet, so `bookingUrl` is "" on both types and no
 * scheduler address is written down anywhere in this repo. When the account
 * exists, the two scheduling links are supplied as build-time environment
 * variables (see the two names below) and every Book button for that install
 * type starts pointing at its own appointment type. Until then bookingTarget()
 * in lib/content.ts sends them all to /book, which is today's behaviour.
 */

export type InstallTypeId = "frontal" | "closure";

export type InstallType = {
  id: InstallTypeId;
  /** Display name, used verbatim on every surface. */
  label: string;
  /**
   * The same word without "Install", for a tag on a photograph where the
   * full name will not fit at phone width. It is only ever used next to
   * something that has already established the context is installs.
   */
  shortLabel: string;
  /** One sentence, for the homepage panel. What it is, and who does it. */
  summary: string;
  /**
   * This install type's own scheduler link, or "" while none is connected.
   * Read from the environment at BUILD time, like STUDIO.bookingUrl. The `??`
   * matters: without it an unset variable reaches the markup as "undefined".
   */
  bookingUrl: string;
};

/** The display names, for the places that hold an id and need the words. */
export const INSTALL_TYPE_LABELS: Record<InstallTypeId, string> = {
  frontal: "Frontal Install",
  closure: "Closure Install",
};

/** The two, in the order every surface shows them. */
export const INSTALL_TYPES: readonly InstallType[] = [
  {
    id: "frontal",
    label: INSTALL_TYPE_LABELS.frontal,
    shortLabel: "Frontal",
    summary: "Professional frontal wig installation performed by Nat.",
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_FRONTAL_URL ?? "",
  },
  {
    id: "closure",
    label: INSTALL_TYPE_LABELS.closure,
    shortLabel: "Closure",
    summary: "Professional closure wig installation performed by Nat.",
    bookingUrl: process.env.NEXT_PUBLIC_ACUITY_CLOSURE_URL ?? "",
  },
];

export function getInstallType(id: InstallTypeId): InstallType {
  // INSTALL_TYPES is keyed by the union above, so this cannot miss.
  return INSTALL_TYPES.find((type) => type.id === id)!;
}
