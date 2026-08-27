"use client";

import type { ReactNode } from "react";
import {
  CheckCircle,
  CircleNotch,
  Info,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import type { AppointmentStatus } from "@/lib/supabase/types";

/**
 * Status, loading and message surfaces, shared by the booking flow, the
 * customer account and the admin dashboard.
 *
 * The accent lock in globals.css says rose is the only brand colour, and
 * nothing here breaks it. Appointment status is communicated by SURFACE WEIGHT
 * within the existing palette (filled rose, soft rose, plain blush, hairline)
 * plus a word, never by inventing a green and an amber. Two reasons, and the
 * second is the more important one:
 *
 *   1. A luxury blush brand with a traffic-light system in the middle of it
 *      stops looking like a luxury blush brand.
 *   2. Colour is not information. Every pill here says "Confirmed" or
 *      "Cancelled" in words, so it works in greyscale, at 200% zoom, and for
 *      the ~8% of people who would not have seen the green anyway.
 *
 * `danger` is the one semantic colour, used only for genuine errors, exactly
 * as globals.css reserves it.
 */

export function Spinner({
  size = 18,
  label,
}: {
  size?: number;
  label?: string;
}) {
  return (
    <>
      <CircleNotch
        size={size}
        weight="bold"
        aria-hidden="true"
        className="animate-spin motion-reduce:animate-none"
      />
      {label ? <span className="sr-only">{label}</span> : null}
    </>
  );
}

/** Full-block loading state, for a panel that has nothing to show yet. */
export function LoadingPanel({ label = "Loading" }: { label?: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-40 flex-col items-center justify-center gap-3 rounded-3xl border border-line bg-surface p-10 text-muted"
    >
      <Spinner size={22} />
      <p className="text-sm">{label}</p>
    </div>
  );
}

type NoticeTone = "info" | "success" | "error";

const NOTICE_TONES: Record<
  NoticeTone,
  { wrap: string; icon: string; Icon: typeof Info; role: "status" | "alert" }
> = {
  info: {
    wrap: "border-line-strong bg-surface-2",
    icon: "text-muted",
    Icon: Info,
    role: "status",
  },
  success: {
    wrap: "border-accent/25 bg-accent-soft",
    icon: "text-accent",
    Icon: CheckCircle,
    role: "status",
  },
  error: {
    wrap: "border-danger/30 bg-danger/5",
    icon: "text-danger",
    Icon: WarningCircle,
    role: "alert",
  },
};

/**
 * An inline message.
 *
 * `role` is picked by tone, and the distinction matters: an error uses
 * role="alert", which interrupts a screen reader immediately, while success
 * and info use role="status", which waits for a pause. Marking everything as
 * an alert is how a form ends up shouting over someone mid-sentence.
 */
export function Notice({
  tone = "info",
  title,
  children,
}: {
  tone?: NoticeTone;
  title?: string;
  children: ReactNode;
}) {
  const config = NOTICE_TONES[tone];
  const { Icon } = config;

  return (
    <div
      role={config.role}
      className={`flex items-start gap-3 rounded-3xl border p-4 ${config.wrap}`}
    >
      <Icon
        size={20}
        weight="regular"
        aria-hidden="true"
        className={`mt-0.5 shrink-0 ${config.icon}`}
      />
      <div className="min-w-0 text-sm leading-relaxed text-ink">
        {title ? <p className="font-medium">{title}</p> : null}
        <div className={title ? "mt-1 text-muted" : "text-ink"}>{children}</div>
      </div>
    </div>
  );
}

const STATUS_LABELS: Record<AppointmentStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

/** The short form, for dense admin tables where the column is narrow. */
const STATUS_SHORT: Record<AppointmentStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  rescheduled: "Rescheduled",
};

const STATUS_STYLES: Record<AppointmentStatus, string> = {
  // The one that needs Nat's attention carries the most weight on the page.
  pending: "border-accent/30 bg-accent-soft text-accent",
  confirmed: "border-transparent bg-accent text-on-accent",
  completed: "border-line-strong bg-surface-2 text-muted",
  cancelled: "border-line-strong bg-transparent text-muted line-through",
  rescheduled: "border-accent/30 bg-surface text-accent",
};

export function statusLabel(status: AppointmentStatus, short = false): string {
  return short ? STATUS_SHORT[status] : STATUS_LABELS[status];
}

export function StatusPill({
  status,
  short = false,
}: {
  status: AppointmentStatus;
  short?: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {statusLabel(status, short)}
    </span>
  );
}

/** A quiet, centred "nothing here yet" with an optional way forward. */
export function EmptyState({
  title,
  body,
  children,
}: {
  title: string;
  body?: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-3xl border border-dashed border-line-strong bg-surface/60 px-6 py-14 text-center">
      <h3 className="font-display text-xl tracking-tight text-ink">{title}</h3>
      {body ? (
        <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-muted">
          {body}
        </p>
      ) : null}
      {children ? <div className="mt-7">{children}</div> : null}
    </div>
  );
}
