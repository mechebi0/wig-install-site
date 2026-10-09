"use client";

import { SelectField } from "@/components/ui/form";
import {
  COLLECTIONS_IN_ORDER,
  FINISH_LABELS,
  collectionTitle,
  type FinishAttribute,
} from "@/lib/collections";
import { SERVICES, type ServiceId } from "@/lib/content";
import { INSTALL_TYPES, getInstallType, type InstallTypeId } from "@/lib/taxonomy";

export { collectionTitle };

/**
 * The choices that say where a photograph appears and how it is labelled,
 * shared by the upload form and the edit dialog so the two cannot describe a
 * photograph differently.
 *
 * They are the site's own axes and nothing else (see "THE THREE DIMENSIONS"
 * in lib/collections.ts):
 *
 *   collections    which of the six /gallery/ pages show it. Natural Lace is
 *                  a lace finish rather than a hairstyle, and says so.
 *   install type   Frontal Install, Closure Install or Reinstalls, or nothing.
 *                  A booking service, so it is only ever a label on a
 *                  photograph Nat says it applies to; choosing one never
 *                  creates anything bookable. It also lets the photograph
 *                  appear on that install's own page.
 *   booking pages  which of the seven services' own booking pages
 *                  (/book/<service>/) show it. Finer than the install type:
 *                  a frontal can be a plain or a colour frontal, a reinstall
 *                  a frontal or a closure one, and only Nat knows which.
 *   lace details   what the gallery caption names under the title: Melted
 *                  Hairline, HD Lace, Custom Hairline. Natural Lace is the
 *                  collection above rather than a second tick box here.
 *   recent work    whether the homepage's recent-work rail shows it.
 *
 * Labels come from lib/collections.ts and lib/taxonomy.ts, so the manager
 * always uses the names the visitor sees.
 */

export const COLLECTION_OPTIONS = COLLECTIONS_IN_ORDER.map((collection) => ({
  slug: collection.slug,
  title: collection.title,
  finish: collection.dimension === "finish",
}));

export function installTypeLabel(id: InstallTypeId | null): string {
  return id ? getInstallType(id).label : "";
}

const LACE_OPTIONS: readonly FinishAttribute[] = ["melted-hairline", "hd-lace", "custom-hairline"];

/** A pill-shaped tick box, the look every multiple choice here shares. */
function Chip({
  id,
  label,
  note,
  checked,
  disabled,
  onToggle,
}: {
  id?: string;
  label: string;
  note?: string;
  checked: boolean;
  disabled?: boolean;
  onToggle: () => void;
}) {
  return (
    <label
      className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border px-4 text-sm transition-colors duration-200 ${
        checked
          ? "border-accent bg-accent-soft text-accent"
          : "border-line-strong bg-bg text-ink hover:border-accent"
      } ${disabled ? "pointer-events-none opacity-60" : ""}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={onToggle}
        className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
      />
      {label}
      {note ? <span className="text-muted">{note}</span> : null}
    </label>
  );
}

/**
 * The first checkbox carries `id`, so focusFirstError() can land on the group
 * when nothing is ticked.
 *
 * `required` is off only when editing a photograph that already fills a place
 * on the site without being in a gallery, like the homepage's opening
 * photograph: it has every right to be in none.
 */
export function CollectionsField({
  id,
  value,
  onChange,
  error,
  disabled,
  required = true,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
  required?: boolean;
}) {
  const toggle = (slug: string) =>
    onChange(
      value.includes(slug)
        ? value.filter((existing) => existing !== slug)
        : // Kept in the site's own order, whatever order they were ticked in.
          COLLECTION_OPTIONS.map((option) => option.slug).filter(
            (candidate) => candidate === slug || value.includes(candidate),
          ),
    );

  return (
    <fieldset
      aria-describedby={[error ? `${id}-error` : null, `${id}-help`].filter(Boolean).join(" ")}
    >
      <legend className="text-sm font-medium text-ink">
        Collections
        {required ? (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        ) : null}
      </legend>
      <p id={`${id}-help`} className="mt-1 text-sm text-muted">
        {required
          ? "The gallery pages it appears on. Pick one or more."
          : "The gallery pages it appears on. With none ticked it only shows in the places it fills, listed under Where photos appear."}
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {COLLECTION_OPTIONS.map((option, index) => (
          <Chip
            key={option.slug}
            id={index === 0 ? id : undefined}
            label={option.title}
            note={option.finish ? "(lace finish)" : undefined}
            checked={value.includes(option.slug)}
            disabled={disabled}
            onToggle={() => toggle(option.slug)}
          />
        ))}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </fieldset>
  );
}

export function InstallTypeField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: InstallTypeId | null;
  onChange: (next: InstallTypeId | null) => void;
  disabled?: boolean;
}) {
  return (
    <SelectField
      id={id}
      label="Install type"
      value={value ?? ""}
      disabled={disabled}
      onChange={(event) => {
        const next = INSTALL_TYPES.find((type) => type.id === event.target.value);
        onChange(next ? next.id : null);
      }}
      help="Only when you are sure. It adds a small tag to the photo and lets it appear on that install's page, which shows up to six, earliest in your order first."
    >
      <option value="">Not specified</option>
      {INSTALL_TYPES.map((type) => (
        <option key={type.id} value={type.id}>
          {type.label}
        </option>
      ))}
    </SelectField>
  );
}

export function PublishField({
  id,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  // The whole line is the label, so the touch target is the row rather than
  // a 20px box.
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={`${id}-help`}
          className="h-5 w-5 shrink-0 cursor-pointer accent-accent"
        />
        <span className="text-sm font-medium text-ink">Show on the website</span>
      </label>
      <p id={`${id}-help`} className="pl-8 text-sm text-muted">
        Untick to keep it hidden until you are ready. Hidden photos stay here
        and can be shown later.
      </p>
    </div>
  );
}

/** Lace details for the gallery caption. All optional. */
export function LaceDetailsField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: FinishAttribute[];
  onChange: (next: FinishAttribute[]) => void;
  disabled?: boolean;
}) {
  const toggle = (detail: FinishAttribute) =>
    onChange(
      LACE_OPTIONS.filter((option) =>
        option === detail ? !value.includes(detail) : value.includes(option),
      ),
    );

  return (
    <fieldset aria-describedby={`${id}-help`}>
      <legend className="text-sm font-medium text-ink">Lace details (optional)</legend>
      <p id={`${id}-help`} className="mt-1 text-sm text-muted">
        Named under the title when someone looks closer in the gallery.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {LACE_OPTIONS.map((detail, index) => (
          <Chip
            key={detail}
            id={index === 0 ? id : undefined}
            label={FINISH_LABELS[detail]}
            checked={value.includes(detail)}
            disabled={disabled}
            onToggle={() => toggle(detail)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/**
 * The booking pages that show it, one tick box per service, in menu order.
 * All optional: a photograph on no booking page is still everywhere else.
 */
export function BookingServicesField({
  id,
  value,
  onChange,
  disabled,
}: {
  id: string;
  value: ServiceId[];
  onChange: (next: ServiceId[]) => void;
  disabled?: boolean;
}) {
  const toggle = (service: ServiceId) =>
    onChange(
      SERVICES.map((option) => option.id).filter((option) =>
        option === service ? !value.includes(service) : value.includes(option),
      ),
    );

  return (
    <fieldset aria-describedby={`${id}-help`}>
      <legend className="text-sm font-medium text-ink">Booking pages (optional)</legend>
      <p id={`${id}-help`} className="mt-1 text-sm text-muted">
        Tick the services this photo shows. Someone booking one of them then
        sees it on that service&rsquo;s booking page, which shows up to six,
        earliest in your order first. A reinstall page with no photos ticked
        shows your Reinstalls photos instead.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {SERVICES.map((service, index) => (
          <Chip
            key={service.id}
            id={index === 0 ? id : undefined}
            label={service.name}
            checked={value.includes(service.id)}
            disabled={disabled}
            onToggle={() => toggle(service.id)}
          />
        ))}
      </div>
    </fieldset>
  );
}

/** In place of BookingServicesField while the database cannot store the choice. */
export function BookingServicesUnavailable() {
  return (
    <div>
      <p className="text-sm font-medium text-ink">Booking pages</p>
      <p className="mt-1 text-sm text-muted">
        Choosing which booking pages show a photo needs a one-time update to
        the website&rsquo;s database. Your developer has the steps in
        docs/photo-manager.md (One-time setup, step 1).
      </p>
    </div>
  );
}

/** Whether the homepage's recent-work rail shows it. */
export function FeaturedField({
  id,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-center gap-3">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
          aria-describedby={`${id}-help`}
          className="h-5 w-5 shrink-0 cursor-pointer accent-accent"
        />
        <span className="text-sm font-medium text-ink">Show in Recent work on the homepage</span>
      </label>
      <p id={`${id}-help`} className="pl-8 text-sm text-muted">
        The row of photos near the foot of the homepage. Six reads best.
      </p>
    </div>
  );
}
