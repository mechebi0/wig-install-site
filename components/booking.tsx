"use client";

import { useId, useState } from "react";
import type { FormEvent } from "react";
import {
  CheckCircle,
  CircleNotch,
  WarningCircle,
} from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { Reveal } from "@/components/reveal";
import {
  BOOKING,
  LOCATIONS,
  REACH,
  SELECTION,
  SERVICES,
  STUDIO,
} from "@/lib/content";
import { formatPrice } from "@/lib/format";
import {
  setBookingSelection,
  useBookingSelection,
} from "@/lib/booking-selection";
import {
  FINISHES,
  getFinish,
  parseFinish,
  parseInstallType,
  type FinishId,
} from "@/lib/taxonomy";

/**
 * Booking request form.
 *
 * This site is a static export, so there is no server action to post to. Two
 * paths are wired:
 *
 *   1. Set NEXT_PUBLIC_BOOKING_ENDPOINT to a form endpoint (Formspree, a
 *      Cloudflare Worker, whatever) and the form POSTs JSON to it and reports
 *      the real result.
 *   2. With no endpoint set, it opens a prefilled email to the studio instead.
 *      That is a real working path on a static host, not a fake success.
 *
 * It never reports success for a request that did not go anywhere.
 *
 * THE INSTALL AND THE FINISH arrive already chosen whenever the visitor chose
 * them anywhere before this: in the flow directly above the form, on an
 * install page, or in a Book button's URL. Both are read from, and written
 * back to, the one booking selection (lib/booking-selection.ts), so this form
 * and the flow above it can never show two different answers. Both reach Nat
 * in the request, named in full.
 *
 * FINISH IS REQUIRED, but only while the service is actually an install: this
 * form's own Service menu also offers Customization only and Reinstall and
 * refresh, which have no finish to style, so the requirement (and its "Choose
 * a finish before sending" error) applies exactly when it means something.
 */
const BOOKING_ENDPOINT = process.env.NEXT_PUBLIC_BOOKING_ENDPOINT ?? "";

type Fields = {
  name: string;
  email: string;
  phone: string;
  service: string;
  date: string;
  notes: string;
};

/** "finish" is not a Fields key: it lives in the shared selection, not here. */
type Errors = Partial<Record<keyof Fields | "finish", string>>;
type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: Fields = {
  name: "",
  email: "",
  phone: "",
  // "" means the visitor has not chosen; see `service` in Booking() for what
  // stands in until they do.
  service: "",
  date: "",
  notes: "",
};

/**
 * `service` and `finish` are passed separately because both are derived from
 * the shared booking selection rather than held in `fields`.
 *
 * `finish` is required only when the chosen service actually IS one of the
 * three install types (Frontal, Closure or Reinstalls): Customization only
 * and Reinstall and refresh have no finish to style, so nothing here can be
 * left unanswered for them.
 */
function validate(
  fields: Fields,
  service: string,
  isInstallService: boolean,
  finish: FinishId | null,
): Errors {
  const errors: Errors = {};

  if (!fields.name.trim()) {
    errors.name = "Tell us what to call you.";
  }

  if (!fields.email.trim()) {
    errors.email = "We need an email to confirm the slot.";
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(fields.email.trim())) {
    errors.email = "That email address is missing something.";
  }

  const digits = fields.phone.replace(/\D/g, "");
  if (!digits) {
    errors.phone = "The studio confirms by text, so a number is required.";
  } else if (digits.length < 10) {
    errors.phone = "That looks short. Include the area code.";
  }

  if (!service) {
    errors.service = "Choose the service you would like to book.";
  }

  if (isInstallService && !finish) {
    errors.finish = "Choose a finish before sending.";
  }

  // Date is optional, but a past one is always a mistake. Resolved at submit
  // time on the client, so a static build never bakes in its own build day.
  if (fields.date) {
    const today = new Date().toISOString().slice(0, 10);
    if (fields.date < today) {
      errors.date = "That date has passed. Pick one from today onward.";
    }
  }

  return errors;
}

export function Booking() {
  const formId = useId();
  const [fields, setFields] = useState<Fields>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<Status>("idle");

  /*
    The selected service is derived, not synchronised, and each kind of
    answer has exactly one owner:

      an install type    the shared booking selection. Picking Frontal or
                         Closure here moves the flow above the form too, and
                         whatever was picked there (or on an install page, or
                         in a Book button's URL) shows here without an effect.
      any other service  this form's own state, since "Customization only" is
                         not an install and the flow above does not offer it.
                         Picking one clears the install from the selection so
                         the two never disagree.

    There is no silent default any more. It used to fall back to the first
    service, but with the choice now asked for directly above, a form quietly
    reading "Frontal Install" beside a flow that shows nothing chosen would be
    two answers to one question. It asks instead, and says so if it is sent
    without one.
  */
  const selection = useBookingSelection();
  const service = selection.installType ?? fields.service;
  const isInstallService = selection.installType !== null;
  const finish = selection.finish;
  const styleDescription = selection.styleDescription;

  const update = (key: keyof Fields) => (value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const chooseService = (value: string) => {
    const install = parseInstallType(value);
    setBookingSelection({ installType: install });
    update("service")(install ? "" : value);
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields, service, isInstallService, finish);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus("idle");
      const firstKey = Object.keys(found)[0];
      document.getElementById(`${formId}-${firstKey}`)?.focus();
      return;
    }

    setStatus("submitting");

    const serviceName =
      SERVICES.find((item) => item.id === service)?.name ?? service;
    const finishName = finish ? getFinish(finish).label : "";
    // Never a bare "Style: " line: an empty description says nothing a
    // missing line does not already say, unlike Finish, whose "No finish" is
    // itself a real answer.
    const styleNote = styleDescription.trim();

    if (!BOOKING_ENDPOINT) {
      const body = [
        `Name: ${fields.name}`,
        `Email: ${fields.email}`,
        `Phone: ${fields.phone}`,
        `Service: ${serviceName}`,
        `Finish: ${finishName || SELECTION.finish.none}`,
        ...(styleNote ? [`${SELECTION.book.style}: ${styleNote}`] : []),
        `Preferred date: ${fields.date || "No preference"}`,
        "",
        fields.notes || "No notes.",
      ].join("\n");

      window.location.href = `mailto:${STUDIO.email}?subject=${encodeURIComponent(
        `Install request: ${serviceName}${finishName ? `, ${finishName}` : ""}`,
      )}&body=${encodeURIComponent(body)}`;

      setStatus("success");
      return;
    }

    try {
      const response = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        // Ids for a machine to route on, names for a person to read.
        body: JSON.stringify({
          ...fields,
          service,
          serviceName,
          finish: finish ?? "",
          finishName,
          styleDescription: styleNote,
        }),
      });

      if (!response.ok) throw new Error(`Request failed: ${response.status}`);

      setFields(EMPTY);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <BookingShell>
        <div
          role="status"
          className="flex flex-col items-start rounded-3xl border border-accent/25 bg-accent-soft p-8 lg:p-10"
        >
          <CheckCircle
            size={30}
            weight="regular"
            className="text-accent"
            aria-hidden="true"
          />
          <h3 className="mt-4 font-display text-2xl font-semibold tracking-tight text-ink">
            Request sent.
          </h3>
          <p className="mt-3 max-w-[46ch] text-base leading-relaxed text-muted">
            {BOOKING_ENDPOINT
              ? "You will get a text back with two or three slots, usually the same day."
              : "Your email app should be open with the request filled in. Send it and you will get a text back with two or three slots."}
          </p>
          <button
            type="button"
            onClick={() => setStatus("idle")}
            className={`${buttonStyles.secondary} mt-7`}
          >
            Send another
          </button>
        </div>
      </BookingShell>
    );
  }

  return (
    <BookingShell>
      <form
        onSubmit={onSubmit}
        noValidate
        className="rounded-3xl border border-line-strong bg-surface shadow-soft p-6 sm:p-8 lg:p-10"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <Field
            id={`${formId}-name`}
            label="Your name"
            value={fields.name}
            onChange={update("name")}
            error={errors.name}
            autoComplete="name"
          />
          <Field
            id={`${formId}-phone`}
            label="Mobile number"
            type="tel"
            value={fields.phone}
            onChange={update("phone")}
            error={errors.phone}
            help="The studio confirms by text."
            autoComplete="tel"
          />
          <Field
            id={`${formId}-email`}
            label="Email"
            type="email"
            value={fields.email}
            onChange={update("email")}
            error={errors.email}
            autoComplete="email"
            className="sm:col-span-2"
          />

          {/*
            Full width: the options carry their prices, and the longest,
            "Reinstall and refresh ($70)", clips in a half-width column at
            desktop, where the form has seven of twelve columns. The finish
            and the date then share the next row.
          */}
          <div className="flex flex-col gap-2 sm:col-span-2">
            <label
              htmlFor={`${formId}-service`}
              className="text-sm font-medium text-ink"
            >
              Service
            </label>
            <select
              id={`${formId}-service`}
              name="service"
              value={service}
              onChange={(event) => chooseService(event.target.value)}
              aria-invalid={errors.service ? true : undefined}
              aria-describedby={
                errors.service ? `${formId}-service-error` : undefined
              }
              className={`w-full rounded-3xl border bg-bg px-4 py-3.5 min-h-12 text-base text-ink transition-colors duration-200 hover:border-accent ${
                errors.service ? "border-danger" : "border-line-strong"
              }`}
            >
              <option value="" disabled>
                Choose a service
              </option>
              {SERVICES.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} ({formatPrice(item.priceCents)})
                </option>
              ))}
            </select>
            {errors.service ? (
              <p id={`${formId}-service-error`} className="text-sm text-danger">
                {errors.service}
              </p>
            ) : null}
          </div>

          {/*
            The styling add-on. Required when the service above is one of the
            three install types (Frontal, Closure or Reinstalls), the same
            rule the flow at the top of /book enforces; for the two
            non-install services there is no finish to style, so the empty
            "No finish" choice stays valid there. It writes to the same
            booking selection as the finish tiles above the form, so changing
            either changes both.
          */}
          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-finish`}
              className="text-sm font-medium text-ink"
            >
              {SELECTION.book.finish}
            </label>
            <select
              id={`${formId}-finish`}
              name="finish"
              value={finish ?? ""}
              onChange={(event) =>
                setBookingSelection({ finish: parseFinish(event.target.value) })
              }
              aria-invalid={errors.finish ? true : undefined}
              aria-describedby={
                errors.finish
                  ? `${formId}-finish-error ${formId}-finish-help`
                  : `${formId}-finish-help`
              }
              className={`w-full rounded-3xl border bg-bg px-4 py-3.5 min-h-12 text-base text-ink transition-colors duration-200 hover:border-accent ${
                errors.finish ? "border-danger" : "border-line-strong"
              }`}
            >
              <option value="">{SELECTION.finish.none}</option>
              {FINISHES.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.finish ? (
              <p id={`${formId}-finish-error`} className="text-sm text-danger">
                {errors.finish}
              </p>
            ) : null}
            <p id={`${formId}-finish-help`} className="text-sm text-muted">
              {isInstallService
                ? SELECTION.finish.body
                : `${SELECTION.finish.optional}. ${SELECTION.finish.body}`}
            </p>
          </div>

          <Field
            id={`${formId}-date`}
            label="Preferred date"
            type="date"
            value={fields.date}
            onChange={update("date")}
            error={errors.date}
            help="Optional. Tuesday through Saturday."
          />

          <div className="flex flex-col gap-2 sm:col-span-2">
            <label
              htmlFor={`${formId}-notes`}
              className="text-sm font-medium text-ink"
            >
              Anything to know
            </label>
            <textarea
              id={`${formId}-notes`}
              name="notes"
              rows={4}
              value={fields.notes}
              onChange={(event) => update("notes")(event.target.value)}
              className="w-full resize-y rounded-3xl border border-line-strong bg-bg px-4 py-3.5 min-h-12 text-base text-ink transition-colors duration-200 hover:border-accent"
            />
            <p className="text-sm text-muted">
              Optional. Scalp sensitivity, adhesive reactions, or the unit you
              are bringing.
            </p>
          </div>
        </div>

        {status === "error" ? (
          <div
            role="alert"
            className="mt-7 flex items-start gap-3 rounded-3xl border border-danger/30 bg-danger/5 p-4"
          >
            <WarningCircle
              size={20}
              weight="regular"
              className="mt-0.5 shrink-0 text-danger"
              aria-hidden="true"
            />
            <p className="text-sm leading-relaxed text-ink">
              That did not send. Try again, or reach the studio directly:{" "}
              {REACH.phrase}.
            </p>
          </div>
        ) : null}

        <button
          type="submit"
          disabled={status === "submitting"}
          className={`${buttonStyles.primary} mt-8 w-full sm:w-auto`}
        >
          {status === "submitting" ? (
            <>
              <CircleNotch
                size={17}
                weight="bold"
                aria-hidden="true"
                className="animate-spin motion-reduce:animate-none"
              />
              Sending
            </>
          ) : (
            "Request a slot"
          )}
        </button>
      </form>
    </BookingShell>
  );
}

function BookingShell({ children }: { children: React.ReactNode }) {
  return (
    /*
      id="request" rather than "book": the page itself is /book now, so an
      anchor called #book on it would read as /book#book.
    */
    <section
      id="request"
      aria-labelledby="booking-heading"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-14 sm:px-8 sm:py-20 lg:py-28"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Reveal>
            <h2
              id="booking-heading"
              className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:text-4xl lg:text-5xl"
            >
              {BOOKING.heading}
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted">
              {BOOKING.body}
            </p>

            {/*
              Only rows with a real value behind them. No street address and no
              opening hours have been supplied, so those rows do not render at
              all rather than rendering an invented one. Fill STUDIO.street or
              STUDIO.hours in lib/content.ts and they appear here on their own.
            */}
            <dl className="mt-10 flex flex-col gap-5 border-t border-line pt-8">
              <div>
                <dt className="text-sm text-muted">Where</dt>
                <dd className="mt-1 flex flex-col gap-0.5 text-base text-ink">
                  {STUDIO.street ? <span>{STUDIO.street}</span> : null}
                  {LOCATIONS.map((location) => (
                    <span key={location.name}>
                      {location.name}, {location.region}
                    </span>
                  ))}
                </dd>
              </div>

              {STUDIO.hours.length > 0 ? (
                <div>
                  <dt className="text-sm text-muted">Hours</dt>
                  <dd className="mt-1 flex flex-col gap-0.5 text-base text-ink">
                    {STUDIO.hours.map((slot) => (
                      <span key={slot.days}>
                        {slot.days}, {slot.time}
                      </span>
                    ))}
                  </dd>
                </div>
              ) : null}

              <div>
                <dt className="text-sm text-muted">Reach Nat</dt>
                <dd className="text-base">
                  {/*
                    inline-flex + min-h-11 rather than a bare inline link. The
                    other REACH links on the site sit inside a sentence, which
                    WCAG 2.5.8 exempts from the 44px minimum; this one is alone
                    in a definition list, so the exemption does not apply and it
                    has to carry its own target.
                  */}
                  <a
                    href={REACH.href}
                    className="inline-flex min-h-11 items-center text-ink underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
                  >
                    {REACH.label}
                  </a>
                </dd>
              </div>
            </dl>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <Reveal index={1}>{children}</Reveal>
        </div>
      </div>
    </section>
  );
}

type FieldProps = {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  error?: string;
  help?: string;
  autoComplete?: string;
  className?: string;
};

/**
 * Label above, helper below, error below that. Never a placeholder standing in
 * for a label (Section 4.6).
 */
function Field({
  id,
  label,
  value,
  onChange,
  type = "text",
  error,
  help,
  autoComplete,
  className = "",
}: FieldProps) {
  const helpId = help ? `${id}-help` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [errorId, helpId].filter(Boolean).join(" ") || undefined;

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
      </label>
      <input
        id={id}
        name={id}
        type={type}
        value={value}
        autoComplete={autoComplete}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        onChange={(event) => onChange(event.target.value)}
        className={`w-full rounded-3xl border bg-bg px-4 py-3.5 text-base text-ink transition-colors duration-200 hover:border-accent ${
          error ? "border-danger" : "border-line-strong"
        }`}
      />
      {error ? (
        <p id={errorId} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={helpId} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}
