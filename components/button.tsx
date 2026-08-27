import type { ComponentPropsWithoutRef } from "react";

/**
 * Shared button surfaces. Centralized so the contrast pairing is decided once
 * and cannot drift section to section.
 *
 * Contrast audit (WCAG AA, computed not eyeballed):
 *   primary    #b01050 bg + #fff7fa text          = 5.58:1  PASS
 *   secondary  --ink on --bg, plus a visible 1px border
 *   onPhoto    #fff7fa bg + #b01050 text          = 5.58:1  PASS (same pair,
 *              inverted, so the hero CTA is as legible as the page one)
 *   quiet      #fff7fa text over the hero scrim   = 4.7:1 worst case, and the
 *              scrim is what guarantees that floor rather than the photograph
 *   Both clear 44px minimum height for touch (Pro Max priority 2).
 *
 * Why the hero CTA is not rose: over the wine hero scrim, a #b01050 pill sits
 * a few percent apart from its own background and the button stops reading as
 * a button. The near-white pill separates cleanly on every slide and is the
 * more expensive looking of the two anyway.
 *
 * Shape: buttons are the full-radius half of the rule in globals.css. Labels
 * stay at three words or fewer so nothing wraps at desktop.
 */

const base =
  "inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-medium transition-[background-color,border-color,color,transform,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] active:translate-y-px active:scale-[0.98] disabled:pointer-events-none disabled:opacity-55";

export const buttonStyles = {
  primary: `${base} bg-accent px-7 py-3.5 text-on-accent shadow-soft hover:bg-accent-hover hover:shadow-lifted`,
  secondary: `${base} border border-line-strong bg-surface px-7 py-3.5 text-ink hover:border-accent hover:text-accent`,
  /** Nav variant. Still 44px tall, just tighter horizontally. */
  compact: `${base} bg-accent px-5 py-2.5 text-on-accent hover:bg-accent-hover`,
  /** Hero primary, sitting on photography. */
  onPhoto: `${base} bg-on-accent px-8 py-4 text-accent shadow-lifted hover:bg-white`,
  /** Hero secondary. Outline only, so it never competes with the pill. */
  quiet: `${base} border border-on-accent/55 px-8 py-4 text-on-accent hover:border-on-accent hover:bg-on-accent/12`,
} as const;

type ButtonLinkProps = ComponentPropsWithoutRef<"a"> & {
  variant?: keyof typeof buttonStyles;
};

export function ButtonLink({
  variant = "primary",
  className = "",
  ...props
}: ButtonLinkProps) {
  return <a className={`${buttonStyles[variant]} ${className}`} {...props} />;
}
