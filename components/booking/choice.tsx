"use client";

import type { ReactNode } from "react";
import { Check } from "@phosphor-icons/react/dist/ssr";

/**
 * The selectable card and the selectable time pill.
 *
 * ---------------------------------------------------------------------------
 * WHY THESE ARE RADIO INPUTS AND NOT BUTTONS
 * ---------------------------------------------------------------------------
 * A grid of <button> elements with an `isSelected` prop is the obvious build
 * and it is worse in every way that matters here:
 *
 *   - a keyboard user has to Tab through all fourteen time slots to reach the
 *     last one. With radios, Tab enters the group once and the arrow keys move
 *     within it. That is not a nicety on a page with twenty two choices on it
 *   - a screen reader announces "Towson, button". A radio announces "Towson,
 *     radio button, 1 of 2, selected", which is the actual information
 *   - the browser already implements roving focus, arrow-key wrap, and
 *     single-selection semantics, correctly, on every platform
 *
 * The input is `sr-only` rather than `hidden` or `opacity-0`, because a truly
 * hidden input is not focusable and the whole benefit disappears with it. It
 * stays in the accessibility tree and in the tab order; only its own paint is
 * suppressed, and the visible card is styled from it with `peer-checked`.
 *
 * The focus ring is therefore drawn on the CARD via `peer-focus-visible`. This
 * is the one place on the site where the global :focus-visible rule in
 * globals.css cannot reach, because the element being focused is invisible,
 * and it is the reason the outline is restated here rather than inherited.
 */

const ring =
  "peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-accent";

export function ChoiceCard({
  name,
  value,
  checked,
  onSelect,
  title,
  meta,
  children,
  disabled = false,
}: {
  name: string;
  value: string;
  checked: boolean;
  onSelect: (value: string) => void;
  title: string;
  /** The price, or the city. Sits opposite the title on the same baseline. */
  meta?: ReactNode;
  children?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative block ${
        disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer"
      }`}
    >
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        className={`flex h-full flex-col rounded-3xl border bg-surface p-6 transition-[border-color,background-color,box-shadow] duration-200 peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:shadow-soft lg:p-7 ${ring} ${
          disabled ? "border-line" : "border-line-strong hover:border-accent"
        }`}
      >
        <span className="flex items-baseline justify-between gap-4">
          <span className="font-display text-xl tracking-tight text-ink lg:text-[1.375rem]">
            {title}
          </span>
          {meta ? (
            <span className="tabular shrink-0 font-display text-xl tracking-tight text-accent lg:text-[1.375rem]">
              {meta}
            </span>
          ) : null}
        </span>

        {children ? (
          <span className="mt-3 block text-sm leading-relaxed text-muted">
            {children}
          </span>
        ) : null}

        {/*
          The tick is decorative. Selection is already carried by the border,
          the ground and, for anyone not looking at the screen, by the radio's
          own checked state, so this is confirmation rather than information
          and is hidden from assistive technology.
        */}
        <span
          aria-hidden="true"
          className="absolute right-5 top-5 flex h-6 w-6 scale-75 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 transition-[opacity,transform] duration-200 peer-checked:scale-100 peer-checked:opacity-100 motion-reduce:transition-none"
        >
          <Check size={13} weight="bold" />
        </span>
      </span>
    </label>
  );
}

/**
 * One time slot.
 *
 * An unavailable slot is rendered and disabled rather than removed. Seeing
 * that 2:00 is gone but 2:30 is free is information; a shorter list with no
 * explanation just looks like the studio barely opens. The reason travels in
 * the accessible name, so it is available to someone who cannot see that the
 * pill is struck through.
 */
export function SlotPill({
  name,
  value,
  label,
  checked,
  onSelect,
  disabled,
  reasonLabel,
}: {
  name: string;
  value: string;
  label: string;
  checked: boolean;
  onSelect: (value: string) => void;
  disabled: boolean;
  reasonLabel: string;
}) {
  return (
    <label className={disabled ? "cursor-not-allowed" : "cursor-pointer"}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={checked}
        disabled={disabled}
        onChange={() => onSelect(value)}
        className="peer sr-only"
        aria-label={disabled ? `${label}, ${reasonLabel}` : label}
      />
      <span
        className={`flex min-h-11 items-center justify-center rounded-full border px-3 text-sm transition-[border-color,background-color,color] duration-200 peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent ${ring} ${
          disabled
            ? "border-line bg-surface-2/60 text-muted/50 line-through"
            : "border-line-strong bg-surface text-ink hover:border-accent hover:text-accent"
        }`}
      >
        {label}
      </span>
    </label>
  );
}
