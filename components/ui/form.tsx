"use client";

import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { useId, useState } from "react";
import { Eye, EyeSlash } from "@phosphor-icons/react/dist/ssr";

/**
 * The form primitives, lifted out of components/booking.tsx so that the login,
 * signup, reset, booking and admin screens cannot drift into five slightly
 * different ideas of what an input looks like.
 *
 * The accessibility contract, kept in one place so it is kept at all:
 *   - a real <label>, always. A placeholder is not a label: it disappears the
 *     moment someone types, which is exactly when a person filling in a long
 *     form needs it most.
 *   - help text and error text are wired through aria-describedby, so a screen
 *     reader reads them WITH the field rather than orphaned after it
 *   - the error comes before the help text in the DOM, because when both are
 *     present the error is the more urgent of the two
 *   - aria-invalid marks the field itself, so a "next error" command lands on
 *     the input and not on the paragraph beside it
 *   - 48px minimum height, above the 44px WCAG target floor
 *
 * Shape follows the rule in globals.css: inputs are rounded-3xl, never
 * rounded-full. Full radius is reserved for buttons and pills, and a pill
 * shaped text input reads as a search box.
 */

type BaseFieldProps = {
  label: string;
  error?: string;
  help?: ReactNode;
  className?: string;
};

const controlBase =
  "w-full rounded-3xl border bg-bg px-4 py-3.5 min-h-12 text-base text-ink transition-colors duration-200 placeholder:text-muted/60 hover:border-accent disabled:cursor-not-allowed disabled:opacity-60";

function borderFor(error?: string) {
  return error ? "border-danger" : "border-line-strong";
}

function FieldFrame({
  id,
  label,
  error,
  help,
  className = "",
  children,
  required,
}: BaseFieldProps & {
  id: string;
  children: ReactNode;
  required?: boolean;
}) {
  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <label htmlFor={id} className="text-sm font-medium text-ink">
        {label}
        {required ? (
          <span className="ml-1 text-accent" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      {children}
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

function describedBy(id: string, error?: string, help?: ReactNode) {
  return [error ? `${id}-error` : null, help ? `${id}-help` : null]
    .filter(Boolean)
    .join(" ") || undefined;
}

export type TextFieldProps = BaseFieldProps &
  Omit<ComponentPropsWithoutRef<"input">, "className" | "id"> & { id?: string };

export function TextField({
  label,
  error,
  help,
  className,
  id,
  required,
  ...props
}: TextFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      help={help}
      className={className}
      required={required}
    >
      <input
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, help)}
        required={required}
        className={`${controlBase} ${borderFor(error)}`}
        {...props}
      />
    </FieldFrame>
  );
}

/**
 * Password input with a reveal toggle.
 *
 * The toggle exists because the alternative is a "confirm password" field, and
 * on a phone, being able to SEE what you typed prevents more lockouts than
 * typing it twice ever has. The button is a real button with a real label that
 * changes with its state, not an icon a screen reader has to guess at.
 */
export function PasswordField({
  label,
  error,
  help,
  className,
  id,
  required,
  ...props
}: Omit<TextFieldProps, "type">) {
  const generated = useId();
  const fieldId = id ?? generated;
  const [visible, setVisible] = useState(false);

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      help={help}
      className={className}
      required={required}
    >
      <div className="relative">
        <input
          id={fieldId}
          type={visible ? "text" : "password"}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, error, help)}
          required={required}
          className={`${controlBase} pr-14 ${borderFor(error)}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          className="tap absolute right-1 top-1/2 inline-flex -translate-y-1/2 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:text-accent"
        >
          {visible ? (
            <EyeSlash size={19} weight="regular" aria-hidden="true" />
          ) : (
            <Eye size={19} weight="regular" aria-hidden="true" />
          )}
        </button>
      </div>
    </FieldFrame>
  );
}

export type SelectFieldProps = BaseFieldProps &
  Omit<ComponentPropsWithoutRef<"select">, "className" | "id"> & { id?: string };

export function SelectField({
  label,
  error,
  help,
  className,
  id,
  required,
  children,
  ...props
}: SelectFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      help={help}
      className={className}
      required={required}
    >
      <select
        id={fieldId}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, help)}
        required={required}
        className={`${controlBase} ${borderFor(error)}`}
        {...props}
      >
        {children}
      </select>
    </FieldFrame>
  );
}

export type TextAreaFieldProps = BaseFieldProps &
  Omit<ComponentPropsWithoutRef<"textarea">, "className" | "id"> & { id?: string };

export function TextAreaField({
  label,
  error,
  help,
  className,
  id,
  required,
  rows = 4,
  ...props
}: TextAreaFieldProps) {
  const generated = useId();
  const fieldId = id ?? generated;

  return (
    <FieldFrame
      id={fieldId}
      label={label}
      error={error}
      help={help}
      className={className}
      required={required}
    >
      <textarea
        id={fieldId}
        rows={rows}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(fieldId, error, help)}
        required={required}
        className={`${controlBase} resize-y ${borderFor(error)}`}
        {...props}
      />
    </FieldFrame>
  );
}

/**
 * Moves focus to the first field that failed.
 *
 * Without this, submitting a long form with an error near the top scrolls
 * nobody anywhere: the errors render, the visitor is still looking at the
 * button, and the form appears to have done nothing at all.
 */
export function focusFirstError(errors: Record<string, string | undefined>) {
  const firstKey = Object.keys(errors).find((key) => errors[key]);
  if (!firstKey) return;
  const node = document.getElementById(firstKey);
  node?.focus();
  node?.scrollIntoView({ block: "center", behavior: "smooth" });
}
