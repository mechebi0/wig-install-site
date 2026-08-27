"use client";

import { useState } from "react";
import { CalendarBlank, Clock, MapPin } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { Notice, Spinner, StatusPill } from "@/components/ui/feedback";
import { TextAreaField } from "@/components/ui/form";
import {
  canCancel,
  cancelAppointment,
  requestReschedule,
  CANCEL_CUTOFF_HOURS,
} from "@/lib/appointments";
import {
  formatDateLong,
  formatDuration,
  formatPrice,
  formatTime,
} from "@/lib/format";
import type { Appointment } from "@/lib/supabase/types";
import { STUDIO } from "@/lib/content";

/**
 * One upcoming appointment, with the two things a customer is allowed to do
 * to it.
 *
 * ---------------------------------------------------------------------------
 * WHY THERE IS NO "RESCHEDULE" BUTTON, ONLY "ASK TO MOVE IT"
 * ---------------------------------------------------------------------------
 * Rescheduling looks like it should be a date picker. It is not, for a reason
 * that only shows up under concurrency: two customers moving into the same
 * gap at the same moment would race the no-overlap constraint, one of them
 * would meet a raw database error at the end of a flow they thought had
 * worked, and Nat would find her Saturday rearranged by someone who cannot see
 * the rest of it.
 *
 * So the customer sends a request with the times that suit them, Nat moves it
 * from the dashboard where she can see the whole day, and the customer gets a
 * text. This is enforced rather than merely offered: protect_appointment_columns()
 * resets appointment_date and appointment_time for any caller who is not an
 * admin, so a rebuilt request that tries to move the booking directly changes
 * nothing.
 *
 * Cancelling IS immediate, because it only ever frees a slot and can never
 * collide with anything. The 24 hour cutoff is enforced in the same trigger,
 * and `canCancel` here mirrors it so the button is not offered when it would
 * be refused.
 *
 * ---------------------------------------------------------------------------
 * WHY CANCELLING TAKES TWO CLICKS AND NOT A window.confirm()
 * ---------------------------------------------------------------------------
 * A native confirm dialog is unstyled, unbrandable, blocks the whole page, and
 * on some mobile browsers is suppressed entirely. The inline confirmation is a
 * real, focusable pair of buttons that says what will happen, and it can be
 * dismissed with Escape or by moving away from it.
 */
export function AppointmentCard({
  appointment,
  onChanged,
}: {
  appointment: Appointment;
  onChanged: () => void;
}) {
  const [mode, setMode] = useState<"idle" | "confirm-cancel" | "reschedule">("idle");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState("");

  const cancellable = canCancel(appointment);
  const live = ["pending", "confirmed", "rescheduled"].includes(appointment.status);
  const alreadyAsked = Boolean(appointment.reschedule_requested_at);

  async function doCancel() {
    setBusy(true);
    setError("");
    const { error: failed } = await cancelAppointment(appointment.id);
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    setMode("idle");
    onChanged();
  }

  async function doReschedule() {
    setBusy(true);
    setError("");
    const { error: failed } = await requestReschedule(appointment.id, note);
    setBusy(false);
    if (failed) {
      setError(failed);
      return;
    }
    setMode("idle");
    setDone("Nat has your request and will text you with some options.");
    onChanged();
  }

  return (
    <article className="overflow-hidden rounded-3xl border border-line-strong bg-surface shadow-soft">
      <div className="border-b border-line bg-accent-soft px-6 py-5 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="font-display text-2xl tracking-tight text-ink lg:text-[1.75rem]">
            {appointment.service_name_snapshot}
          </h3>
          <StatusPill status={appointment.status} />
        </div>
        {appointment.price_cents_snapshot !== null ? (
          <p className="tabular mt-1 text-sm text-muted">
            {formatPrice(appointment.price_cents_snapshot)}
            {appointment.duration_minutes
              ? ` · ${formatDuration(appointment.duration_minutes)} in the chair`
              : ""}
          </p>
        ) : null}
      </div>

      <div className="px-6 py-6 lg:px-8">
        <dl className="grid gap-5 sm:grid-cols-3">
          <Detail icon={<CalendarBlank size={17} weight="regular" />} label="Date">
            {formatDateLong(appointment.appointment_date)}
          </Detail>
          <Detail icon={<Clock size={17} weight="regular" />} label="Time">
            {formatTime(appointment.appointment_time)}
          </Detail>
          {/*
            The location comes from the SNAPSHOT column, never from a join to
            the locations table. That is the whole reason the column exists: if
            Nat moves the studio to Laurel next month, this appointment is
            still the Towson one it was booked as.
          */}
          <Detail icon={<MapPin size={17} weight="regular" />} label="Location">
            {appointment.location_name_snapshot}
          </Detail>
        </dl>

        {appointment.notes ? (
          <p className="mt-6 border-t border-line pt-5 text-sm leading-relaxed text-muted">
            <span className="text-ink">Your note: </span>
            {appointment.notes}
          </p>
        ) : null}

        {alreadyAsked && live ? (
          <div className="mt-6">
            <Notice tone="info" title="You asked to move this one.">
              Nat has the request and will text you with some options. The time
              above holds until she does.
            </Notice>
          </div>
        ) : null}

        {done ? (
          <div className="mt-6">
            <Notice tone="success">{done}</Notice>
          </div>
        ) : null}

        {error ? (
          <div className="mt-6">
            <Notice tone="error">{error}</Notice>
          </div>
        ) : null}

        {/* ---------------------------------------------- actions ---------- */}
        {live ? (
          <div className="mt-7 border-t border-line pt-6">
            {mode === "idle" ? (
              <div className="flex flex-col gap-3 sm:flex-row">
                {!alreadyAsked ? (
                  <button
                    type="button"
                    onClick={() => setMode("reschedule")}
                    className={buttonStyles.secondary}
                  >
                    Ask to move it
                  </button>
                ) : null}

                {cancellable ? (
                  <button
                    type="button"
                    onClick={() => setMode("confirm-cancel")}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full px-5 text-sm text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-danger hover:decoration-danger"
                  >
                    Cancel this appointment
                  </button>
                ) : (
                  <p className="flex min-h-11 items-center text-sm leading-relaxed text-muted">
                    Cancelling closes {CANCEL_CUTOFF_HOURS} hours before. Text
                    the studio on {STUDIO.phone}.
                  </p>
                )}
              </div>
            ) : null}

            {mode === "confirm-cancel" ? (
              <div
                onKeyDown={(event) => {
                  if (event.key === "Escape") setMode("idle");
                }}
                className="rounded-3xl border border-danger/30 bg-danger/5 p-5"
              >
                <p className="text-sm leading-relaxed text-ink">
                  Cancel your {appointment.service_name_snapshot.toLowerCase()} on{" "}
                  {formatDateLong(appointment.appointment_date)} at{" "}
                  {formatTime(appointment.appointment_time)}? The slot goes back
                  into the diary straight away and this cannot be undone.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={doCancel}
                    disabled={busy}
                    autoFocus
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-full bg-danger px-6 text-sm font-medium text-on-accent transition-opacity hover:opacity-90 disabled:opacity-55"
                  >
                    {busy ? <Spinner size={16} /> : null}
                    Yes, cancel it
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className={buttonStyles.secondary}
                  >
                    Keep my appointment
                  </button>
                </div>
              </div>
            ) : null}

            {mode === "reschedule" ? (
              <div
                onKeyDown={(event) => {
                  if (event.key === "Escape") setMode("idle");
                }}
                className="rounded-3xl border border-line-strong bg-surface-2/60 p-5"
              >
                <TextAreaField
                  id={`reschedule-${appointment.id}`}
                  label="When would suit you better?"
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  help="A couple of days or times that work. Nat will text you back."
                  autoFocus
                />
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="button"
                    onClick={doReschedule}
                    disabled={busy || !note.trim()}
                    className={buttonStyles.primary}
                  >
                    {busy ? <Spinner size={16} /> : null}
                    Send the request
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("idle")}
                    className={buttonStyles.secondary}
                  >
                    Never mind
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </article>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="flex items-center gap-2 text-sm text-muted">
        <span aria-hidden="true" className="text-accent">
          {icon}
        </span>
        {label}
      </dt>
      <dd className="mt-1.5 text-base leading-snug text-ink">{children}</dd>
    </div>
  );
}
