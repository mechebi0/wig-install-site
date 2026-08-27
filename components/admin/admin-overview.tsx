"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/ssr";
import { EmptyState, LoadingPanel, Notice, StatusPill } from "@/components/ui/feedback";
import { fetchAdminStats, fetchAppointments, bookingName, bookingType } from "@/lib/admin";
import { formatDateShort, formatTime } from "@/lib/format";
import type { AdminStats, AppointmentWithCustomer } from "@/lib/supabase/types";

/**
 * The first screen. What needs Nat's attention, and what is coming.
 *
 * ---------------------------------------------------------------------------
 * SIX NUMBERS, AND WHY THEY ARE THESE SIX
 * ---------------------------------------------------------------------------
 * Every one answers a question Nat would otherwise have to go and look for:
 *
 *   Awaiting confirmation   people waiting on a text from her. First, because
 *                           it is the only number that is a to-do list
 *   Asked to move           reschedule requests, the other kind of to-do
 *   Upcoming                how full the diary is
 *   Done this month         the closest thing to a takings figure that does
 *                           not require inventing payment data
 *   Customers / Guests      the split, which is the one thing that tells her
 *                           whether accounts are worth anything to her
 *
 * They come from one RPC rather than six queries, and that function refuses
 * anyone who is not an admin itself rather than trusting the caller.
 *
 * There are no percentages, no trend arrows and no comparison to last month. A
 * one-chair studio has small enough numbers that a "+12%" on a change from
 * eight to nine would be actively misleading.
 */
export function AdminOverview({
  onGoTo,
}: {
  onGoTo: (tab: "appointments" | "locations" | "services" | "customers") => void;
}) {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [next, setNext] = useState<AppointmentWithCustomer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let live = true;

    Promise.all([fetchAdminStats(), fetchAppointments("upcoming")]).then(
      ([statsResult, upcoming]) => {
        if (!live) return;
        setStats(statsResult.stats);
        setNext(upcoming.appointments.slice(0, 6));
        setError(statsResult.error || upcoming.error);
        setLoading(false);
      },
    );

    return () => {
      live = false;
    };
  }, []);

  if (loading) return <LoadingPanel label="Opening the books" />;

  return (
    <div className="flex flex-col gap-12">
      {error ? (
        <Notice tone="error" title="Some of this would not load.">
          {error}
        </Notice>
      ) : null}

      <section aria-labelledby="stats-heading">
        <h2 id="stats-heading" className="sr-only">
          At a glance
        </h2>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          <Stat
            label="Awaiting confirmation"
            value={stats?.pending ?? 0}
            hint="Waiting on a text from you"
            emphasis={(stats?.pending ?? 0) > 0}
            onClick={() => onGoTo("appointments")}
          />
          <Stat
            label="Asked to move"
            value={stats?.reschedule_requests ?? 0}
            hint="Customers wanting another time"
            emphasis={(stats?.reschedule_requests ?? 0) > 0}
            onClick={() => onGoTo("appointments")}
          />
          <Stat
            label="Upcoming"
            value={stats?.upcoming ?? 0}
            hint="In the diary from now on"
            onClick={() => onGoTo("appointments")}
          />
          <Stat
            label="Done this month"
            value={stats?.completed_this_month ?? 0}
            hint="Marked completed"
          />
          <Stat
            label="Customers"
            value={stats?.customers ?? 0}
            hint="With an account"
            onClick={() => onGoTo("customers")}
          />
          <Stat
            label="Guest bookings"
            value={stats?.guest_bookings ?? 0}
            hint="Booked without an account"
          />
        </div>
      </section>

      <section aria-labelledby="next-heading">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2
            id="next-heading"
            className="font-display text-2xl tracking-tight text-ink lg:text-3xl"
          >
            Next in the chair
          </h2>
          <button
            type="button"
            onClick={() => onGoTo("appointments")}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 text-sm text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
          >
            See every appointment
            <ArrowRight size={15} weight="regular" aria-hidden="true" />
          </button>
        </div>

        {next.length > 0 ? (
          <ul className="mt-6 overflow-hidden rounded-3xl border border-line-strong bg-surface">
            {next.map((appointment, index) => (
              <li
                key={appointment.id}
                className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 lg:px-6 ${
                  index > 0 ? "border-t border-line" : ""
                }`}
              >
                <span className="tabular w-[5.5rem] shrink-0 text-sm text-muted">
                  {formatDateShort(appointment.appointment_date)}
                </span>
                <span className="tabular w-20 shrink-0 text-sm text-ink">
                  {formatTime(appointment.appointment_time)}
                </span>
                <span className="min-w-0 flex-1 basis-48 text-base text-ink">
                  {bookingName(appointment)}
                  <span className="block text-sm text-muted">
                    {appointment.service_name_snapshot} ·{" "}
                    {appointment.location_name_snapshot} ·{" "}
                    {bookingType(appointment)}
                  </span>
                </span>
                <StatusPill status={appointment.status} short />
              </li>
            ))}
          </ul>
        ) : (
          <div className="mt-6">
            <EmptyState
              title="The diary is clear."
              body="Nothing booked from now on. Check that a location is switched on, or the booking page will be telling people you are closed."
            />
          </div>
        )}
      </section>
    </div>
  );
}

/**
 * One number.
 *
 * `emphasis` is what makes the two to-do counters look different from the four
 * informational ones, and it only fires when the count is above zero. Zero
 * pending appointments is good news and should look calm; three is a job and
 * should catch the eye. A card that is always rose is a card nobody sees.
 */
function Stat({
  label,
  value,
  hint,
  emphasis = false,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  emphasis?: boolean;
  onClick?: () => void;
}) {
  const body = (
    <>
      <p
        className={`label ${emphasis ? "text-accent" : "text-muted"}`}
      >
        {label}
      </p>
      <p className="tabular mt-4 font-display text-4xl leading-none tracking-tight text-ink lg:text-5xl">
        {value}
      </p>
      <p className="mt-3 text-sm leading-snug text-muted">{hint}</p>
    </>
  );

  const shell = `flex flex-col rounded-3xl border p-6 text-left transition-[border-color,background-color] duration-200 ${
    emphasis
      ? "border-accent/30 bg-accent-soft"
      : "border-line-strong bg-surface"
  }`;

  if (!onClick) {
    return <div className={shell}>{body}</div>;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={`${shell} cursor-pointer hover:border-accent`}
    >
      {body}
      <span className="sr-only">, open the appointments list</span>
    </button>
  );
}
