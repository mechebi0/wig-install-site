"use client";

import { useEffect, useRef, useState } from "react";
import { CircleNotch, WarningCircle } from "@phosphor-icons/react/dist/ssr";
import { REACH } from "@/lib/content";

/**
 * Natalie's official Square Appointments buyer-widget embed. Do not modify
 * this URL or swap in a different Square link; it is the exact script the
 * studio supplied.
 *
 * Square's own script positions itself relative to its own <script> tag: it
 * inserts an iframe (or, in a very narrow container, a plain "Book
 * Appointment Now" link) as a sibling of that tag, and redirects the whole
 * page away if the tag's parent is <head> or <html>. next/script always
 * appends scripts to the end of `document.body` regardless of where the
 * component is rendered, which would either strand the widget below the
 * footer or (worse) sit it directly under <body>, so this loads the script
 * with a plain DOM call into `containerRef` instead, which keeps it inline
 * inside this card and never as a child of <head>/<html>.
 */
const SQUARE_EMBED_SRC =
  "https://square.site/appointments/buyer/widget/90mlhehr81npoq/LB873P50HQF76.js";

/** How long to wait before treating a silent, non-erroring load as failed. */
const LOAD_TIMEOUT_MS = 12_000;

type Status = "loading" | "ready" | "error";

export function SquareBooking() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("loading");

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Guards React Strict Mode's double-invoked effect from inserting the
    // script, and the iframe it creates, twice into the same container.
    if (container.querySelector(`script[src="${SQUARE_EMBED_SRC}"]`)) return;

    let settled = false;
    const timeout = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      setStatus("error");
    }, LOAD_TIMEOUT_MS);

    const script = document.createElement("script");
    script.src = SQUARE_EMBED_SRC;
    script.async = true;
    script.addEventListener("load", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      // Square's script never sets a title on the iframe it inserts. Adding
      // one is an accessibility fix, not a change to Square's own UI.
      const iframe = container.querySelector("iframe");
      if (iframe && !iframe.title) {
        iframe.title = "Square Appointments booking";
      }
      setStatus("ready");
    });
    script.addEventListener("error", () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      setStatus("error");
    });

    container.appendChild(script);

    return () => window.clearTimeout(timeout);
  }, []);

  return (
    <div
      aria-label="Appointment scheduler"
      className="relative h-[600px] w-full overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-soft sm:h-[680px] lg:h-[760px]"
    >
      {/*
        Always mounted at full size, loading or not: Square's script measures
        this element's width the instant it runs, and a collapsed or hidden
        container would read as too narrow and fall back to a plain link
        instead of the real scheduler.
      */}
      <div ref={containerRef} className="h-full w-full" />

      {status !== "ready" ? (
        <div
          role="status"
          aria-live="polite"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface px-6 text-center"
        >
          {status === "loading" ? (
            <>
              <CircleNotch
                size={28}
                weight="bold"
                aria-hidden="true"
                className="animate-spin text-accent motion-reduce:animate-none"
              />
              <p className="text-sm text-muted">Loading the scheduler…</p>
            </>
          ) : (
            <>
              <WarningCircle
                size={28}
                weight="regular"
                aria-hidden="true"
                className="text-danger"
              />
              <p className="max-w-[32ch] text-base text-ink">
                Booking is temporarily unavailable. Please try again shortly.
              </p>
              <p className="text-sm text-muted">
                Or reach the studio directly:{" "}
                <a
                  href={REACH.href}
                  className="text-accent underline underline-offset-4"
                >
                  {REACH.label}
                </a>
              </p>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
