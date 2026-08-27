"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { buttonStyles } from "@/components/button";
import { PasswordField, TextField, focusFirstError } from "@/components/ui/form";
import { Notice, Spinner } from "@/components/ui/feedback";
import { SupabaseOffline } from "@/components/auth/supabase-offline";
import { authErrorMessage } from "@/lib/auth/session";
import { ACCOUNT_PATH, leaveTo, readNextParam } from "@/lib/auth/redirect";
import { getSupabase, isSupabaseConfigured, authRedirectTo } from "@/lib/supabase/client";
import { ACCOUNT } from "@/lib/content";

/**
 * Customer signup.
 *
 * ---------------------------------------------------------------------------
 * WHAT IS NOT ON THIS FORM
 * ---------------------------------------------------------------------------
 * A role. There is no field for it, no hidden input carrying it, and no option
 * in the metadata that influences it. That is worth stating because the
 * absence is the security property: `handle_new_user()` in the migration
 * writes the literal 'customer' and never reads raw_user_meta_data for a role,
 * so a hand-rolled request posting {"role":"admin"} to the signup endpoint
 * produces a customer like everyone else. Nat's account is promoted by a SQL
 * statement run by someone with database access, and there is no other path.
 *
 * The name and phone below DO travel through raw_user_meta_data, and that is
 * fine: the worst a forged value achieves is a wrong name on the customer's
 * own profile, which they can edit anyway.
 *
 * ---------------------------------------------------------------------------
 * THE TWO ENDINGS
 * ---------------------------------------------------------------------------
 * Supabase returns a session immediately when email confirmation is off, and
 * returns a user with no session when it is on. Both are handled, because
 * which one applies is a dashboard setting rather than something this code can
 * know. Confirmation ON is the recommended configuration and the one the
 * guest-booking claim in the migration depends on.
 */
const MIN_PASSWORD = 8;

type Errors = Partial<
  Record<"signup-name" | "signup-email" | "signup-phone" | "signup-password", string>
>;

export function SignupForm() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState("");

  if (!isSupabaseConfigured) return <SupabaseOffline />;

  if (sentTo) {
    return (
      <div className="flex flex-col gap-6">
        <Notice tone="success" title="One more step.">
          A confirmation link is on its way to <strong>{sentTo}</strong>. Click
          it and your account is live. It can take a minute or two, and it is
          worth a look in your spam folder if it does not appear.
        </Notice>
        <p className="text-sm leading-relaxed text-muted">
          Confirming also pulls in any appointment you have already booked as a
          guest with that address, so your history is there from day one.
        </p>
        <a href="/login/" className={buttonStyles.secondary}>
          Back to log in
        </a>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const found: Errors = {};
    if (!fullName.trim()) {
      found["signup-name"] = "Tell us what to call you.";
    }
    if (!email.trim()) {
      found["signup-email"] = "An email is how Nat confirms your slot.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      found["signup-email"] = "That email address is missing something.";
    }

    const digits = phone.replace(/\D/g, "");
    if (digits && (digits.length < 10 || digits.length > 15)) {
      found["signup-phone"] = "That looks off. Include the area code.";
    }

    if (password.length < MIN_PASSWORD) {
      found["signup-password"] = `At least ${MIN_PASSWORD} characters.`;
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }

    setBusy(true);
    const supabase = getSupabase();
    if (!supabase) {
      setBusy(false);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();

    const { data, error } = await supabase.auth.signUp({
      email: cleanEmail,
      password,
      options: {
        // Read by handle_new_user() for the profile's name and phone ONLY.
        data: {
          full_name: fullName.trim(),
          phone: phone.trim() || null,
        },
        emailRedirectTo: authRedirectTo("/account/"),
      },
    });

    setBusy(false);

    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }

    // Confirmation is on: no session yet, so tell them to go and click it.
    if (!data.session) {
      setSentTo(cleanEmail);
      return;
    }

    leaveTo(readNextParam() ?? ACCOUNT_PATH, true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        id="signup-name"
        label="Your name"
        autoComplete="name"
        value={fullName}
        onChange={(event) => setFullName(event.target.value)}
        error={errors["signup-name"]}
        required
      />

      <TextField
        id="signup-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors["signup-email"]}
        required
      />

      <TextField
        id="signup-phone"
        label="Mobile number"
        type="tel"
        inputMode="tel"
        autoComplete="tel"
        value={phone}
        onChange={(event) => setPhone(event.target.value)}
        error={errors["signup-phone"]}
        help="Optional, but it is how Nat confirms your slot."
      />

      <PasswordField
        id="signup-password"
        label="Password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors["signup-password"]}
        help={`${MIN_PASSWORD} characters or more.`}
        required
      />

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <button
        type="submit"
        disabled={busy}
        className={`${buttonStyles.primary} mt-2 w-full`}
      >
        {busy ? (
          <>
            <Spinner size={17} />
            Making your account
          </>
        ) : (
          ACCOUNT.signup.submit
        )}
      </button>

      <p className="text-sm leading-relaxed text-muted">
        You never need an account to book. If you would rather not have one,{" "}
        <a
          href="/book/"
          className="text-accent underline decoration-accent/30 underline-offset-4 hover:decoration-accent"
        >
          book as a guest instead
        </a>
        .
      </p>
    </form>
  );
}
