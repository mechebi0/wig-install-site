"use client";

import { SelectField } from "@/components/ui/form";
import { COLLECTIONS_IN_ORDER } from "@/lib/collections";
import { INSTALL_TYPES, getInstallType, type InstallTypeId } from "@/lib/taxonomy";

/**
 * The three choices that say where a photograph appears, shared by the upload
 * form and the edit dialog so the two cannot describe a photograph
 * differently.
 *
 * They are the site's own two axes and nothing else (see "THE THREE
 * DIMENSIONS" in lib/collections.ts):
 *
 *   collections    which of the six /gallery/ pages show it. Natural Lace is
 *                  a lace finish rather than a hairstyle, and says so.
 *   install type   Frontal Install, Closure Install or Reinstalls, or nothing.
 *                  A booking service, so it is only ever a label on a
 *                  photograph Nat says it applies to; choosing one never
 *                  creates anything bookable. It also puts the photograph on
 *                  that install's own page.
 *
 * Labels come from lib/collections.ts and lib/taxonomy.ts, so the manager
 * always uses the names the visitor sees.
 */

export const COLLECTION_OPTIONS = COLLECTIONS_IN_ORDER.map((collection) => ({
  slug: collection.slug,
  title: collection.title,
  finish: collection.dimension === "finish",
}));

export function collectionTitle(slug: string): string {
  return COLLECTION_OPTIONS.find((option) => option.slug === slug)?.title ?? slug;
}

export function installTypeLabel(id: InstallTypeId | null): string {
  return id ? getInstallType(id).label : "";
}

/**
 * The first checkbox carries `id`, so focusFirstError() can land on the group
 * when nothing is ticked.
 */
export function CollectionsField({
  id,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  value: string[];
  onChange: (next: string[]) => void;
  error?: string;
  disabled?: boolean;
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
        <span className="ml-1 text-accent" aria-hidden="true">
          *
        </span>
      </legend>
      <p id={`${id}-help`} className="mt-1 text-sm text-muted">
        The gallery pages it appears on. Pick one or more.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        {COLLECTION_OPTIONS.map((option, index) => {
          const checked = value.includes(option.slug);
          return (
            <label
              key={option.slug}
              className={`inline-flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border px-4 text-sm transition-colors duration-200 ${
                checked
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong bg-bg text-ink hover:border-accent"
              } ${disabled ? "pointer-events-none opacity-60" : ""}`}
            >
              <input
                id={index === 0 ? id : undefined}
                type="checkbox"
                checked={checked}
                disabled={disabled}
                onChange={() => toggle(option.slug)}
                className="h-4 w-4 shrink-0 cursor-pointer accent-accent"
              />
              {option.title}
              {option.finish ? <span className="text-muted">(lace finish)</span> : null}
            </label>
          );
        })}
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
      help="Only when you are sure. It adds a small tag to the photo and shows it on that install's page."
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
