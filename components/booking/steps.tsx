"use client";

import { Check } from "@phosphor-icons/react/dist/ssr";
import { BOOKING_FLOW } from "@/lib/content";

/**
 * The step rail.
 *
 * ---------------------------------------------------------------------------
 * TWO LAYOUTS, ONE LIST
 * ---------------------------------------------------------------------------
 * At desktop it is a vertical list down the left margin, like the contents of
 * a menu. On a phone that column does not exist, so it collapses to a single
 * line of text and a hairline progress bar. Below `lg` a five-item horizontal
 * stepper either shrinks its labels to six illegible pixels or scrolls
 * sideways, and both are worse than a sentence that says where you are.
 *
 * ---------------------------------------------------------------------------
 * ONLY BACKWARDS IS CLICKABLE
 * ---------------------------------------------------------------------------
 * A completed step is a button. A step ahead of the visitor is plain text, not
 * a disabled button, because a disabled control still invites a click and then
 * refuses it. Jumping forward past an unanswered question would leave the
 * draft in a state the later steps cannot render anyway: there is no time grid
 * until there is a location.
 *
 * `aria-current="step"` marks where they are, and the whole thing is a real
 * ordered list, so a screen reader gets "3 of 5" from the markup rather than
 * from a string somebody remembered to update.
 */
export function BookingSteps({
  current,
  furthest,
  onJump,
}: {
  current: number;
  /** The highest step the draft is complete enough to render. */
  furthest: number;
  onJump: (step: number) => void;
}) {
  const steps = BOOKING_FLOW.steps;
  const total = steps.length;

  return (
    <>
      {/* ---------------- phone and tablet ---------------- */}
      <div className="lg:hidden">
        <p className="flex items-baseline justify-between gap-4">
          <span className="font-display text-lg tracking-tight text-ink">
            {steps[current].label}
          </span>
          <span className="tabular shrink-0 text-sm text-muted">
            Step {current + 1} of {total}
          </span>
        </p>
        <div
          className="mt-3 h-px w-full bg-line-strong"
          role="progressbar"
          aria-valuenow={current + 1}
          aria-valuemin={1}
          aria-valuemax={total}
          aria-label="Booking progress"
        >
          <div
            className="h-px bg-accent transition-[width] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none"
            style={{ width: `${((current + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* ---------------- desktop ---------------- */}
      <ol className="hidden lg:flex lg:flex-col lg:gap-1">
        {steps.map((step, index) => {
          const done = index < current;
          const active = index === current;
          const reachable = index <= furthest && index !== current;

          const body = (
            <span className="flex items-center gap-3.5">
              <span
                aria-hidden="true"
                className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs transition-colors duration-200 ${
                  active
                    ? "border-accent bg-accent text-on-accent"
                    : done
                      ? "border-accent/40 bg-accent-soft text-accent"
                      : "border-line-strong bg-surface text-muted"
                }`}
              >
                {done ? <Check size={12} weight="bold" /> : index + 1}
              </span>
              <span
                className={`text-sm transition-colors duration-200 ${
                  active ? "font-medium text-ink" : "text-muted"
                }`}
              >
                {step.label}
              </span>
            </span>
          );

          return (
            <li key={step.id} aria-current={active ? "step" : undefined}>
              {reachable ? (
                <button
                  type="button"
                  onClick={() => onJump(index)}
                  className="group flex min-h-11 w-full cursor-pointer items-center rounded-full text-left transition-opacity hover:opacity-100"
                >
                  {body}
                  <span className="sr-only">, go back to this step</span>
                </button>
              ) : (
                <span className="flex min-h-11 items-center">{body}</span>
              )}
            </li>
          );
        })}
      </ol>
    </>
  );
}
