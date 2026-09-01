"use client";

import { CalendarCheck } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { StatusPill } from "@/components/ui/feedback";
import { formatDateLong, formatDuration, formatPrice, formatTime } from "@/lib/format";
import type { GuestBookingReceipt } from "@/lib/supabase/types";
import { ACCOUNT, REACH } from "@/lib/content";

/**
 * The screen after a booking goes through.
 *
 * ---------------------------------------------------------------------------
 * THE REFERENCE IS A RECEIPT, NOT A KEY
 * ---------------------------------------------------------------------------
 * It is shown large because a customer wants something to screenshot, and it
 * is worth being explicit about what it is NOT: nowhere in this system can a
 * reference be exchanged for an appointment. No policy grants read access by
 * reference, `anon` has no select privilege on the table in any form, and
 * there is no lookup page. If this string leaks, nothing follows from it.
 *
 * That is a deliberate design, and it is why guest lookup is not in this
 * phase. "Type your reference to see your booking" is a bearer token made of
 * six characters, and building it properly means emailing a signed link, which
 * means an email provider, which this project does not have yet. A reference
 * to quote to Nat is honest; a reference that opens a door would not be.
 *
 * ---------------------------------------------------------------------------
 * WHERE ACCOUNT CONVERSION IS OFFERED
 * ---------------------------------------------------------------------------
 * Here, and only here. The invitation is placed after the appointment is safe
 * rather than in the middle of the flow, and the promise it makes is one the
 * database actually keeps: claim_guest_appointments() attaches this booking to
 * the new account when the email address is confirmed. It says "the same
 * email" because that is the condition, and it does not overstate it.
 */
export function BookingConfirmation({
  receipt,
  signedIn,
  onBookAnother,
}: {
  receipt: GuestBookingReceipt;
  signedIn: boolean;
  onBookAnother: () => void;
}) {
  return (
    <div
      /*
        role="status" rather than "alert": this is good news at the end of a
        deliberate action, so it should be announced at the next natural pause
        rather than interrupting whatever is being read.
      */
      role="status"
      className="mx-auto max-w-[46rem]"
    >
      <div className="rounded-3xl border border-accent/25 bg-accent-soft p-8 lg:p-12">
        <CalendarCheck
          size={34}
          weight="regular"
          className="text-accent"
          aria-hidden="true"
        />

        <h2 className="mt-5 font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl">
          {ACCOUNT.confirmation.title}
        </h2>
        <p className="mt-4 max-w-[48ch] text-base leading-relaxed text-muted">
          {ACCOUNT.confirmation.body}
        </p>

        {/* ---------------- the reference ---------------- */}
        <div className="mt-8 rounded-3xl border border-accent/25 bg-surface p-6">
          <p className="label text-muted">{ACCOUNT.confirmation.referenceLabel}</p>
          <p className="tabular mt-3 font-display text-3xl tracking-[0.06em] text-accent md:text-4xl">
            {receipt.reference}
          </p>
          <p className="mt-3 max-w-[46ch] text-sm leading-relaxed text-muted">
            {ACCOUNT.confirmation.referenceHelp}
          </p>
        </div>

        {/* ---------------- the appointment ---------------- */}
        <dl className="mt-8 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <Row label="Service" value={receipt.service} />
          <Row label="Location" value={receipt.location} />
          <Row label="Date" value={formatDateLong(receipt.date)} />
          <Row label="Time" value={formatTime(receipt.time)} />
          <Row label="In the chair" value={formatDuration(receipt.duration)} />
          <Row label="Price" value={formatPrice(receipt.price_cents)} />
          <div className="sm:col-span-2">
            <dt className="text-sm text-muted">Status</dt>
            <dd className="mt-2">
              <StatusPill status={receipt.status} />
            </dd>
          </div>
        </dl>
      </div>

      {/* ---------------- what next ---------------- */}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {signedIn ? (
          <a href="/account/" className={buttonStyles.primary}>
            See it in my account
          </a>
        ) : null}
        <button
          type="button"
          onClick={onBookAnother}
          className={signedIn ? buttonStyles.secondary : buttonStyles.primary}
        >
          Book another appointment
        </button>
      </div>

      {!signedIn ? (
        <div className="mt-8 rounded-3xl border border-line-strong bg-surface-2/60 p-6 lg:p-7">
          <h3 className="font-display text-xl tracking-tight text-ink">
            Want this in one place?
          </h3>
          <p className="mt-2 max-w-[52ch] text-sm leading-relaxed text-muted">
            Make an account with the same email and this appointment moves into
            it automatically once you confirm the address. You will be able to
            see it, cancel it, and book the next one without filling any of this
            in again.
          </p>
          <a href="/signup/" className={`${buttonStyles.secondary} mt-6`}>
            Make an account
          </a>
        </div>
      ) : null}

      <p className="mt-8 text-sm leading-relaxed text-muted">
        Need to change something? Text the studio on{" "}
        <a
          href={REACH.href}
          className="text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          {REACH.label}
        </a>
        . Moving an appointment more than 24 hours out costs nothing.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="mt-1 text-base text-ink">{value}</dd>
    </div>
  );
}
