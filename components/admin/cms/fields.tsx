"use client";

import { useId, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, CaretDown, Plus, Trash } from "@phosphor-icons/react/dist/ssr";
import { AdminDialog } from "@/components/admin/admin-dialog";
import { buttonStyles } from "@/components/button";
import { SelectField, TextAreaField, TextField } from "@/components/ui/form";
import type { FieldSpec, TextSpec } from "@/lib/cms/admin-schema";
import { FREE_LISTS, PAGE_LINKS, type SectionKey } from "@/lib/cms/defaults";
import { formatDollars, formatMinutes } from "@/lib/cms/diff";
import {
  dollarsText,
  nextLocationId,
  parseDollars,
  parseMinutes,
  previewText,
  type Item,
} from "@/lib/cms/editor";
import type { Places } from "@/lib/cms/model";
import { fieldId, type Issues } from "@/lib/cms/validate";

/**
 * Every kind of field the dashboard edits (lib/cms/admin-schema.ts), built on
 * the site's own form primitives (components/ui/form.tsx), so labels, help
 * and errors are wired to their inputs the same way as on every other form:
 * a real <label>, help and error read with the field, aria-invalid on the
 * field itself.
 *
 * Fields are controlled: the section editor holds the value and these only
 * report changes. Nothing here saves anything.
 */

export type FieldContext = {
  section: SectionKey;
  errors: Issues;
  warnings: Issues;
  /** Where Nat works, as the section being edited would leave it, for previews. */
  places: Places;
  /** The whole section being edited, for the fields that look across it. */
  sectionValue: Item;
  disabled: boolean;
};

type FieldProps = {
  field: FieldSpec;
  value: unknown;
  onChange: (next: unknown) => void;
  /** Where this field sits in the section, the same path validation reports on. */
  path: string;
  ctx: FieldContext;
};

/** Text areas, lists and groups take the whole row of a two-column form. */
const WIDE = new Set<FieldSpec["kind"]>([
  "textarea",
  "group",
  "record",
  "fixed",
  "keyed",
  "list",
  "primaryLocation",
]);

export function Field(props: FieldProps) {
  return (
    <div className={`min-w-0 ${WIDE.has(props.field.kind) ? "sm:col-span-2" : ""}`}>
      <FieldBody {...props} />
    </div>
  );
}

function FieldBody({ field, value, onChange, path, ctx }: FieldProps) {
  const id = fieldId(ctx.section, path);
  const error = ctx.errors[path];

  switch (field.kind) {
    case "text":
    case "textarea":
      return <TextInput field={field} value={value} onChange={onChange} path={path} ctx={ctx} />;

    case "email":
    case "phone":
    case "url":
      return (
        <TextField
          id={id}
          label={field.label}
          type={field.kind === "phone" ? "tel" : field.kind}
          inputMode={field.kind === "phone" ? "tel" : field.kind}
          autoComplete="off"
          spellCheck={false}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          error={error}
          help={<HelpLines optional={field.kind !== "email"} help={field.help} warning={ctx.warnings[path]} />}
          disabled={ctx.disabled}
        />
      );

    case "page":
      return (
        <SelectField
          id={id}
          label={field.label}
          value={typeof value === "string" ? value : ""}
          onChange={(event) => onChange(event.target.value)}
          error={error}
          help={field.help}
          disabled={ctx.disabled}
        >
          {PAGE_LINKS.map((page) => (
            <option key={page.href} value={page.href}>
              {page.label}
            </option>
          ))}
        </SelectField>
      );

    case "toggle":
      return (
        <Toggle
          id={id}
          label={field.label}
          on={field.on}
          off={field.off}
          checked={value === true}
          onChange={onChange}
          help={field.help}
          error={error}
          disabled={ctx.disabled}
        />
      );

    case "price":
      return <PriceInput id={id} label={field.label} help={field.help} value={value} onChange={onChange} error={error} disabled={ctx.disabled} />;

    case "minutes":
      return <MinutesInput id={id} label={field.label} help={field.help} value={value} onChange={onChange} error={error} disabled={ctx.disabled} />;

    case "primaryLocation":
      return <PrimaryLocation id={id} label={field.label} value={value} onChange={onChange} ctx={ctx} path={path} />;

    case "group": {
      const group = (value ?? {}) as Item;
      return (
        <div className="flex flex-col gap-4">
          {field.label ? <p className="text-sm font-medium text-ink">{field.label}</p> : null}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            {field.fields.map((child) => (
              <Field
                key={child.key}
                field={child}
                value={group[child.key]}
                onChange={(next) => onChange({ ...group, [child.key]: next })}
                path={`${path}.${child.key}`}
                ctx={ctx}
              />
            ))}
          </div>
        </div>
      );
    }

    case "record": {
      const record = (value ?? {}) as Record<string, Item>;
      return (
        <div className="flex flex-col gap-3">
          {field.entries.map((entry) => {
            const item = record[entry.key] ?? {};
            const flagged = Object.keys(ctx.errors).some((key) => key.startsWith(`${path}.${entry.key}.`));
            return (
              <details key={entry.key} className="group/entry rounded-3xl border border-line bg-bg">
                <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 rounded-3xl px-5 py-3 [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-lg tracking-tight text-ink">
                    {entry.title}
                    {flagged ? <span className="ml-2 text-sm font-medium text-danger">Needs attention</span> : null}
                  </span>
                  <CaretDown
                    size={18}
                    weight="regular"
                    aria-hidden="true"
                    className="shrink-0 text-accent transition-transform duration-200 group-open/entry:rotate-180 motion-reduce:transition-none"
                  />
                </summary>
                <div className="grid grid-cols-1 gap-5 border-t border-line px-5 py-5 sm:grid-cols-2">
                  {entry.fields.map((child) => (
                    <Field
                      key={child.key}
                      field={child}
                      value={item[child.key]}
                      onChange={(next) => onChange({ ...record, [entry.key]: { ...item, [child.key]: next } })}
                      path={`${path}.${entry.key}.${child.key}`}
                      ctx={ctx}
                    />
                  ))}
                </div>
              </details>
            );
          })}
        </div>
      );
    }

    case "fixed": {
      const items = (Array.isArray(value) ? value : []) as Item[];
      return (
        <div className="flex flex-col gap-3">
          <p className="text-sm font-medium text-ink">{field.label}</p>
          {items.map((item, index) => (
            <div key={index} className="rounded-3xl border border-line bg-bg p-5">
              <p className="label text-muted">{field.itemTitles[index] ?? `Item ${index + 1}`}</p>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {field.fields.map((child) => (
                  <Field
                    key={child.key}
                    field={child}
                    value={item[child.key]}
                    onChange={(next) => onChange(items.map((current, at) => (at === index ? { ...current, [child.key]: next } : current)))}
                    path={`${path}.${index}.${child.key}`}
                    ctx={ctx}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      );
    }

    case "keyed":
      return <KeyedList field={field} value={value} onChange={onChange} path={path} ctx={ctx} />;

    case "list":
      return <FreeList field={field} value={value} onChange={onChange} path={path} ctx={ctx} />;
  }
}

// ------------------------------------------------------------------ texts ---

/** Help, then a warning, then anything else, each on its own line under the field. */
function HelpLines({
  optional,
  help,
  warning,
  children,
}: {
  optional?: boolean;
  help?: string;
  warning?: string;
  children?: ReactNode;
}) {
  if (!optional && !help && !warning && !children) return null;
  return (
    <>
      {optional || help ? (
        <span className="block">
          {optional ? "Optional. " : ""}
          {help}
        </span>
      ) : null}
      {warning ? <span className="mt-1 block font-medium text-accent">{warning}</span> : null}
      {children}
    </>
  );
}

function TextInput({ field, value, onChange, path, ctx }: Omit<FieldProps, "field"> & { field: TextSpec }) {
  const id = fieldId(ctx.section, path);
  const text = typeof value === "string" ? value : "";
  const over = text.length > field.max;
  const near = text.length > field.max * 0.8;
  const preview = /\{[^}]+\}/.test(text) ? previewText(text, ctx.places) : "";

  const help = (
    <HelpLines optional={!field.required} help={field.help} warning={ctx.warnings[path]}>
      {preview ? (
        <span className="mt-1 block">
          <span className="font-medium text-ink">Reads as: </span>
          <span className="whitespace-pre-line">{preview}</span>
        </span>
      ) : null}
      {near ? (
        <span className={`mt-1 block tabular ${over ? "font-medium text-danger" : ""}`}>
          {text.length} of {field.max} characters
        </span>
      ) : null}
    </HelpLines>
  );

  const shared = {
    id,
    label: field.label,
    value: text,
    error: ctx.errors[path],
    help,
    disabled: ctx.disabled,
  };

  return field.kind === "textarea" ? (
    <TextAreaField {...shared} rows={field.rows ?? 3} onChange={(event) => onChange(event.target.value)} />
  ) : (
    <TextField {...shared} onChange={(event) => onChange(event.target.value)} />
  );
}

// ----------------------------------------------------------------- numbers ---

/**
 * A price, typed in dollars and kept in cents. What is typed is kept exactly
 * as typed while it is being typed ("95." is on its way to "95.50"), and only
 * replaced when the value changes from outside, such as Cancel.
 */
function PriceInput({
  id,
  label,
  help,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  help?: string;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
  disabled: boolean;
}) {
  const cents = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [text, setText] = useState(cents === null ? "" : dollarsText(cents));
  const [seen, setSeen] = useState<number | null>(cents);
  // React's "adjust state when a prop changes" pattern: a value changed from
  // outside (Cancel, a reload) replaces what is typed.
  if (!Object.is(seen, cents)) {
    setSeen(cents);
    setText(cents === null ? "" : dollarsText(cents));
  }

  return (
    <TextField
      id={id}
      label={label}
      inputMode="decimal"
      autoComplete="off"
      value={text}
      onChange={(event) => {
        const next = parseDollars(event.target.value);
        setText(event.target.value);
        setSeen(next);
        onChange(next);
      }}
      error={error}
      help={
        <HelpLines help={help}>
          {cents !== null ? <span className="mt-1 block font-medium text-ink">Shows as {formatDollars(cents)}</span> : null}
        </HelpLines>
      }
      disabled={disabled}
    />
  );
}

function MinutesInput({
  id,
  label,
  help,
  value,
  onChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  help?: string;
  value: unknown;
  onChange: (next: unknown) => void;
  error?: string;
  disabled: boolean;
}) {
  const minutes = typeof value === "number" && Number.isFinite(value) ? value : null;
  const [text, setText] = useState(minutes === null ? "" : String(minutes));
  const [seen, setSeen] = useState<number | null>(minutes);
  if (!Object.is(seen, minutes)) {
    setSeen(minutes);
    setText(minutes === null ? "" : String(minutes));
  }

  return (
    <TextField
      id={id}
      label={label}
      inputMode="numeric"
      autoComplete="off"
      value={text}
      onChange={(event) => {
        const next = parseMinutes(event.target.value);
        setText(event.target.value);
        setSeen(next);
        onChange(next);
      }}
      error={error}
      help={
        <HelpLines help={help}>
          {minutes !== null ? <span className="mt-1 block font-medium text-ink">Shows as {formatMinutes(minutes)}</span> : null}
        </HelpLines>
      }
      disabled={disabled}
    />
  );
}

// ---------------------------------------------------------------- switches ---

/**
 * A real switch: `role="switch"` and `aria-checked`, and the visible word
 * beside it changes too, so the state never rests on colour or position.
 * The accessible name is the label followed by that word, so it contains
 * everything a sighted person reads on it.
 */
export function Toggle({
  id,
  label,
  on,
  off,
  checked,
  onChange,
  help,
  error,
  disabled,
}: {
  id: string;
  label: string;
  on: string;
  off: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  help?: string;
  error?: string;
  disabled?: boolean;
}) {
  const described = [error ? `${id}-error` : "", help ? `${id}-help` : ""].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-2">
      <span id={`${id}-label`} className="text-sm font-medium text-ink">
        {label}
      </span>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={`${id}-label ${id}-state`}
        aria-describedby={described}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className="group inline-flex min-h-11 w-fit cursor-pointer items-center gap-3 rounded-full disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span
          aria-hidden="true"
          className={`relative block h-7 w-12 shrink-0 rounded-full border transition-colors duration-200 ${
            checked ? "border-accent bg-accent" : "border-line-strong bg-surface-3 group-hover:border-accent"
          }`}
        >
          <span
            className={`absolute top-1/2 block h-5 w-5 -translate-y-1/2 rounded-full bg-surface shadow-soft transition-[left] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
              checked ? "left-[1.4rem]" : "left-0.5"
            }`}
          />
        </span>
        <span id={`${id}-state`} className={`text-sm font-medium ${checked ? "text-accent" : "text-muted"}`}>
          {checked ? on : off}
        </span>
      </button>
      {error ? (
        <p id={`${id}-error`} className="text-sm text-danger">
          {error}
        </p>
      ) : null}
      {help ? (
        <p id={`${id}-help`} className="text-sm text-muted">
          {help}
        </p>
      ) : null}
    </div>
  );
}

// --------------------------------------------------------------- locations ---

type LocationItem = { id: string; name: string; region: string; active: boolean };

/**
 * The current location: one of the locations that are switched on, chosen
 * as a radio. A location that is off cannot be chosen, so the website can
 * never call a closed town current.
 */
function PrimaryLocation({
  id,
  label,
  value,
  onChange,
  ctx,
  path,
}: {
  id: string;
  label: string;
  value: unknown;
  onChange: (next: unknown) => void;
  ctx: FieldContext;
  path: string;
}) {
  const items = (Array.isArray(ctx.sectionValue.items) ? ctx.sectionValue.items : []) as LocationItem[];
  const choices = items.filter((item) => item.active && item.name.trim() && item.region.trim());
  const error = ctx.errors[path];
  const warning = ctx.warnings[path];

  return (
    <fieldset aria-describedby={error ? `${id}-error` : warning ? `${id}-warning` : undefined}>
      <legend className="text-sm font-medium text-ink">{label}</legend>
      {choices.length === 0 ? (
        <p className="mt-3 text-sm text-muted">Switch a location on below to choose it as your current location.</p>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {choices.map((item, index) => (
            <label
              key={item.id}
              className="flex min-h-11 cursor-pointer items-center gap-2.5 rounded-full border border-line-strong bg-bg px-4 text-sm text-ink transition-colors has-[:checked]:border-accent has-[:checked]:bg-accent-soft has-[:checked]:font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent"
            >
              <input
                id={index === 0 ? id : undefined}
                type="radio"
                name={id}
                checked={value === item.id}
                onChange={() => onChange(item.id)}
                disabled={ctx.disabled}
                className="h-4 w-4 accent-accent"
              />
              {item.name.trim()}, {item.region.trim()}
            </label>
          ))}
        </div>
      )}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : warning ? (
        <p id={`${id}-warning`} className="mt-2 text-sm font-medium text-accent">
          {warning}
        </p>
      ) : null}
    </fieldset>
  );
}

// ------------------------------------------------------------------- lists ---

/** Moves focus to an element once React has drawn it. */
function focusSoon(id: string) {
  requestAnimationFrame(() => document.getElementById(id)?.focus());
}

function move<T>(items: T[], from: number, to: number): T[] {
  const next = [...items];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/**
 * Which of the moved item's two buttons keeps focus: the one pressed, unless
 * the item has reached the end it was moving towards, where that button is
 * now disabled and focus would fall to the page.
 */
function keepFocusOn(from: number, to: number, count: number): "up" | "down" {
  if (to < from) return to === 0 ? "down" : "up";
  return to === count - 1 ? "up" : "down";
}

/** Earlier / Later, the same pair the photo manager uses. */
function MoveButtons({
  baseId,
  index,
  count,
  title,
  onMove,
  disabled,
}: {
  baseId: string;
  index: number;
  count: number;
  title: string;
  onMove: (to: number) => void;
  disabled: boolean;
}) {
  const style =
    "tap inline-flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-accent disabled:cursor-not-allowed disabled:opacity-35";
  return (
    <>
      <button
        id={`${baseId}-up`}
        type="button"
        className={style}
        disabled={disabled || index === 0}
        aria-label={`Move ${title} earlier`}
        onClick={() => onMove(index - 1)}
      >
        <ArrowUp size={18} weight="regular" aria-hidden="true" />
      </button>
      <button
        id={`${baseId}-down`}
        type="button"
        className={style}
        disabled={disabled || index === count - 1}
        aria-label={`Move ${title} later`}
        onClick={() => onMove(index + 1)}
      >
        <ArrowDown size={18} weight="regular" aria-hidden="true" />
      </button>
    </>
  );
}

/** A fixed set of items with ids (services, homepage blocks, slides). */
function KeyedList({ field, value, onChange, path, ctx }: Omit<FieldProps, "field"> & { field: Extract<FieldSpec, { kind: "keyed" }> }) {
  const items = (Array.isArray(value) ? value : []) as Item[];
  const listError = ctx.errors[path];
  const listWarning = ctx.warnings[path];

  return (
    <div className="flex flex-col gap-3">
      {listError ? <p className="text-sm text-danger">{listError}</p> : null}
      {listWarning ? <p className="text-sm font-medium text-accent">{listWarning}</p> : null}
      <ol className="flex flex-col gap-3">
        {items.map((item, index) => {
          const itemId = String(item.id);
          const title = field.titleOf(item) || "Untitled";
          const baseId = fieldId(ctx.section, `${path}.${itemId}`);
          return (
            <li key={itemId} className="rounded-3xl border border-line bg-bg p-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="min-w-0 font-display text-lg leading-snug tracking-tight text-ink">{title}</h4>
                {field.reorder ? (
                  <div className="-mr-2 flex shrink-0 items-center">
                    <MoveButtons
                      baseId={baseId}
                      index={index}
                      count={items.length}
                      title={title}
                      disabled={ctx.disabled}
                      onMove={(to) => {
                        onChange(move(items, index, to));
                        focusSoon(`${baseId}-${keepFocusOn(index, to, items.length)}`);
                      }}
                    />
                  </div>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                {field.fields.map((child) => (
                  <Field
                    key={child.key}
                    field={child}
                    value={item[child.key]}
                    onChange={(next) => onChange(items.map((current, at) => (at === index ? { ...current, [child.key]: next } : current)))}
                    path={`${path}.${itemId}.${child.key}`}
                    ctx={ctx}
                  />
                ))}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

/** A list Nat adds to: FAQs, reviews, locations, hours, the points under her biography. */
function FreeList({ field, value, onChange, path, ctx }: Omit<FieldProps, "field"> & { field: Extract<FieldSpec, { kind: "list" }> }) {
  const items = (Array.isArray(value) ? value : []) as unknown[];
  const [removing, setRemoving] = useState<number | null>(null);
  const template = FREE_LISTS[`${ctx.section}.${path}`]?.item ?? "";
  const listError = ctx.errors[path];
  const listWarning = ctx.warnings[path];
  const lines = field.fields.length === 0;

  const titleAt = (index: number) => field.titleOf(items[index], index) || `${field.itemName} ${index + 1}`;

  function add() {
    const blank = structuredClone(template) as unknown;
    if (ctx.section === "locations" && blank && typeof blank === "object") {
      (blank as Item).id = nextLocationId(items as { id?: unknown }[]);
    }
    onChange([...items, blank]);
    const first = lines ? `${path}.${items.length}` : `${path}.${items.length}.${field.fields[0].key}`;
    focusSoon(fieldId(ctx.section, first));
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium text-ink">{field.label}</p>
      {listError ? <p className="text-sm text-danger">{listError}</p> : null}
      {listWarning ? <p className="text-sm font-medium text-accent">{listWarning}</p> : null}

      {items.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-line-strong px-5 py-6 text-center text-sm text-muted">
          None yet.
        </p>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => {
            const title = titleAt(index);
            const baseId = fieldId(ctx.section, `${path}.${index}`);
            return (
              <li key={index} className="rounded-3xl border border-line bg-bg p-5">
                <div className="flex items-center justify-between gap-3">
                  <h4 className="min-w-0 break-words font-display text-lg leading-snug tracking-tight text-ink">
                    {lines ? `${field.itemName[0].toUpperCase()}${field.itemName.slice(1)} ${index + 1}` : title}
                  </h4>
                  <div className="-mr-2 flex shrink-0 items-center">
                    <MoveButtons
                      baseId={baseId}
                      index={index}
                      count={items.length}
                      title={title}
                      disabled={ctx.disabled}
                      onMove={(to) => {
                        onChange(move(items, index, to));
                        focusSoon(`${fieldId(ctx.section, `${path}.${to}`)}-${keepFocusOn(index, to, items.length)}`);
                      }}
                    />
                    <button
                      type="button"
                      className="tap inline-flex cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-surface-2 hover:text-danger disabled:cursor-not-allowed disabled:opacity-35"
                      aria-label={`Remove ${title}`}
                      disabled={ctx.disabled}
                      onClick={() => setRemoving(index)}
                    >
                      <Trash size={18} weight="regular" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 gap-5 sm:grid-cols-2">
                  {lines ? (
                    <Field
                      field={{ kind: "text", key: "", label: "Text", max: field.itemMax ?? 200, required: true }}
                      value={item}
                      onChange={(next) => onChange(items.map((current, at) => (at === index ? next : current)))}
                      path={`${path}.${index}`}
                      ctx={ctx}
                    />
                  ) : (
                    field.fields.map((child) => (
                      <Field
                        key={child.key}
                        field={child}
                        value={(item as Item)[child.key]}
                        onChange={(next) =>
                          onChange(items.map((current, at) => (at === index ? { ...(current as Item), [child.key]: next } : current)))
                        }
                        path={`${path}.${index}.${child.key}`}
                        ctx={ctx}
                      />
                    ))
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}

      <div>
        <button
          type="button"
          onClick={add}
          disabled={ctx.disabled || items.length >= field.max}
          className={`${buttonStyles.secondary} w-full sm:w-auto`}
        >
          <Plus size={16} weight="regular" aria-hidden="true" />
          {field.addLabel}
        </button>
        {items.length >= field.max ? (
          <p className="mt-2 text-sm text-muted">
            That is the most the website shows ({field.max}). Remove one to add another.
          </p>
        ) : null}
      </div>

      <ConfirmDialog
        open={removing !== null}
        title={`Remove this ${field.itemName}?`}
        body={
          removing === null
            ? ""
            : `“${titleAt(removing)}” comes off the website when you save and publish. Until you save, Cancel at the foot of this section brings it back.`
        }
        confirmLabel={`Remove ${field.itemName}`}
        onCancel={() => setRemoving(null)}
        onConfirm={() => {
          if (removing === null) return;
          const at = removing;
          setRemoving(null);
          onChange(items.filter((_, index) => index !== at));
        }}
      />
    </div>
  );
}

// ---------------------------------------------------------------- dialogs ---

/**
 * "Are you sure?" for anything that throws work away. Focus starts on the
 * safe choice, so a stray Enter cannot remove anything (AdminDialog).
 */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  busy = false,
}: {
  open: boolean;
  title: string;
  body: ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  busy?: boolean;
}) {
  const titleId = useId();
  const bodyId = useId();
  const cancelId = useId();
  return (
    <AdminDialog
      open={open}
      onClose={onCancel}
      titleId={titleId}
      descriptionId={bodyId}
      initialFocusId={cancelId}
      closeOnBackdrop={!busy}
    >
      <h2 id={titleId} className="font-display text-2xl leading-tight tracking-tight text-ink">
        {title}
      </h2>
      <div id={bodyId} className="mt-3 text-base leading-relaxed text-muted">
        {body}
      </div>
      <div className="mt-7 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <button id={cancelId} type="button" onClick={onCancel} disabled={busy} className={buttonStyles.secondary}>
          {cancelLabel}
        </button>
        <button type="button" onClick={onConfirm} disabled={busy} className={buttonStyles.primary}>
          {confirmLabel}
        </button>
      </div>
    </AdminDialog>
  );
}
