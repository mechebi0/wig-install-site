"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Phone } from "@phosphor-icons/react/dist/ssr";
import { buttonStyles } from "@/components/button";
import { ChoiceCard, SlotPill } from "@/components/booking/choice";
import { BookingConfirmation } from "@/components/booking/confirmation";
import { BookingSteps } from "@/components/booking/steps";
import { TextAreaField, TextField, focusFirstError } from "@/components/ui/form";
import { EmptyState, LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { useActiveLocations, useServices, type CatalogService } from "@/lib/catalog";
import { useSession } from "@/lib/auth/session";
import {
  bookAsCustomer,
  bookAsGuest,
  fetchBookedSlots,
  type BookingInput,
} from "@/lib/appointments";
import {
  bookableDates,
  slotReasonLabel,
  slotsForDay,
  MINIMUM_NOTICE_HOURS,
} from "@/lib/booking/availability";
import {
  formatDateLong,
  formatDuration,
  formatPrice,
  formatTime,
  parseDateOnly,
} from "@/lib/format";
import type { BookedSlot, GuestBookingReceipt } from "@/lib/supabase/types";
import { BOOKING_FLOW, STUDIO } from "@/lib/content";

/**
 * BOOK YOUR CHAIR. Five steps, one question each.
 *
 * ---------------------------------------------------------------------------
 * WHY IT IS A FLOW AND NOT A FORM
 * ---------------------------------------------------------------------------
 * Everything this collects would fit on one screen. It is deliberately not on
 * one screen, because a single panel asking for a service, a location, a date,
 * a time, a name, an email, a phone number and a note is an intake form, and
 * an intake form is what booking a dentist feels like. One question at a time
 * is what booking a table at a good restaurant feels like, and this is a
 * two hour appointment in someone's chair.
 *
 * It also earns its keep mechanically: the available times cannot be known
 * until the location and the date are, so a single screen would have to
 * disable half of itself anyway.
 *
 * ---------------------------------------------------------------------------
 * ACCOUNTS ARE NEVER REQUIRED, AND CONVERSION HAPPENS AFTER
 * ---------------------------------------------------------------------------
 * The default path through this flow has no account in it. A first-time
 * customer picks a service and leaves a phone number, and that is the whole
 * transaction.
 *
 * The invitation to make an account is on the CONFIRMATION screen rather than
 * in the middle of the flow, and that is a deliberate ordering. Interrupting a
 * half-finished booking to send someone to /signup throws the draft away and
 * costs the appointment. Offering it afterwards costs nothing and is honest
 * about the benefit, because claim_guest_appointments() in the migration means
 * signing up with the same address genuinely does pull this booking into the
 * new account. Anyone who already has an account can log in from step four and
 * have their details filled in.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS COMPONENT DOES NOT DECIDE
 * ---------------------------------------------------------------------------
 * Whether a booking is allowed. Every check here is a courtesy that keeps the
 * visitor from wasting a click: the real decisions about active locations,
 * active services, past dates, opening days and slot collisions are all made
 * in Postgres, and a hand-rolled request that skips this UI meets exactly the
 * same rules. See supabase/migrations/0001.
 */

type Draft = {
  serviceId: string;
  locationId: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const EMPTY_DRAFT: Draft = {
  serviceId: "",
  locationId: "",
  date: "",
  time: "",
  name: "",
  email: "",
  phone: "",
  notes: "",
};

type DetailErrors = Partial<
  Record<"book-name" | "book-email" | "book-phone", string>
>;

/** Shared stable empty array. See the note where it is used. */
const NO_SLOTS: BookedSlot[] = [];

export function BookingFlow() {
  const { services, loading: servicesLoading } = useServices();
  const { locations, status: locationsStatus } = useActiveLocations();
  const { status: sessionStatus, user, profile } = useSession();

  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [detailErrors, setDetailErrors] = useState<DetailErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [receipt, setReceipt] = useState<GuestBookingReceipt | null>(null);

  const headingRef = useRef<HTMLHeadingElement>(null);
  /** Suppresses the focus move on first paint, which would scroll the page. */
  const mounted = useRef(false);

  const set = useCallback(
    <K extends keyof Draft>(key: K, value: Draft[K]) =>
      setDraft((current) => ({ ...current, [key]: value })),
    [],
  );

  const dates = useMemo(() => bookableDates(), []);

  /*
    ---------------------------------------------------------------------------
    THE SELECTIONS ARE DERIVED, NOT SYNCHRONISED
    ---------------------------------------------------------------------------
    Both of the next two used to be effects that wrote back into `draft`. They
    are plain derivations now, which is both fewer renders and one fewer way to
    be briefly wrong.

    serviceId: useServices() hands back the compiled-in fallback first and the
    database rows a moment later, and the two carry different ids. The fallback
    uses the slug, a real row uses a uuid. Anyone who picked a service inside
    that window would be holding an id that no longer exists, and the booking
    would fail on a foreign key at the very last step. Resolving by slug on
    every render closes that race completely rather than closing it one render
    late.

    locationId: one open studio means there is nothing to choose, so it is
    chosen. Deriving rather than writing it into the draft means an explicit
    choice still wins, and it cannot get stranded pointing at a studio Nat
    closed while the page was sitting open.
  */
  const serviceId = useMemo(() => {
    if (!draft.serviceId) return "";
    if (services.some((item) => item.id === draft.serviceId)) return draft.serviceId;
    return services.find((item) => item.slug === draft.serviceId)?.id ?? "";
  }, [services, draft.serviceId]);

  const locationId =
    locations.find((item) => item.id === draft.locationId)?.id ??
    (locations.length === 1 ? locations[0].id : "");

  const service = services.find((item) => item.id === serviceId) ?? null;
  const location = locations.find((item) => item.id === locationId) ?? null;

  /*
    Fill the contact details in for a customer who is already signed in.

    Adjusted DURING RENDER rather than in an effect. That is React's documented
    pattern for "reset some state when a prop changes", and it is what
    components/mobile-book-bar.tsx already does for the same reason. The effect
    version renders once with empty fields, commits, then renders again with
    them filled; this version never paints the empty frame at all.

    Only blank fields are filled, so it can never overwrite an edit in progress.
  */
  const [prefilledFor, setPrefilledFor] = useState<string | null>(null);
  if (profile && prefilledFor !== profile.id) {
    setPrefilledFor(profile.id);
    setDraft((current) => ({
      ...current,
      name: current.name || profile.full_name || "",
      email: current.email || profile.email || "",
      phone: current.phone || profile.phone || "",
    }));
  }

  /*
    Which times are already gone, for this location on this day.

    The result is stored WITH the location and date it was fetched for, and
    read back only while that key still matches what is selected. Two things
    fall out of that, both of which a bare `slots` array got wrong:

      - changing the day never shows the previous day's taken slots for the few
        hundred milliseconds before the new answer arrives. Offering a booked
        time as free, even briefly, is the one mistake this panel cannot afford
      - a slow response for a day the visitor has already moved on from is
        discarded on arrival rather than painted over the current one

    `slotToken` forces a refetch without changing the key, which is what
    reopenTimes() uses when a slot turns out to have gone mid-flow.
  */
  const [slotCache, setSlotCache] = useState<{
    key: string;
    slots: BookedSlot[];
  } | null>(null);
  const [slotToken, setSlotToken] = useState(0);

  const slotKey = locationId && draft.date ? locationId + "|" + draft.date : "";

  useEffect(() => {
    if (!slotKey) return;
    let live = true;

    const [forLocation, forDate] = slotKey.split("|");
    fetchBookedSlots(forLocation, forDate).then((found) => {
      if (live) setSlotCache({ key: slotKey, slots: found });
    });

    return () => {
      live = false;
    };
  }, [slotKey, slotToken]);

  const slotsReady = Boolean(slotKey) && slotCache?.key === slotKey;
  /*
    NO_SLOTS rather than a fresh `[]`. A new array literal here is a new
    reference on every render, which would make the slotsForDay useMemo below
    recompute the whole grid every time anything on the page changed. One
    shared frozen empty array keeps that memo doing its job.
  */
  const slots = slotsReady && slotCache ? slotCache.slots : NO_SLOTS;
  const slotsLoading = Boolean(slotKey) && !slotsReady;

  /*
    Moving to a new step moves focus to its heading. Without this, a keyboard
    or screen reader user presses Continue and nothing appears to happen: the
    content changed, but focus is still on a button that is now three hundred
    pixels further down a different screen. The heading is tabIndex -1 so it
    can receive focus without joining the tab order.
  */
  useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  const slotOptions = useMemo(() => {
    if (!draft.date || !service) return [];
    return slotsForDay(draft.date, service.duration_minutes ?? 60, slots);
  }, [draft.date, service, slots]);

  /**
   * When a day comes back with nothing bookable, WHY decides what to say.
   *
   * "That day is full" and "you have left it too late" are different facts and
   * a customer can act on them differently: one means try another day, the
   * other means try another day OR ring the studio, because the slot is
   * physically free and Nat may well take it.
   *
   * `every` is exact here rather than approximate, and only because
   * slotsForDay() reports the clock before the diary. If a slot that had both
   * passed AND been booked came back as "taken", a single old appointment on
   * today would flip this to false and the panel would claim the day was full.
   * The ordering in lib/booking/availability.ts is what makes this line safe.
   */
  const dayClosedByNotice =
    slotOptions.length > 0 &&
    slotOptions.every(
      (slot) => slot.reason === "too-soon" || slot.reason === "past",
    );

  // ---------------------------------------------------------------- gates ---

  if (receipt) {
    return (
      <BookingConfirmation
        receipt={receipt}
        signedIn={Boolean(user)}
        onBookAnother={() => {
          setReceipt(null);
          setDraft((current) => ({ ...EMPTY_DRAFT, name: current.name, email: current.email, phone: current.phone }));
          setStep(0);
        }}
      />
    );
  }

  if (locationsStatus === "loading" || sessionStatus === "loading") {
    return <LoadingPanel label="Opening the diary" />;
  }

  if (locationsStatus === "error") {
    return (
      <Notice tone="error" title="The diary would not open.">
        Refresh the page, or call the studio on {STUDIO.phone} and Nat will book
        you in directly.
      </Notice>
    );
  }

  /*
    No active location. This is a real business state, not an error, and it is
    the one case where showing a booking form would be a lie: every slot in it
    would be refused by the database.
  */
  if (locations.length === 0) {
    return (
      <EmptyState title={BOOKING_FLOW.closed.title} body={BOOKING_FLOW.closed.body}>
        <a
          href={`tel:${STUDIO.phone.replace(/[^+\d]/g, "")}`}
          className={buttonStyles.primary}
        >
          <Phone size={17} weight="regular" aria-hidden="true" />
          Text the studio
        </a>
      </EmptyState>
    );
  }

  // ------------------------------------------------------------ step logic ---

  const canContinue = (() => {
    switch (step) {
      case 0:
        return Boolean(serviceId);
      case 1:
        return Boolean(locationId);
      case 2:
        return Boolean(draft.date && draft.time);
      case 3:
        return true; // validated on submit so the errors can be specific
      default:
        return true;
    }
  })();

  function validateDetails(): boolean {
    const found: DetailErrors = {};

    if (!draft.name.trim()) {
      found["book-name"] = "Tell us what to call you.";
    }
    if (!draft.email.trim()) {
      found["book-email"] = "Nat needs an email to confirm the slot.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(draft.email.trim())) {
      found["book-email"] = "That email address is missing something.";
    }

    const digits = draft.phone.replace(/\D/g, "");
    if (!digits) {
      found["book-phone"] = "The studio confirms by text, so a number is needed.";
    } else if (digits.length < 10 || digits.length > 15) {
      found["book-phone"] = "That looks off. Include the area code.";
    }

    setDetailErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return false;
    }
    return true;
  }

  function goNext() {
    if (step === 3 && !validateDetails()) return;
    setStep((current) => Math.min(current + 1, 4));
  }

  async function submit() {
    if (!service || !location) return;

    setSubmitting(true);
    setSubmitError("");

    const input: BookingInput = {
      serviceId: service.id,
      locationId: location.id,
      date: draft.date,
      time: draft.time,
      name: draft.name.trim(),
      email: draft.email.trim().toLowerCase(),
      phone: draft.phone.trim(),
      notes: draft.notes,
    };

    if (user) {
      const { appointment, error } = await bookAsCustomer(user.id, input);
      setSubmitting(false);
      if (error || !appointment) {
        setSubmitError(error || "That did not save.");
        if (/slot|took/i.test(error)) reopenTimes();
        return;
      }
      setReceipt({
        reference: appointment.reference,
        service: appointment.service_name_snapshot,
        location: appointment.location_name_snapshot,
        date: appointment.appointment_date,
        time: appointment.appointment_time,
        duration: appointment.duration_minutes,
        price_cents: appointment.price_cents_snapshot,
        status: appointment.status,
      });
      return;
    }

    const { receipt: guestReceipt, error } = await bookAsGuest(input);
    setSubmitting(false);
    if (error || !guestReceipt) {
      setSubmitError(error || "That did not save.");
      if (/slot|took/i.test(error)) reopenTimes();
      return;
    }
    setReceipt(guestReceipt);
  }

  /*
    Somebody else took the slot between this visitor loading the times and
    pressing confirm. Sending them back to step three with a fresh read is the
    only useful response: leaving them on a confirm screen for an appointment
    that cannot exist just makes them press the button again.
  */
  function reopenTimes() {
    setDraft((current) => ({ ...current, time: "" }));
    setStep(2);
    // Same location and day, fresh answer. See the note on slotCache above.
    setSlotToken((token) => token + 1);
  }

  const stepMeta = BOOKING_FLOW.steps[step];

  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="lg:col-span-4 xl:col-span-3">
        <BookingSteps
          current={step}
          furthest={furthestReachable(Boolean(serviceId), Boolean(locationId), draft)}
          onJump={(target) => setStep(target)}
        />
      </div>

      <div className="lg:col-span-8 xl:col-span-9">
        <h2
          ref={headingRef}
          tabIndex={-1}
          className="font-display text-3xl leading-[1.08] tracking-tight text-ink outline-none md:text-4xl"
        >
          {stepMeta.heading}
        </h2>

        <div className="mt-8">
          {/* -------------------------------------------------- 1 service --- */}
          {step === 0 ? (
            servicesLoading && services.length === 0 ? (
              <LoadingPanel label="Loading the menu" />
            ) : (
              <fieldset>
                <legend className="sr-only">Choose your service</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  {services.map((item) => (
                    <ChoiceCard
                      key={item.id}
                      name="service"
                      value={item.id}
                      checked={serviceId === item.id}
                      onSelect={(value) => set("serviceId", value)}
                      title={item.name}
                      meta={formatPrice(item.price_cents)}
                    >
                      <span className="block">{item.description}</span>
                      <span className="mt-2 block text-xs uppercase tracking-[0.14em] text-muted/80">
                        {formatDuration(item.duration_minutes)}
                      </span>
                    </ChoiceCard>
                  ))}
                </div>
              </fieldset>
            )
          ) : null}

          {/* ------------------------------------------------- 2 location --- */}
          {step === 1 ? (
            <fieldset>
              <legend className="sr-only">Choose your location</legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {locations.map((item) => (
                  <ChoiceCard
                    key={item.id}
                    name="location"
                    value={item.id}
                    checked={locationId === item.id}
                    onSelect={(value) => set("locationId", value)}
                    title={`${item.name}, ${item.state}`}
                  >
                    Nat is taking appointments here now.
                  </ChoiceCard>
                ))}
              </div>
              {locations.length === 1 ? (
                <p className="mt-5 text-sm leading-relaxed text-muted">
                  This is the only studio open at the moment. New dates and
                  locations are announced on the homepage first.
                </p>
              ) : null}
            </fieldset>
          ) : null}

          {/* ----------------------------------------------------- 3 when --- */}
          {step === 2 ? (
            <div className="flex flex-col gap-9">
              <fieldset>
                <legend className="text-sm font-medium text-ink">
                  Pick a day
                </legend>
                <div className="no-scrollbar -mx-5 mt-4 flex snap-x gap-2 overflow-x-auto px-5 pb-2 sm:mx-0 sm:px-0">
                  {dates.map((iso) => (
                    <DateChip
                      key={iso}
                      iso={iso}
                      checked={draft.date === iso}
                      onSelect={(value) => {
                        set("date", value);
                        set("time", "");
                      }}
                    />
                  ))}
                </div>
                <p className="mt-3 text-sm text-muted">
                  Tuesday through Saturday. Closed Sunday and Monday.
                </p>
              </fieldset>

              {draft.date ? (
                <fieldset>
                  <legend className="text-sm font-medium text-ink">
                    Pick a time
                    {service ? (
                      <span className="ml-2 font-normal text-muted">
                        {formatDuration(service.duration_minutes)} in the chair
                      </span>
                    ) : null}
                  </legend>

                  {slotsLoading ? (
                    <p className="mt-4 flex items-center gap-2 text-sm text-muted">
                      <Spinner size={15} />
                      Checking what is free
                    </p>
                  ) : slotOptions.some((slot) => slot.available) ? (
                    <>
                      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
                        {slotOptions.map((slot) => (
                          <SlotPill
                            key={slot.time}
                            name="time"
                            value={slot.time}
                            label={formatTime(slot.time)}
                            checked={draft.time === slot.time}
                            onSelect={(value) => set("time", value)}
                            disabled={!slot.available}
                            reasonLabel={slotReasonLabel(slot.reason)}
                          />
                        ))}
                      </div>
                      <p className="mt-4 text-sm text-muted">
                        Struck-through times are taken or inside the{" "}
                        {MINIMUM_NOTICE_HOURS} hour notice window.
                      </p>
                    </>
                  ) : dayClosedByNotice ? (
                    /*
                      Today, viewed after about 7am. Every slot is inside the
                      notice window, which is NOT the same thing as the day
                      being full, and saying "that day is full" here would be
                      a lie the visitor could disprove by asking Nat. The two
                      cases get two different explanations.
                    */
                    <div className="mt-4">
                      <Notice tone="info" title="Too late for that day.">
                        Nat needs about {MINIMUM_NOTICE_HOURS} hours to answer a
                        request, so {formatDateLong(draft.date)} has closed for
                        new bookings. Pick a later day and you will see what is
                        free. If it has to be today, text the studio: the chair
                        may well be empty, it is the notice that is short.
                      </Notice>
                    </div>
                  ) : (
                    <div className="mt-4">
                      <Notice tone="info" title="That day is full.">
                        Nothing free on {formatDateLong(draft.date)} for this
                        service. Try another day, or text the studio and Nat
                        will see what she can move.
                      </Notice>
                    </div>
                  )}
                </fieldset>
              ) : null}
            </div>
          ) : null}

          {/* -------------------------------------------------- 4 details --- */}
          {step === 3 ? (
            <div className="flex flex-col gap-7">
              {user ? (
                <Notice tone="info" title={`Signed in as ${profile?.email ?? ""}`}>
                  This appointment goes straight into your account, so you can
                  see it and cancel it from there.
                </Notice>
              ) : (
                <div className="rounded-3xl border border-line-strong bg-surface-2/60 p-5">
                  <p className="font-display text-lg tracking-tight text-ink">
                    {BOOKING_FLOW.guestPrompt}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed text-muted">
                    {BOOKING_FLOW.guestBody}
                  </p>
                  <p className="mt-4 text-sm leading-relaxed text-muted">
                    Already have an account?{" "}
                    <a
                      href="/login/?next=%2Fbook%2F"
                      className="font-medium text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
                    >
                      Log in
                    </a>{" "}
                    and this fills itself in.
                  </p>
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <TextField
                  id="book-name"
                  label="Your name"
                  autoComplete="name"
                  value={draft.name}
                  onChange={(event) => set("name", event.target.value)}
                  error={detailErrors["book-name"]}
                  required
                />
                <TextField
                  id="book-phone"
                  label="Mobile number"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={draft.phone}
                  onChange={(event) => set("phone", event.target.value)}
                  error={detailErrors["book-phone"]}
                  help="Nat confirms by text."
                  required
                />
                <TextField
                  id="book-email"
                  label="Email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  value={draft.email}
                  onChange={(event) => set("email", event.target.value)}
                  error={detailErrors["book-email"]}
                  className="sm:col-span-2"
                  required
                />
                <TextAreaField
                  id="book-notes"
                  label="Anything to know"
                  value={draft.notes}
                  onChange={(event) => set("notes", event.target.value)}
                  help="Optional. Scalp sensitivity, adhesive reactions, or the unit you are bringing."
                  className="sm:col-span-2"
                />
              </div>
            </div>
          ) : null}

          {/* -------------------------------------------------- 5 confirm --- */}
          {step === 4 ? (
            <div className="flex flex-col gap-7">
              <Summary
                service={service}
                locationLabel={location ? `${location.name}, ${location.state}` : ""}
                date={draft.date}
                time={draft.time}
                name={draft.name}
                email={draft.email}
                phone={draft.phone}
                notes={draft.notes}
                onEdit={setStep}
              />

              {submitError ? <Notice tone="error">{submitError}</Notice> : null}

              <p className="text-sm leading-relaxed text-muted">
                Sending this holds the slot as a request. Nat confirms by text,
                usually the same day. Nothing is charged now and no card is
                taken.
              </p>
            </div>
          ) : null}
        </div>

        {/* ------------------------------------------------------ controls --- */}
        <div className="mt-10 flex flex-col-reverse gap-3 border-t border-line pt-7 sm:flex-row sm:items-center sm:justify-between">
          {step > 0 ? (
            <button
              type="button"
              onClick={() => setStep((current) => current - 1)}
              className={buttonStyles.secondary}
            >
              <ArrowLeft size={16} weight="regular" aria-hidden="true" />
              Back
            </button>
          ) : (
            <span className="hidden sm:block" />
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canContinue}
              className={buttonStyles.primary}
            >
              Continue
              <ArrowRight size={16} weight="regular" aria-hidden="true" />
            </button>
          ) : (
            <button
              type="button"
              onClick={submit}
              disabled={submitting}
              className={buttonStyles.primary}
            >
              {submitting ? (
                <>
                  <Spinner size={17} />
                  Sending
                </>
              ) : (
                "Confirm my appointment"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The furthest step the current draft has earned the right to jump back to.
 *
 * Takes the RESOLVED service and location rather than reading them off the
 * draft, because a single open studio is auto-selected without ever being
 * written there. Reading the raw draft would leave step two permanently
 * unreachable for a visitor who never had a choice to make.
 */
function furthestReachable(
  hasService: boolean,
  hasLocation: boolean,
  draft: Draft,
): number {
  if (!hasService) return 0;
  if (!hasLocation) return 1;
  if (!draft.date || !draft.time) return 2;
  return 4;
}

function DateChip({
  iso,
  checked,
  onSelect,
}: {
  iso: string;
  checked: boolean;
  onSelect: (value: string) => void;
}) {
  const date = parseDateOnly(iso);
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  const month = new Intl.DateTimeFormat("en-US", { month: "short" }).format(date);

  return (
    <label className="shrink-0 cursor-pointer snap-start">
      <input
        type="radio"
        name="date"
        value={iso}
        checked={checked}
        onChange={() => onSelect(iso)}
        className="peer sr-only"
        aria-label={formatDateLong(iso)}
      />
      <span className="flex w-[4.5rem] flex-col items-center rounded-3xl border border-line-strong bg-surface px-2 py-3 text-center transition-[border-color,background-color,color] duration-200 hover:border-accent peer-checked:border-accent peer-checked:bg-accent peer-checked:text-on-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-accent">
        <span className="text-[0.6875rem] uppercase tracking-[0.14em] opacity-70">
          {weekday}
        </span>
        <span className="tabular mt-1 font-display text-xl leading-none">
          {date.getDate()}
        </span>
        <span className="mt-1 text-[0.6875rem] uppercase tracking-[0.14em] opacity-70">
          {month}
        </span>
      </span>
    </label>
  );
}

function Summary({
  service,
  locationLabel,
  date,
  time,
  name,
  email,
  phone,
  notes,
  onEdit,
}: {
  service: CatalogService | null;
  locationLabel: string;
  date: string;
  time: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  onEdit: (step: number) => void;
}) {
  const rows: { label: string; value: string; step: number }[] = [
    { label: "Service", value: service?.name ?? "", step: 0 },
    { label: "Location", value: locationLabel, step: 1 },
    {
      label: "When",
      value: date ? `${formatDateLong(date)} at ${formatTime(time)}` : "",
      step: 2,
    },
    { label: "In the chair", value: formatDuration(service?.duration_minutes), step: 0 },
    { label: "Price", value: formatPrice(service?.price_cents), step: 0 },
    { label: "Name", value: name, step: 3 },
    { label: "Email", value: email, step: 3 },
    { label: "Mobile", value: phone, step: 3 },
  ];

  if (notes.trim()) rows.push({ label: "Notes", value: notes.trim(), step: 3 });

  return (
    <dl className="overflow-hidden rounded-3xl border border-line-strong bg-surface">
      {rows.map((row, index) => (
        <div
          key={row.label}
          className={`flex flex-wrap items-baseline gap-x-4 gap-y-1 px-6 py-4 ${
            index > 0 ? "border-t border-line" : ""
          }`}
        >
          <dt className="w-28 shrink-0 text-sm text-muted">{row.label}</dt>
          <dd className="min-w-0 flex-1 text-base text-ink">{row.value}</dd>
          <button
            type="button"
            onClick={() => onEdit(row.step)}
            className="shrink-0 text-sm text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent"
          >
            Change
            <span className="sr-only"> {row.label.toLowerCase()}</span>
          </button>
        </div>
      ))}
    </dl>
  );
}
