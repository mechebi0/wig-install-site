"use client";

import { useCallback, useEffect, useState } from "react";
import { LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { fetchAllLocations, setLocationActive } from "@/lib/admin";
import { formatLocationList } from "@/lib/catalog";
import type { Location } from "@/lib/supabase/types";

/**
 * Where Crowned by Nat is taking appointments.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS SWITCH ACTUALLY DOES, AND WHAT IT DELIBERATELY DOES NOT
 * ---------------------------------------------------------------------------
 * Flipping one of these changes three things at once, live, with no redeploy:
 * the announcement stripe at the top of every page, which locations the booking
 * flow offers, and which locations the database will accept a booking for.
 * The last of those is the real one; the first two are the database's answer
 * being displayed.
 *
 * It changes NOTHING about existing appointments, and the panel says so on
 * screen because it is the question Nat will have. Every appointment carries
 * its own location_name_snapshot, written the moment it was booked, so
 * switching the site from Towson to Laurel leaves every Towson booking reading
 * "Towson, MD" forever. That is a column in the table, not a promise made by
 * this component.
 *
 * ---------------------------------------------------------------------------
 * ALL FOUR STATES ARE REACHABLE, INCLUDING NONE
 * ---------------------------------------------------------------------------
 * Towson, Laurel, both, or neither. Nothing here prevents switching both off,
 * and it should not: "closed while I move studios" is a real thing a business
 * does. The site handles it honestly rather than falling back to a stale city
 * name, so the stripe says the chair is between studios and the booking page
 * offers a phone number instead of a form.
 *
 * The warning below appears when the last one is switched off, because it is a
 * consequential change that is easy to make by accident. It informs; it does
 * not block.
 */
export function AdminLocations() {
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  /*
    Written as a `.then()` rather than an async function with awaits in it, so
    the setState calls land in a promise callback instead of in the body of the
    effect that starts it. React treats a synchronous setState inside an effect
    as a cascading render, and it is right to: the component would render,
    commit, immediately set state, and render again before the browser painted.
  */
  const load = useCallback(
    () =>
      fetchAllLocations().then(({ locations: found, error: failed }) => {
        setLocations(found);
        setError(failed);
        setLoading(false);
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  async function toggle(location: Location) {
    setBusyId(location.id);
    setError("");

    /*
      Optimistic. The switch has to feel instant or it feels broken, and the
      only way it can fail is a policy refusal, which means the person doing it
      is not an admin, which means they are not seeing this screen anyway. On
      the off chance it does fail, load() puts the truth back.
    */
    const next = !location.active;
    setLocations((current) =>
      current.map((item) =>
        item.id === location.id ? { ...item, active: next } : item,
      ),
    );

    const { error: failed } = await setLocationActive(location.id, next);
    setBusyId(null);

    if (failed) {
      setError(failed);
      void load();
    }
  }

  if (loading) return <LoadingPanel label="Loading your studios" />;

  const active = locations.filter((location) => location.active);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">
          Locations
        </h2>
        <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
          Switch a studio on and it appears above the homepage hero and in the
          booking flow straight away. Switch it off and it stops taking new
          appointments. Existing bookings never move.
        </p>
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {/* ------------------------------------------------- what is live --- */}
      <div className="rounded-3xl border border-accent/25 bg-accent-soft p-6">
        <p className="label text-muted">The site currently says</p>
        <p className="mt-3 font-display text-2xl leading-snug tracking-tight text-ink">
          {active.length > 0 ? (
            <>Now booking in {formatLocationList(active)}</>
          ) : (
            <>The chair is between studios just now</>
          )}
        </p>
      </div>

      {active.length === 0 ? (
        <Notice tone="error" title="Nothing is open.">
          The booking page is showing a phone number instead of a form, and the
          homepage says you are between studios. That is the correct behaviour
          for a closed week, but switch a studio back on when you are ready or
          nobody can book.
        </Notice>
      ) : null}

      {/* ----------------------------------------------------- switches --- */}
      <ul className="grid gap-3 sm:grid-cols-2">
        {locations.map((location) => (
          <li key={location.id}>
            <div
              className={`flex h-full flex-col rounded-3xl border p-6 transition-colors duration-200 ${
                location.active
                  ? "border-accent/30 bg-surface"
                  : "border-line bg-surface-2/50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="font-display text-2xl tracking-tight text-ink">
                    {location.name}
                  </h3>
                  <p className="mt-1 text-sm text-muted">
                    {location.city}, {location.state}
                  </p>
                </div>
                {busyId === location.id ? (
                  <span className="pt-2 text-accent">
                    <Spinner size={18} label="Saving" />
                  </span>
                ) : null}
              </div>

              <p className="mt-5 flex-1 text-sm leading-relaxed text-muted">
                {location.active
                  ? "Taking appointments. Customers can pick this studio when they book."
                  : "Closed. Hidden from the site, and the database will refuse a booking for it."}
              </p>

              <div className="mt-6">
                <Switch
                  checked={location.active}
                  disabled={busyId === location.id}
                  onToggle={() => toggle(location)}
                  label={`${location.name} is ${location.active ? "open" : "closed"}`}
                  onLabel="Open"
                  offLabel="Closed"
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * A real switch, not a styled checkbox pretending to be one.
 *
 * `role="switch"` with `aria-checked` is what makes a screen reader say "open,
 * switch, on" rather than "button". The visible word beside it changes too:
 * position and colour alone would leave anyone who cannot see it, or who has
 * trouble telling the rose from the blush, guessing which end is on.
 */
function Switch({
  checked,
  disabled,
  onToggle,
  label,
  onLabel,
  offLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
  label: string;
  onLabel: string;
  offLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onToggle}
      className="group inline-flex min-h-11 cursor-pointer items-center gap-3 rounded-full disabled:cursor-wait disabled:opacity-60"
    >
      <span
        aria-hidden="true"
        className={`relative block h-7 w-12 rounded-full border transition-colors duration-200 ${
          checked
            ? "border-accent bg-accent"
            : "border-line-strong bg-surface-3 group-hover:border-accent"
        }`}
      >
        <span
          className={`absolute top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-surface shadow-soft transition-[left] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            checked ? "left-[1.4rem]" : "left-0.5"
          }`}
        />
      </span>
      <span
        className={`text-sm font-medium ${checked ? "text-accent" : "text-muted"}`}
      >
        {checked ? onLabel : offLabel}
      </span>
    </button>
  );
}
