"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { buttonStyles } from "@/components/button";
import { PasswordField, focusFirstError } from "@/components/ui/form";
import { LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { SupabaseOffline } from "@/components/auth/supabase-offline";
import { authErrorMessage } from "@/lib/auth/session";
import { ACCOUNT_PATH, leaveTo } from "@/lib/auth/redirect";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ACCOUNT } from "@/lib/content";

/**
 * The screen behind the link in a password reset email.
 *
 * ---------------------------------------------------------------------------
 * HOW THE LINK BECOMES A SESSION
 * ---------------------------------------------------------------------------
 * Nothing in this component parses the URL. `detectSessionInUrl` is on in
 * lib/supabase/client.ts, so the moment the client is constructed it takes the
 * credential out of the address, exchanges it (PKCE, so what is in the URL is
 * a one-time code rather than a token), establishes the session and strips the
 * address bar clean. Hand-rolling that is how people end up leaving an access
 * token in the URL, in the history, and in the referrer of the next request.
 *
 * What this component does is WAIT for that to finish and then decide which of
 * three screens to show:
 *
 *   checking   the exchange is in flight
 *   ready      there is a session; show the new-password form
 *   invalid    no session arrived, or the URL carried an explicit error
 *
 * ---------------------------------------------------------------------------
 * THE TIMEOUT
 * ---------------------------------------------------------------------------
 * getSession() resolves once initialisation is done, which normally includes
 * the code exchange. The listener and the four second timeout are the belt to
 * that braces: an expired link can resolve to "no session" through a path that
 * fires no event at all, and without a deadline this screen would sit on a
 * spinner forever rather than telling the visitor their link has expired. A
 * dead end that explains itself is worth four seconds.
 */
const SETTLE_MS = 4000;
const MIN_PASSWORD = 8;

type Phase = "checking" | "ready" | "invalid";

export function ResetPasswordForm() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [linkError, setLinkError] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ "reset-password"?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;

    let live = true;

    /*
      Supabase reports a dead link by redirecting back with the reason in the
      URL rather than by throwing, and it uses the hash for the implicit flow
      and the query string for PKCE. Both are read so the visitor is told "that
      link has expired" instead of the generic "something went wrong".
    */
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const query = new URLSearchParams(window.location.search);
    const urlError =
      hash.get("error_description") ??
      query.get("error_description") ??
      hash.get("error") ??
      query.get("error");

    const linkMessage = urlError
      ? /expired|invalid/i.test(urlError)
        ? "That link has expired. Reset links are good for one hour. Ask for a fresh one and it will arrive in a moment."
        : "That link could not be used. Ask for a fresh one and it will arrive in a moment."
      : "";

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live && session && !urlError) setPhase("ready");
    });

    /*
      The verdict is delivered from inside this promise callback even when the
      URL already told us the answer. Two reasons: a synchronous setState in an
      effect body is a cascading render, and waiting for getSession() to settle
      means the client has finished its own initialisation before this screen
      declares anything, so a slow PKCE exchange is never mistaken for a dead
      link.
    */
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (urlError) {
        setLinkError(linkMessage);
        setPhase("invalid");
        return;
      }
      if (data.session) setPhase("ready");
    });

    const timer = window.setTimeout(() => {
      if (!live) return;
      setPhase((current) => (current === "checking" ? "invalid" : current));
    }, SETTLE_MS);

    return () => {
      live = false;
      window.clearTimeout(timer);
      sub.subscription.unsubscribe();
    };
  }, []);

  if (!isSupabaseConfigured) return <SupabaseOffline />;

  if (phase === "checking") {
    return <LoadingPanel label="Checking your link" />;
  }

  if (phase === "invalid") {
    return (
      <div className="flex flex-col gap-6">
        <Notice tone="error" title="This link will not open.">
          {linkError ||
            "Reset links are good for one hour and can only be used once. Ask for a fresh one and it will arrive in a moment."}
        </Notice>
        <a href="/forgot-password/" className={buttonStyles.primary}>
          Send me a new link
        </a>
      </div>
    );
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const found: { "reset-password"?: string } = {};
    if (password.length < MIN_PASSWORD) {
      found["reset-password"] = `At least ${MIN_PASSWORD} characters.`;
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

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setBusy(false);
      setFormError(authErrorMessage(error));
      return;
    }

    // The recovery session is a real session, so they are already signed in.
    leaveTo(ACCOUNT_PATH, true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <PasswordField
        id="reset-password"
        label="New password"
        autoComplete="new-password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        error={errors["reset-password"]}
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
            Saving
          </>
        ) : (
          ACCOUNT.reset.submit
        )}
      </button>
    </form>
  );
}
