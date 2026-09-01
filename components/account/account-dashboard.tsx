"use client";

import { useCallback, useEffect, useState } from "react";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { Guarded } from "@/components/auth/guarded";
import { AppointmentCard } from "@/components/account/appointment-card";
import { AccountDetails } from "@/components/account/account-details";
import { EmptyState, LoadingPanel, Notice, StatusPill } from "@/components/ui/feedback";
import { fetchMyAppointments } from "@/lib/appointments";
import { signOut } from "@/lib/auth/session";
import { ACCOUNT_PATH, leaveTo } from "@/lib/auth/redirect";
import { formatDateMedium, formatTime } from "@/lib/format";
import type { Appointment, Profile } from "@/lib/supabase/types";
import { ACCOUNT, REACH } from "@/lib/content";

/**
 * MY CROWNED BY NAT. The customer's own appointments.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS THREE SECTIONS AND NOT A TABLE
 * ---------------------------------------------------------------------------
 * The admin dashboard is an operations screen and is built like one: rows,
 * filters, density, everything comparable at a glance. This is not that. A
 * customer has one appointment coming up, or none, and what they want from
 * this page is the answer to "when am I in, and where". So the next
 * appointment is a full card with the date at reading size, the past ones are
 * a quiet list underneath, and the details are last.
 *
 * A generic dashboard would show them all in one table sorted by date, which
 * gives equal weight to the haircut they had in March and the one they are
 * getting on Thursday.
 *
 * ---------------------------------------------------------------------------
 * THE QUERY THAT IS NOT FILTERED BY CUSTOMER
 * ---------------------------------------------------------------------------
 * fetchMyAppointments() selects from `appointments` with no customer clause on
 * it. That is not a bug and it is worth understanding before someone "fixes"
 * it: the SELECT policy restricts the table to `customer_id = auth.uid()`, so
 * the database returns this customer's rows and nothing else. Adding the
 * filter would suggest the filter is what protects it. It is not, and pretending
 * otherwise is how a client-side filter ends up being the only thing standing
 * between two customers' appointment histories.
 */
export function AccountDashboard() {
  return (
    <Guarded returnTo={ACCOUNT_PATH} heading="My Crowned by Nat">
      {({ profile }) => <Dashboard profile={profile} />}
    </Guarded>
  );
}

function Dashboard({ profile }: { profile: Profile | null }) {
  const [upcoming, setUpcoming] = useState<Appointment[]>([]);
  const [past, setPast] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  /*
    The upcoming/past split happens HERE, when the data lands, rather than
    during render, and that is not a style choice.

    "Upcoming" depends on Date.now(), which makes it an impure value: two
    renders a second apart can legitimately disagree about whether the 2pm has
    happened. React reserves the right to render a component twice and keep
    either result, so reading the clock during render is a bug waiting for a
    slow afternoon. Splitting it once, in the callback that receives the rows,
    gives every render of those rows the same answer.

    The comparison is against `starts_at`, the instant Postgres computed in the
    studio's timezone, rather than against the date string. Comparing dates
    would leave a 9am appointment sitting under "Upcoming" until midnight.
  */
  const load = useCallback(
    () =>
      fetchMyAppointments().then(({ appointments: found, error: failed }) => {
        const now = Date.now();
        const next = found
          .filter(
            (item) =>
              new Date(item.starts_at).getTime() >= now &&
              ["pending", "confirmed", "rescheduled"].includes(item.status),
          )
          .sort(
            (a, b) =>
              new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime(),
          );

        setUpcoming(next);
        setPast(found.filter((item) => !next.includes(item)));
        setError(failed);
        setLoading(false);
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const firstName = (profile?.full_name ?? "").trim().split(/\s+/)[0];

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-14 sm:px-8 lg:pb-32 lg:pt-20">
      {/* ------------------------------------------------------- header --- */}
      <header className="flex flex-wrap items-end justify-between gap-6 border-b border-line pb-9">
        <div>
          <p className="label text-accent">{ACCOUNT.dashboard.kicker}</p>
          <h1 className="mt-5 font-display text-4xl leading-[1.04] tracking-tight text-ink md:text-5xl">
            {firstName ? `Hello, ${firstName}.` : "Hello."}
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            void signOut().then(() => leaveTo("/"));
          }}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full text-sm text-muted transition-colors hover:text-accent"
        >
          <SignOut size={17} weight="regular" aria-hidden="true" />
          Log out
        </button>
      </header>

      {loading ? (
        <div className="mt-10">
          <LoadingPanel label="Fetching your appointments" />
        </div>
      ) : null}

      {error ? (
        <div className="mt-10">
          <Notice tone="error" title="Could not load your appointments.">
            {error} Refresh the page, or {REACH.phrase}.
          </Notice>
        </div>
      ) : null}

      {!loading && !error ? (
        <>
          {/* --------------------------------------------------- upcoming --- */}
          <section aria-labelledby="upcoming-heading" className="mt-12">
            <h2
              id="upcoming-heading"
              className="font-display text-2xl tracking-tight text-ink lg:text-3xl"
            >
              {upcoming.length === 1
                ? ACCOUNT.dashboard.upcoming
                : ACCOUNT.dashboard.upcomingPlural}
            </h2>

            {upcoming.length > 0 ? (
              <div className="mt-6 flex flex-col gap-5">
                {upcoming.map((appointment) => (
                  <AppointmentCard
                    key={appointment.id}
                    appointment={appointment}
                    onChanged={() => void load()}
                  />
                ))}
              </div>
            ) : (
              <div className="mt-6">
                <EmptyState
                  title={ACCOUNT.dashboard.empty}
                  body={ACCOUNT.dashboard.emptyBody}
                >
                  <a href="/book/" className={buttonStyles.primary}>
                    {ACCOUNT.dashboard.bookFirst}
                  </a>
                </EmptyState>
              </div>
            )}

            {upcoming.length > 0 ? (
              <div className="mt-7">
                <a href="/book/" className={buttonStyles.secondary}>
                  {ACCOUNT.dashboard.bookAnother}
                </a>
              </div>
            ) : null}
          </section>

          {/* ------------------------------------------------------- past --- */}
          {past.length > 0 ? (
            <section aria-labelledby="past-heading" className="mt-16">
              <h2
                id="past-heading"
                className="font-display text-2xl tracking-tight text-ink lg:text-3xl"
              >
                {ACCOUNT.dashboard.past}
              </h2>

              <ul className="mt-6 overflow-hidden rounded-3xl border border-line-strong bg-surface">
                {past.map((appointment, index) => (
                  <li
                    key={appointment.id}
                    className={`flex flex-wrap items-center gap-x-5 gap-y-2 px-6 py-5 ${
                      index > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <span className="tabular w-28 shrink-0 text-sm text-muted">
                      {formatDateMedium(appointment.appointment_date)}
                    </span>
                    <span className="min-w-0 flex-1 text-base text-ink">
                      {appointment.service_name_snapshot}
                      <span className="block text-sm text-muted">
                        {appointment.location_name_snapshot} ·{" "}
                        {formatTime(appointment.appointment_time)}
                      </span>
                    </span>
                    <StatusPill status={appointment.status} short />
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          {/* ---------------------------------------------------- details --- */}
          {profile ? (
            <section aria-labelledby="details-heading" className="mt-16">
              <h2
                id="details-heading"
                className="font-display text-2xl tracking-tight text-ink lg:text-3xl"
              >
                {ACCOUNT.dashboard.details}
              </h2>
              <p className="mt-2 max-w-[56ch] text-base leading-relaxed text-muted">
                These fill in the booking form for you, so it is worth keeping
                the number current.
              </p>
              <div className="mt-7 max-w-[46rem]">
                <AccountDetails profile={profile} onSaved={() => void load()} />
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
