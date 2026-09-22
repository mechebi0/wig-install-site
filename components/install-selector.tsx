"use client";

import { useId, useRef, type ReactNode } from "react";
import {
  ArrowDown,
  ArrowRight,
  CalendarCheck,
  Check,
  Spiral,
} from "@phosphor-icons/react/dist/ssr";
import { ButtonLink, buttonStyles } from "@/components/button";
import { Photograph } from "@/components/photo";
import { Reveal } from "@/components/reveal";
import {
  setBookingSelection,
  useBookingSelection,
} from "@/lib/booking-selection";
import {
  BOOKING_ANCHOR,
  CTA,
  MAX_STYLE_DESCRIPTION_LENGTH,
  SELECTION,
  bookingTarget,
  bookingTargetAtForm,
} from "@/lib/content";
import {
  FINISHES,
  INSTALL_TYPES,
  getFinish,
  getInstallType,
  type FinishId,
  type InstallTypeId,
} from "@/lib/taxonomy";

/**
 * THE BOOKING SELECTION, as a customer builds it: install, then finish, then
 * the button.
 *
 * ---------------------------------------------------------------------------
 * ONE COMPONENT, TWO PLACES
 * ---------------------------------------------------------------------------
 *   mode "book"   on /book. All four steps; the install is a real choice.
 *   mode "page"   on /installs/<type>/. The page already IS the install, so
 *                 the first step becomes a two-way switch between the two
 *                 install pages rather than a question, and the choice of
 *                 finish is recorded against this page's install.
 *
 * Both read and write the same selection (lib/booking-selection.ts), so a
 * finish picked on the frontal page is still picked on /book, and the Book
 * button hands the pair on in the URL. There is no "Frontal Curls" anywhere:
 * the install and the finish are two separate answers, exactly as they will be
 * two separate things in Acuity.
 *
 * INSTALL AND FINISH ARE BOTH REQUIRED to reach the Book button; only the
 * free-text style step is optional. See the note on SELECTION in
 * lib/content.ts for why neither required step carries a "(Required)" badge.
 *
 * ---------------------------------------------------------------------------
 * WHY RADIOS
 * ---------------------------------------------------------------------------
 * The same reasons as components/booking/choice.tsx: one tab stop per group,
 * arrow keys inside it, and a screen reader hears "Curls, radio button, 1 of
 * 3, checked" rather than "Curls, button". The input is `sr-only`, not hidden,
 * so it stays focusable; the card is painted from it with `peer-checked`.
 *
 * One structural detail that matters: the tick is a SIBLING of the input, not
 * a child of the card. Tailwind v4 compiles `peer-checked:` to
 * `:where(.peer):checked ~ *`, which only reaches siblings, so a tick nested
 * inside the card never appears. Selection is carried three ways at once -
 * the border and ring, the tinted ground, and the tick - so it never rests on
 * colour alone.
 *
 * ---------------------------------------------------------------------------
 * THE PHOTOGRAPHS
 * ---------------------------------------------------------------------------
 * All Nat's own, from lib/taxonomy.ts. They are decorative INSIDE a choice
 * (empty alt): the option's name already labels the radio, and reading a
 * paragraph of alt text as part of every option's name would bury the choice
 * itself. Their real alt text is read where they are shown as work: the
 * gallery and the install pages. A finish with no photograph of its own gets
 * a plain swatch, never a borrowed one.
 */

type InstallSelectorProps =
  | { mode: "book" }
  | { mode: "page"; installType: InstallTypeId };

const TOTAL_STEPS = 4;

/*
  The selectable surface, shared by the install cards and the finish tiles.
  Rounded-3xl because it is a card (the shape rule in globals.css); the ring
  on top of the border makes the chosen one read at a glance on a phone,
  where a 1px change of colour alone is easy to miss.
*/
const CHOICE_SURFACE =
  "flex h-full overflow-hidden rounded-3xl border border-line-strong bg-surface transition-[border-color,background-color,box-shadow] duration-200 hover:border-accent peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:shadow-soft peer-checked:ring-1 peer-checked:ring-accent peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-[3px] peer-focus-visible:outline-accent motion-reduce:transition-none";

/** How close to MAX_STYLE_DESCRIPTION_LENGTH before the counter appears. */
const STYLE_COUNTER_THRESHOLD = 60;

export function InstallSelector(props: InstallSelectorProps) {
  const selection = useBookingSelection();
  const uid = useId();
  const installGroup = useRef<HTMLFieldSetElement>(null);
  const finishGroup = useRef<HTMLFieldSetElement>(null);

  const onPage = props.mode === "page";
  const installType = onPage ? props.installType : selection.installType;
  const finish = selection.finish;
  const styleDescription = selection.styleDescription;
  const styleCharsLeft = MAX_STYLE_DESCRIPTION_LENGTH - styleDescription.length;
  const finishes = installType
    ? getInstallType(installType).finishes
    : FINISHES.map((option) => option.id);

  /*
    On an install page, picking a finish is also picking this page's install:
    the visitor is choosing how she wants a FRONTAL styled. On /book the two
    are independent answers and each click changes only its own.
  */
  const chooseFinish = (id: FinishId | null) =>
    setBookingSelection(
      onPage ? { installType: props.installType, finish: id } : { finish: id },
    );

  /*
    Where the Book button goes. Both installType and finish are required, so
    either missing means null: no half-complete link. On an install page the
    choice is otherwise complete, so it opens /book at the request form with
    both answers in the URL. On /book itself the form is further down this
    same page, so it is an anchor: a link back to /book with a different
    query string would reload the page for nothing. Either way an external
    scheduler, once configured, wins.
  */
  const bookTarget = (() => {
    if (!installType || !finish) return null;
    if (onPage) return bookingTargetAtForm({ install: installType, finish });
    const target = bookingTarget({ install: installType, finish });
    return "target" in target ? target : { href: `#${BOOKING_ANCHOR}` };
  })();

  /**
   * Sends the keyboard to whichever required group still needs an answer,
   * for the "aria-disabled" Book button below. Install first when both are
   * missing, since it is the one the visitor meets first. In "page" mode
   * installType can never be missing (it is the page), so this only ever
   * reaches the finish fieldset there.
   */
  const focusMissing = () => {
    const target = !installType ? installGroup.current : finishGroup.current;
    target?.querySelector<HTMLInputElement>("input")?.focus();
  };

  return (
    <div>
      {/* ------------------------------------------------ 1 the install --- */}
      <Reveal>
        <StepHeading
          id={`${uid}-install`}
          step={1}
          title={SELECTION.install.heading}
          body={SELECTION.install.body}
        />

        {onPage ? (
          <nav aria-labelledby={`${uid}-install`} className="mt-7 lg:mt-8">
            {/*
              A switch between the two install pages rather than a pair of
              radios: changing it changes everything else on the page, so it
              is navigation, and it is marked up as navigation. The finish
              goes along with it, so comparing the two costs nothing.
            */}
            <ul className="grid w-full grid-cols-2 gap-1 rounded-full border border-line-strong bg-surface p-1 sm:inline-grid sm:w-auto">
              {INSTALL_TYPES.map((type) => {
                const current = type.id === props.installType;
                return (
                  <li key={type.id} className="min-w-0">
                    <a
                      href={
                        current || !finish
                          ? type.href
                          : `${type.href}?finish=${finish}`
                      }
                      aria-current={current ? "page" : undefined}
                      /*
                        Switching is choosing, so it is recorded before the
                        page goes: /book will then open on the install she
                        switched to, not the one she left.
                      */
                      onClick={
                        current
                          ? undefined
                          : () => setBookingSelection({ installType: type.id })
                      }
                      className={`flex min-h-11 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors duration-200 sm:px-6 ${
                        current
                          ? "bg-accent text-on-accent"
                          : "text-ink hover:bg-accent-soft hover:text-accent"
                      }`}
                    >
                      {current ? (
                        <Check size={14} weight="bold" aria-hidden="true" />
                      ) : null}
                      {type.label}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ) : (
          <fieldset
            ref={installGroup}
            aria-labelledby={`${uid}-install`}
            aria-required="true"
            className="mt-8 grid gap-5 sm:grid-cols-2 lg:mt-10 lg:gap-8"
          >
            {INSTALL_TYPES.map((type) => (
              <div key={type.id} className="flex min-w-0 flex-col">
                <label className="relative block cursor-pointer">
                  <input
                    type="radio"
                    name={`${uid}-install`}
                    value={type.id}
                    checked={installType === type.id}
                    onChange={() =>
                      setBookingSelection({ installType: type.id })
                    }
                    aria-label={type.label}
                    aria-describedby={`${uid}-${type.id}-line`}
                    className="peer sr-only"
                  />
                  <span className={`${CHOICE_SURFACE} flex-row sm:flex-col`}>
                    {/*
                      Beside the words on a phone, so both installs fit on one
                      screen and can be compared without scrolling; above them
                      from `sm`, where the card is wide enough to lead with the
                      picture.
                    */}
                    {/*
                      Square from `lg`: at 4:5 the two cards stood taller
                      than a laptop screen, so the second question fell
                      below the fold before the first was answered.
                    */}
                    <span className="relative aspect-[3/4] w-[38%] shrink-0 overflow-hidden bg-surface-3 sm:aspect-[4/5] sm:w-full lg:aspect-square">
                      <Photograph
                        photo={type.image}
                        sizes="(min-width: 1024px) 42vw, (min-width: 640px) 45vw, 38vw"
                        decorative
                        style={{ objectPosition: type.imageFocal }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    </span>
                    <span className="flex min-w-0 flex-1 flex-col justify-center py-5 pl-5 pr-12 sm:p-7 lg:p-8">
                      <span className="font-display text-2xl leading-tight tracking-tight text-ink lg:text-3xl">
                        {type.label}
                      </span>
                      <span
                        id={`${uid}-${type.id}-line`}
                        className="mt-2 font-display text-base italic leading-snug text-muted lg:text-lg"
                      >
                        {type.tagline}
                      </span>
                    </span>
                  </span>
                  <Tick />
                </label>

                {/*
                  Outside the label: a link inside a radio's label would be a
                  second control nested in the first, and a tap on it would
                  both select the card and leave the page.
                */}
                <a
                  href={type.href}
                  className="group mt-2 inline-flex min-h-11 items-center gap-2 self-start text-sm font-medium text-accent"
                >
                  {CTA.viewInstall} {type.label}
                  <ArrowRight
                    size={15}
                    weight="regular"
                    aria-hidden="true"
                    className="transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:translate-x-1 motion-reduce:transition-none"
                  />
                </a>
              </div>
            ))}
          </fieldset>
        )}
      </Reveal>

      {/* ------------------------------------------------- 2 the finish --- */}
      <Reveal className="mt-14 lg:mt-20">
        <StepHeading
          id={`${uid}-finish`}
          step={2}
          title={SELECTION.finish.heading}
          body={SELECTION.finish.body}
          bodyId={`${uid}-finish-body`}
        />

        <fieldset
          ref={finishGroup}
          aria-labelledby={`${uid}-finish`}
          aria-describedby={`${uid}-finish-body`}
          aria-required="true"
          className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:mt-10 lg:grid-cols-3 lg:gap-6"
        >
          {finishes.map((id) => {
            const option = getFinish(id);
            return (
              <label key={id} className="relative block cursor-pointer">
                <input
                  type="radio"
                  name={`${uid}-finish`}
                  value={id}
                  checked={finish === id}
                  onChange={() => chooseFinish(id)}
                  aria-label={option.label}
                  aria-describedby={`${uid}-${id}-description`}
                  className="peer sr-only"
                />
                <span className={`${CHOICE_SURFACE} flex-col`}>
                  <span className="relative aspect-[4/3] overflow-hidden bg-surface-2 lg:aspect-[3/2]">
                    {option.image ? (
                      <Photograph
                        photo={option.image}
                        sizes="(min-width: 1024px) 30vw, 45vw"
                        decorative
                        style={{ objectPosition: option.imageFocal }}
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                    ) : (
                      /*
                        No photograph of this finish exists in Nat's set, so
                        the swatch is a plain blush field with a spiral glyph,
                        not someone else's picture. FINISH_PHOTOS in
                        lib/collections.ts is where a real one goes.
                      */
                      <span
                        aria-hidden="true"
                        className="absolute inset-0 flex items-center justify-center bg-surface-2"
                      >
                        <Spiral
                          size={44}
                          weight="thin"
                          className="h-11 w-11 text-accent/60 lg:h-16 lg:w-16"
                        />
                      </span>
                    )}
                  </span>
                  <span className="flex flex-1 flex-col p-4 sm:p-5 lg:p-6">
                    <span className="pr-7 font-display text-lg leading-tight tracking-tight text-ink sm:text-xl">
                      {option.label}
                    </span>
                    <span
                      id={`${uid}-${id}-description`}
                      className="mt-1.5 text-sm leading-relaxed text-muted"
                    >
                      {option.description}
                    </span>
                  </span>
                </span>
                <Tick />
              </label>
            );
          })}
        </fieldset>
      </Reveal>

      {/* -------------------------------------------- 3 a style in mind --- */}
      <Reveal className="mt-14 lg:mt-20">
        <StepHeading
          id={`${uid}-style`}
          step={3}
          title={SELECTION.style.heading}
          body={
            <>
              {SELECTION.style.body}{" "}
              <span className="whitespace-nowrap text-muted/80">
                ({SELECTION.style.optional})
              </span>
            </>
          }
          bodyId={`${uid}-style-body`}
        />

        {/*
          A single control, so it is labelled the way the finish FIELDSET is
          labelled - aria-labelledby to the step heading, aria-describedby to
          the sentence under it - rather than a repeated visible <label> that
          would just restate the question a second time. The placeholder is
          additional, in-context text on top of that real accessible name, not
          a stand-in for one (Section 4.6): it keeps its own name after the
          first character is typed.

          Free text, so it is never required and never validated: the button
          below stays enabled with this field empty, unlike install and
          finish, which both must be chosen to reach it.
        */}
        <textarea
          name="styleDescription"
          rows={3}
          value={styleDescription}
          maxLength={MAX_STYLE_DESCRIPTION_LENGTH}
          onChange={(event) =>
            setBookingSelection({ styleDescription: event.target.value })
          }
          placeholder={SELECTION.style.placeholder}
          aria-labelledby={`${uid}-style`}
          aria-describedby={
            styleCharsLeft <= STYLE_COUNTER_THRESHOLD
              ? `${uid}-style-body ${uid}-style-count`
              : `${uid}-style-body`
          }
          className="mt-7 min-h-12 w-full resize-y rounded-3xl border border-line-strong bg-bg px-4 py-3.5 text-base leading-relaxed text-ink transition-colors duration-200 placeholder:text-muted/60 hover:border-accent lg:mt-8"
        />

        {/*
          Silent for nearly the whole 500 characters, on purpose: a counter
          ticking down from the first keystroke is the kind of chrome that
          makes a luxury booking flow feel like a form. It appears only once
          there is a real reason to watch it, aria-live so a screen reader
          user gets the same late warning a sighted one sees rather than
          being cut off with no explanation at maxLength.
        */}
        {styleCharsLeft <= STYLE_COUNTER_THRESHOLD ? (
          <p
            id={`${uid}-style-count`}
            aria-live="polite"
            className="mt-2 text-xs text-muted"
          >
            {SELECTION.style.charsLeft(styleCharsLeft)}
          </p>
        ) : null}
      </Reveal>

      {/* ---------------------------------------------------- 4 the ask --- */}
      <Reveal className="mt-14 lg:mt-20">
        {/*
          The one wine surface in the flow, for the same reason the closing
          band on the inner pages is wine: it is the full stop, and the
          near-white pill on it is the highest-contrast object on the page.
          `on-photo` flips the focus ring to near-white to match.
        */}
        <div className="on-photo rounded-3xl bg-ink p-6 sm:p-8 lg:p-12">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between lg:gap-12">
            <div className="min-w-0">
              <StepHeading
                id={`${uid}-book`}
                step={4}
                title={SELECTION.book.heading}
                tone="wine"
              />

              {/*
                Indented to sit under the heading's words rather than under
                its numeral (a 36px numeral plus the 20px gap), from `sm`
                only: on a phone the two columns need that width for the
                names to stay on one line.
              */}
              <dl className="mt-7 grid grid-cols-2 gap-x-6 gap-y-5 sm:flex sm:gap-x-14 sm:pl-14">
                <div className="min-w-0">
                  <dt className="label text-on-accent/60">
                    {SELECTION.book.install}
                  </dt>
                  <dd className="mt-3 font-display text-xl leading-tight text-on-accent lg:text-2xl">
                    {installType ? (
                      getInstallType(installType).label
                    ) : (
                      <span className="italic text-on-accent/65">
                        {SELECTION.book.noInstall}
                      </span>
                    )}
                  </dd>
                </div>
                <div className="min-w-0">
                  <dt className="label text-on-accent/60">
                    {SELECTION.book.finish}
                  </dt>
                  <dd className="mt-3 font-display text-xl leading-tight text-on-accent lg:text-2xl">
                    {finish ? (
                      getFinish(finish).label
                    ) : (
                      <span className="italic text-on-accent/65">
                        {SELECTION.book.noFinish}
                      </span>
                    )}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="w-full shrink-0 sm:w-auto">
              {bookTarget ? (
                <ButtonLink
                  {...bookTarget}
                  variant="onPhoto"
                  className="w-full sm:w-auto"
                >
                  <CalendarCheck size={17} weight="regular" aria-hidden="true" />
                  {CTA.book}
                </ButtonLink>
              ) : (
                /*
                  Nothing to book yet. Not a disabled <button>, which a
                  keyboard cannot reach and a screen reader may skip:
                  aria-disabled keeps it in the tab order, says why it is not
                  ready, and a press takes the visitor back to the choice it
                  is waiting on.
                */
                <>
                  <button
                    type="button"
                    aria-disabled="true"
                    aria-describedby={`${uid}-need-selection`}
                    onClick={focusMissing}
                    className={`${buttonStyles.onPhoto} w-full cursor-pointer opacity-60 sm:w-auto`}
                  >
                    <CalendarCheck size={17} weight="regular" aria-hidden="true" />
                    {CTA.book}
                  </button>
                  <p
                    id={`${uid}-need-selection`}
                    className="mt-3 text-sm text-on-accent/75"
                  >
                    {!installType && !finish
                      ? SELECTION.book.needBoth
                      : !installType
                        ? SELECTION.book.needInstall
                        : SELECTION.book.needFinish}
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

/**
 * "Book Frontal Install", for the hero of an install page.
 *
 * A client component only so that it can carry the finish when one has
 * already been chosen, on this page or an earlier one. Before hydration, and
 * with no finish chosen, it reads as the finish-first fallback below, which is
 * also exactly what the prerendered HTML says, so there is no mismatch.
 *
 * FINISH IS NOW REQUIRED, so this button is no longer a plain link to /book
 * regardless of state: without a finish yet, sending the visitor straight to
 * the request form would land her on a field she still has to fill in before
 * anything can send, which is a worse version of the finish step she has not
 * seen yet. Scrolling her to #finish instead is the same destination the
 * quiet "Choose your finish" button beside it already goes to, so the
 * pill and its neighbour briefly agree rather than one out-promising the
 * other. Once a finish exists, it reverts to the real booking link.
 */
export function BookInstallLink({
  installType,
  className = "",
}: {
  installType: InstallTypeId;
  className?: string;
}) {
  const { finish } = useBookingSelection();

  if (!finish) {
    return (
      <a href="#finish" className={`${buttonStyles.onPhoto} ${className}`}>
        <CalendarCheck size={16} weight="regular" aria-hidden="true" />
        {CTA.bookInstall} {getInstallType(installType).label}
        <ArrowDown size={14} weight="regular" aria-hidden="true" />
      </a>
    );
  }

  return (
    <ButtonLink
      {...bookingTargetAtForm({ install: installType, finish })}
      variant="onPhoto"
      className={className}
    >
      <CalendarCheck size={16} weight="regular" aria-hidden="true" />
      {CTA.bookInstall} {getInstallType(installType).label}
    </ButtonLink>
  );
}

/**
 * A step's heading, with its number drawn beside it rather than written into
 * it. The number is decoration for sighted visitors, who can see where they
 * are; a screen reader gets "Step 2 of 3" in front of the heading instead,
 * which is where the count actually earns its place.
 */
function StepHeading({
  id,
  step,
  title,
  body,
  bodyId,
  tone = "paper",
}: {
  id: string;
  step: number;
  title: string;
  body?: ReactNode;
  bodyId?: string;
  tone?: "paper" | "wine";
}) {
  const wine = tone === "wine";
  return (
    <div className="flex items-start gap-4 sm:gap-5">
      <span
        aria-hidden="true"
        className={`tabular mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border font-display text-base ${
          wine
            ? "border-on-accent/30 text-on-accent/85"
            : "border-line-strong text-accent"
        }`}
      >
        {step}
      </span>
      <div className="min-w-0">
        <h2
          id={id}
          className={`font-display text-2xl leading-tight tracking-tight md:text-3xl ${
            wine ? "text-on-accent" : "text-ink"
          }`}
        >
          <span className="sr-only">{SELECTION.stepOf(step, TOTAL_STEPS)}</span>
          {title}
        </h2>
        {body ? (
          <p
            id={bodyId}
            className="mt-2 max-w-[52ch] text-base leading-relaxed text-muted"
          >
            {body}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The tick on a chosen card. A sibling of the radio (see the note at the top
 * of this file), decorative, and redundant by design: the border, the ring
 * and the ground already say the same thing.
 */
function Tick() {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute right-3 top-3 flex h-7 w-7 scale-75 items-center justify-center rounded-full bg-accent text-on-accent opacity-0 shadow-soft transition-[opacity,transform] duration-200 peer-checked:scale-100 peer-checked:opacity-100 motion-reduce:transition-none sm:right-4 sm:top-4"
    >
      <Check size={14} weight="bold" />
    </span>
  );
}
