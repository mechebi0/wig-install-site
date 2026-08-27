"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { buttonStyles } from "@/components/button";
import { TextField, focusFirstError } from "@/components/ui/form";
import { Notice, Spinner } from "@/components/ui/feedback";
import { SupabaseOffline } from "@/components/auth/supabase-offline";
import { authErrorMessage } from "@/lib/auth/session";
import { authRedirectTo, getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ACCOUNT } from "@/lib/content";

/**
 * "Send me a reset link."
 *
 * ---------------------------------------------------------------------------
 * WHY IT SAYS THE SAME THING WHETHER THE ACCOUNT EXISTS OR NOT
 * ---------------------------------------------------------------------------
 * The obvious, helpful behaviour is "no account with that email". It is also
 * an account enumeration oracle: anyone can feed a list of addresses through
 * this form and learn which of them belong to Nat's clients. For a wig studio
 * that list includes people having medical treatment, which is exactly the
 * category of fact that should not be leakable by a public form.
 *
 * So the response is identical either way, and the wording is careful to be
 * true in both cases: "if there is an account with that email". Supabase does
 * not distinguish them in its own response either, so this is the site
 * agreeing with the API rather than papering over it.
 *
 * Errors from Supabase are still surfaced, but only the ones that are not
 * about existence: rate limiting, and the network being down.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [errors, setErrors] = useState<{ "forgot-email"?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  if (!isSupabaseConfigured) return <SupabaseOffline />;

  if (sent) {
    return (
      <div className="flex flex-col gap-6">
        <Notice tone="success" title="On its way.">
          {ACCOUNT.forgot.sent}
        </Notice>
        <a href="/login/" className={buttonStyles.secondary}>
          Back to log in
        </a>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const found: { "forgot-email"?: string } = {};
    if (!email.trim()) {
      found["forgot-email"] = "Put in the email you booked with.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      found["forgot-email"] = "That email address is missing something.";
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

    const { error } = await supabase.auth.resetPasswordForEmail(
      email.trim().toLowerCase(),
      {
        /*
          Where the link in the email lands. Supabase refuses any redirect
          that is not on the project's Redirect URLs allowlist, which is what
          keeps this from being an open redirect. Every origin the site runs
          on has to be listed there; see supabase/README.md.
        */
        redirectTo: authRedirectTo("/reset-password/"),
      },
    );

    setBusy(false);

    // Rate limiting and network failures are worth showing. "No such user" is
    // not, and Supabase does not report it here anyway.
    if (error) {
      setFormError(authErrorMessage(error));
      return;
    }

    setSent(true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        id="forgot-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors["forgot-email"]}
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
            Sending
          </>
        ) : (
          ACCOUNT.forgot.submit
        )}
      </button>
    </form>
  );
}
