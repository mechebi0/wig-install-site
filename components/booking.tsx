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
import { BOOKING, SERVICES, STUDIO } from "@/lib/content";

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

type Errors = Partial<Record<keyof Fields, string>>;
type Status = "idle" | "submitting" | "success" | "error";

const EMPTY: Fields = {
  name: "",
  email: "",
  phone: "",
  service: SERVICES[0].id,
  date: "",
  notes: "",
};

function validate(fields: Fields): Errors {
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

  const update = (key: keyof Fields) => (value: string) => {
    setFields((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const found = validate(fields);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setStatus("idle");
      const firstKey = Object.keys(found)[0];
      document.getElementById(`${formId}-${firstKey}`)?.focus();
      return;
    }

    setStatus("submitting");

    const serviceName =
      SERVICES.find((service) => service.id === fields.service)?.name ??
      fields.service;

    if (!BOOKING_ENDPOINT) {
      const body = [
        `Name: ${fields.name}`,
        `Email: ${fields.email}`,
        `Phone: ${fields.phone}`,
        `Service: ${serviceName}`,
        `Preferred date: ${fields.date || "No preference"}`,
        "",
        fields.notes || "No notes.",
      ].join("\n");

      window.location.href = `mailto:${STUDIO.email}?subject=${encodeURIComponent(
        `Install request: ${serviceName}`,
      )}&body=${encodeURIComponent(body)}`;

      setStatus("success");
      return;
    }

    try {
      const response = await fetch(BOOKING_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ ...fields, serviceName }),
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

          <div className="flex flex-col gap-2">
            <label
              htmlFor={`${formId}-service`}
              className="text-sm font-medium text-ink"
            >
              Service
            </label>
            <select
              id={`${formId}-service`}
              name="service"
              value={fields.service}
              onChange={(event) => update("service")(event.target.value)}
              className="w-full rounded-3xl border border-line-strong bg-bg px-4 py-3.5 min-h-12 text-base text-ink transition-colors duration-200 hover:border-accent"
            >
              {SERVICES.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name} ({service.price})
                </option>
              ))}
            </select>
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
              That did not send. Try again, or text the studio directly on{" "}
              {STUDIO.phone}.
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
    <section
      id="book"
      className="mx-auto max-w-[1400px] scroll-mt-24 px-5 py-20 sm:px-8 lg:py-28"
    >
      <div className="grid gap-12 lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-5">
          <Reveal>
            <h2 className="font-display text-3xl font-semibold leading-[1.1] tracking-tight text-ink md:text-4xl lg:text-5xl">
              {BOOKING.heading}
            </h2>
            <p className="mt-5 max-w-[42ch] text-lg leading-relaxed text-muted">
              {BOOKING.body}
            </p>

            <dl className="mt-10 flex flex-col gap-5 border-t border-line pt-8">
              <div>
                <dt className="text-sm text-muted">Studio</dt>
                <dd className="mt-1 text-base text-ink">
                  {STUDIO.street}
                  <br />
                  {STUDIO.region}
                </dd>
              </div>
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
