"use client";

import { useCallback, useEffect, useState } from "react";
import { CaretDown, Envelope, Phone } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import {
  EmptyState,
  LoadingPanel,
  Notice,
  Spinner,
  StatusPill,
  statusLabel,
} from "@/components/ui/feedback";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import {
  bookingEmail,
  bookingName,
  bookingPhone,
  bookingType,
  fetchAppointments,
  rescheduleAppointment,
  setAdminNote,
  updateAppointmentStatus,
  type AppointmentScope,
} from "@/lib/admin";
import { SLOT_STEP_MINUTES } from "@/lib/booking/availability";
import {
  formatDateLong,
  formatDateShort,
  formatPrice,
  formatTime,
  minutesToTime,
  timeToMinutes,
} from "@/lib/format";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
  type AppointmentWithCustomer,
} from "@/lib/supabase/types";

/**
 * The books.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO <table>
 * ---------------------------------------------------------------------------
 * A table is the right element for tabular data and the wrong one for this,
 * because every row here has to open. Nat does not read an appointment, she
 * acts on one: confirms it, moves it, writes a note against it, taps the phone
 * number. Those controls do not fit in a cell, and the standard workaround is
 * a modal, which on a phone means losing the list you were working through.
 *
 * So each appointment is a disclosure: a dense summary line that expands in
 * place. That gives a real table's scannability at desktop, works on a 360px
 * screen without a horizontal scrollbar, and keeps the row in view while it is
 * being edited. `aria-expanded` and `aria-controls` make it a disclosure to a
 * screen reader too, rather than a div that happens to change size.
 *
 * ---------------------------------------------------------------------------
 * GUEST AND ACCOUNT BOOKINGS IN ONE LIST
 * ---------------------------------------------------------------------------
 * They are the same table and the same list, marked with a badge. A separate
 * "guest bookings" screen would mean Nat checking two places to find out who
 * is coming on Thursday, which is the only question this page exists to
 * answer. The contact details resolve from whichever set of columns is
 * populated; see bookingName() in lib/admin.ts.
 */
const SCOPES: { id: AppointmentScope; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "today", label: "Today" },
  { id: "pending", label: "Awaiting you" },
  { id: "past", label: "Past" },
  { id: "all", label: "Everything" },
];

/** The half-hour grid, offered for an admin reschedule. */
const TIME_OPTIONS = (() => {
  const times: string[] = [];
  for (
    let minutes = timeToMinutes("08:00");
    minutes <= timeToMinutes("19:00");
    minutes += SLOT_STEP_MINUTES
  ) {
    times.push(minutesToTime(minutes));
  }
  return times;
})();

export function AdminAppointments() {
  const [scope, setScope] = useState<AppointmentScope>("upcoming");
  const [openId, setOpenId] = useState<string | null>(null);

  /*
    The result carries the scope it belongs to, and `loading` is DERIVED from
    comparing the two rather than being its own flag.

    That falls out of a constraint worth understanding: setting `loading` to
    true synchronously inside the effect that starts the fetch is a cascading
    render, so the flag has to come from somewhere else. Attaching the scope to
    the result turns out to be better than the flag it replaces:

      - switching filter shows the spinner immediately, because the stored
        scope no longer matches the requested one
      - a refresh after Nat confirms an appointment does NOT blank the list.
        The scope still matches, so the rows stay on screen and are quietly
        replaced. A full-panel spinner after every status change would throw
        away her scroll position twenty times a morning
      - a slow response for a filter she has already navigated away from is
        discarded on arrival rather than painted over the current one
  */
  const [result, setResult] = useState<{
    scope: AppointmentScope;
    rows: AppointmentWithCustomer[];
    error: string;
  } | null>(null);

  /** Bumped by the row actions to force a refetch of the current scope. */
  const [refreshToken, setRefreshToken] = useState(0);

  useEffect(() => {
    let live = true;

    fetchAppointments(scope).then(({ appointments, error: failed }) => {
      if (!live) return;
      setResult({ scope, rows: appointments, error: failed });
    });

    return () => {
      live = false;
    };
  }, [scope, refreshToken]);

  const loading = result?.scope !== scope;
  const rows = result?.scope === scope ? result.rows : [];
  const error = result?.scope === scope ? result.error : "";
  const reload = useCallback(() => setRefreshToken((n) => n + 1), []);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h2 className="font-display text-2xl tracking-tight text-ink lg:text-3xl">
          Appointments
        </h2>
        <p className="mt-2 max-w-[60ch] text-base leading-relaxed text-muted">
          Every booking, whether the customer has an account or booked as a
          guest. Open one to confirm it, move it, or leave yourself a note.
        </p>
      </div>

      {/* --------------------------------------------------------- scope --- */}
      <div className="no-scrollbar -mx-5 flex gap-2 overflow-x-auto px-5 sm:mx-0 sm:px-0">
        {SCOPES.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setScope(item.id);
              setOpenId(null);
            }}
            aria-pressed={scope === item.id}
            className={`min-h-11 shrink-0 cursor-pointer whitespace-nowrap rounded-full border px-5 text-sm transition-colors duration-200 ${
              scope === item.id
                ? "border-accent bg-accent text-on-accent"
                : "border-line-strong bg-surface text-muted hover:border-accent hover:text-accent"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}

      {loading ? (
        <LoadingPanel label="Reading the diary" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nothing here."
          body="No appointments match this filter. Try another one, or check that a location is switched on so the booking page is open."
        />
      ) : (
        <ul className="overflow-hidden rounded-3xl border border-line-strong bg-surface">
          {rows.map((appointment, index) => (
            <li
              key={appointment.id}
              className={index > 0 ? "border-t border-line" : ""}
            >
              <AppointmentRow
                appointment={appointment}
                open={openId === appointment.id}
                onToggle={() =>
                  setOpenId((current) =>
                    current === appointment.id ? null : appointment.id,
                  )
                }
                onChanged={reload}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AppointmentRow({
  appointment,
  open,
  onToggle,
  onChanged,
}: {
  appointment: AppointmentWithCustomer;
  open: boolean;
  onToggle: () => void;
  onChanged: () => void;
}) {
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  const [date, setDate] = useState(appointment.appointment_date);
  const [time, setTime] = useState(appointment.appointment_time.slice(0, 5));
  const [note, setNote] = useState(appointment.admin_note ?? "");

  const panelId = `appointment-${appointment.id}`;
  const asked = Boolean(appointment.reschedule_requested_at);

  async function changeStatus(status: AppointmentStatus) {
    setBusy("status");
    setError("");
    setSaved("");
    const { error: failed } = await updateAppointmentStatus(appointment.id, status);
    setBusy("");
    if (failed) {
      setError(failed);
      return;
    }
    setSaved(`Marked ${statusLabel(status, true).toLowerCase()}.`);
    onChanged();
  }

  async function move() {
    setBusy("move");
    setError("");
    setSaved("");
    const { error: failed } = await rescheduleAppointment(appointment.id, date, time);
    setBusy("");
    if (failed) {
      setError(failed);
      return;
    }
    setSaved("Moved. The customer sees the new time in their account.");
    onChanged();
  }

  async function saveNote() {
    setBusy("note");
    setError("");
    setSaved("");
    const { error: failed } = await setAdminNote(appointment.id, note);
    setBusy("");
    if (failed) {
      setError(failed);
      return;
    }
    setSaved("Note saved.");
    onChanged();
  }

  const email = bookingEmail(appointment);
  const phone = bookingPhone(appointment);

  return (
    <>
      {/* ------------------------------------------------------ summary --- */}
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer flex-wrap items-center gap-x-5 gap-y-2 px-5 py-4 text-left transition-colors hover:bg-surface-2/60 lg:px-6"
      >
        <span className="tabular w-[5.5rem] shrink-0 text-sm text-muted">
          {formatDateShort(appointment.appointment_date)}
        </span>
        <span className="tabular w-20 shrink-0 text-sm text-ink">
          {formatTime(appointment.appointment_time)}
        </span>

        <span className="min-w-0 flex-1 basis-52">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-base text-ink">{bookingName(appointment)}</span>
            <span
              className={`rounded-full border px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.1em] ${
                bookingType(appointment) === "Guest"
                  ? "border-line-strong text-muted"
                  : "border-accent/30 text-accent"
              }`}
            >
              {bookingType(appointment)}
            </span>
            {asked ? (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-[0.6875rem] uppercase tracking-[0.1em] text-accent">
                Asked to move
              </span>
            ) : null}
          </span>
          <span className="mt-0.5 block text-sm text-muted">
            {appointment.service_name_snapshot} ·{" "}
            {appointment.location_name_snapshot}
          </span>
        </span>

        <StatusPill status={appointment.status} short />

        <CaretDown
          size={16}
          weight="regular"
          aria-hidden="true"
          className={`shrink-0 text-muted transition-transform duration-200 motion-reduce:transition-none ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>

      {/* ------------------------------------------------------- detail --- */}
      {open ? (
        <div
          id={panelId}
          className="border-t border-line bg-surface-2/40 px-5 py-6 lg:px-6"
        >
          <div className="grid gap-7 lg:grid-cols-2">
            {/* ---------------- who and what ---------------- */}
            <div>
              <h3 className="label text-muted">The booking</h3>
              <dl className="mt-4 flex flex-col gap-3 text-sm">
                <Pair label="When">
                  {formatDateLong(appointment.appointment_date)} at{" "}
                  {formatTime(appointment.appointment_time)}
                </Pair>
                <Pair label="Service">
                  {appointment.service_name_snapshot}
                  {appointment.price_cents_snapshot !== null
                    ? ` · ${formatPrice(appointment.price_cents_snapshot)}`
                    : ""}
                </Pair>
                <Pair label="Location">{appointment.location_name_snapshot}</Pair>
                <Pair label="Booked as">{bookingType(appointment)}</Pair>
                <Pair label="Reference">
                  <span className="tabular">{appointment.reference}</span>
                </Pair>
              </dl>

              {/* Contact. Real links, because on a phone they dial and compose. */}
              <div className="mt-5 flex flex-wrap gap-2">
                {phone ? (
                  <a
                    href={`tel:${phone.replace(/[^+\d]/g, "")}`}
                    className="inline-flex min-h-11 items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    <Phone size={15} weight="regular" aria-hidden="true" />
                    {phone}
                  </a>
                ) : null}
                {email ? (
                  <a
                    href={`mailto:${email}`}
                    className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-line-strong bg-surface px-4 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
                  >
                    <Envelope size={15} weight="regular" aria-hidden="true" />
                    <span className="truncate">{email}</span>
                  </a>
                ) : null}
              </div>

              {appointment.notes ? (
                <p className="mt-5 rounded-3xl border border-line bg-surface p-4 text-sm leading-relaxed text-muted">
                  <span className="text-ink">From the customer: </span>
                  {appointment.notes}
                </p>
              ) : null}

              {asked ? (
                <div className="mt-4">
                  <Notice tone="info" title="They asked to move this one.">
                    {appointment.reschedule_note ||
                      "No preferred times given. Give them a call."}
                  </Notice>
                </div>
              ) : null}
            </div>

            {/* ---------------- actions ---------------- */}
            <div className="flex flex-col gap-6">
              <div>
                <h3 className="label text-muted">Status</h3>
                <div className="mt-4 flex flex-wrap gap-2">
                  {APPOINTMENT_STATUSES.map((status) => {
                    const current = appointment.status === status;
                    return (
                      <button
                        key={status}
                        type="button"
                        disabled={current || busy === "status"}
                        onClick={() => changeStatus(status)}
                        aria-pressed={current}
                        className={`min-h-11 cursor-pointer rounded-full border px-4 text-sm transition-colors duration-200 disabled:cursor-default ${
                          current
                            ? "border-accent bg-accent text-on-accent"
                            : "border-line-strong bg-surface text-muted hover:border-accent hover:text-accent"
                        }`}
                      >
                        {statusLabel(status, true)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="label text-muted">Move it</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <TextField
                    id={`date-${appointment.id}`}
                    label="New date"
                    type="date"
                    value={date}
                    onChange={(event) => setDate(event.target.value)}
                  />
                  <SelectField
                    id={`time-${appointment.id}`}
                    label="New time"
                    value={time}
                    onChange={(event) => setTime(event.target.value)}
                  >
                    {TIME_OPTIONS.map((option) => (
                      <option key={option} value={option}>
                        {formatTime(option)}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <button
                  type="button"
                  onClick={move}
                  disabled={busy === "move"}
                  className={`${buttonStyles.secondary} mt-4`}
                >
                  {busy === "move" ? <Spinner size={16} /> : null}
                  Move this appointment
                </button>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  The studio cannot be in two places at once, so a time that
                  clashes with another live appointment at this location will be
                  refused.
                </p>
              </div>

              <div>
                <h3 className="label text-muted">Your note</h3>
                <div className="mt-4">
                  <TextAreaField
                    id={`note-${appointment.id}`}
                    label="Private to you"
                    value={note}
                    rows={3}
                    onChange={(event) => setNote(event.target.value)}
                    help="The customer never sees this."
                  />
                </div>
                <button
                  type="button"
                  onClick={saveNote}
                  disabled={busy === "note"}
                  className={`${buttonStyles.secondary} mt-4`}
                >
                  {busy === "note" ? <Spinner size={16} /> : null}
                  Save note
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-6">
              <Notice tone="error">{error}</Notice>
            </div>
          ) : null}
          {saved ? (
            <div className="mt-6">
              <Notice tone="success">{saved}</Notice>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}

function Pair({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap gap-x-4">
      <dt className="w-24 shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 flex-1 text-ink">{children}</dd>
    </div>
  );
}
