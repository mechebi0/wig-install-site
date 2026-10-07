"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { buttonStyles } from "@/components/button";
import { TextField, focusFirstError } from "@/components/ui/form";
import { LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { isOwnerEmail } from "@/lib/auth/owner";
import { signOut } from "@/lib/auth/session";
import { ADMIN_PHOTOS_PATH, leaveTo, readNextParam } from "@/lib/auth/redirect";
import { authRedirectTo, getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";

/**
 * The owner's sign-in: an emailed code, no password.
 *
 * ---------------------------------------------------------------------------
 * WHY A CODE RATHER THAN ONLY A LINK
 * ---------------------------------------------------------------------------
 * The Supabase client signs in with PKCE (lib/supabase/client.ts), so a
 * magic link only completes in the browser that asked for it: that browser
 * holds the other half of the exchange. On a phone, tapping a link in the
 * Gmail app usually opens it in Gmail's own browser, which holds nothing, and
 * the link silently does not sign anyone in. A six-digit code typed into
 * this page works whichever app the email was read in, so the page always
 * offers one. The link still works when it is opened in the same browser.
 *
 * The code only arrives if the Supabase email templates include it; the
 * branded templates in supabase/templates/ do, and docs/photo-manager.md
 * says where they go.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS PAGE DOES NOT DECIDE
 * ---------------------------------------------------------------------------
 * Whether the person signing in is the owner. After sign-in it asks the
 * database (the is_admin() function every photo policy uses) and only then
 * opens the photo manager. The address check before the code is sent is a
 * courtesy that stops this page being used to email codes to strangers; see
 * lib/auth/owner.ts.
 */

type Phase = "checking" | "email" | "code" | "finishing" | "no-access";

const RESEND_SECONDS = 60;

function sendErrorMessage(error: AuthError): string {
  const raw = `${error.message} ${error.code ?? ""}`.toLowerCase();
  // Supabase's built-in mailer only delivers to members of the project's
  // team until a real email provider is connected.
  if (raw.includes("not authorized") || raw.includes("email_address_not_authorized")) {
    return "Supabase is not allowed to email this address yet. Your developer needs to finish the email setup (docs/photo-manager.md, “Email delivery”).";
  }
  if (raw.includes("rate limit") || raw.includes("only request this after") || error.status === 429) {
    return "Too many codes have been sent just now. Wait a few minutes, or use the code from the last email: it still works for an hour.";
  }
  if (raw.includes("signups not allowed") || raw.includes("otp_disabled")) {
    return "New sign-ins are switched off in Supabase, so the owner account cannot be created. Your developer can switch them on (docs/photo-manager.md).";
  }
  if (raw.includes("invalid") && raw.includes("email")) {
    return "That email address does not look right.";
  }
  if (raw.includes("failed to fetch") || raw.includes("load failed") || raw.includes("network")) {
    return "Could not reach the sign-in service. Check your connection and try again.";
  }
  return "The code could not be sent. Try again in a minute.";
}

function verifyErrorMessage(error: AuthError | null): string {
  const raw = `${error?.message ?? ""} ${error?.code ?? ""}`.toLowerCase();
  if (raw.includes("rate limit") || error?.status === 429) {
    return "Too many tries just now. Wait a few minutes, then try again.";
  }
  if (raw.includes("failed to fetch") || raw.includes("load failed") || raw.includes("network")) {
    return "Could not reach the sign-in service. Check your connection and try again.";
  }
  return "That code did not work. It may have expired or already been used: check the newest email, or send a new code.";
}

/** Supabase sends a failed link back with the reason in the URL. */
function linkErrorMessage(raw: string): string {
  return /expired|invalid/i.test(raw)
    ? "That sign-in link has expired or was already used. Send a new code below."
    : "That sign-in link could not be used. Send a new code below.";
}

export function OwnerSignIn() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signedInAs, setSignedInAs] = useState("");
  const [errors, setErrors] = useState<{ "owner-email"?: string; "owner-code"?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  // Counts the resend button down. One timer, cleared on every tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  /*
    Signed in: ask the database, then leave. `replace`, so Back from the photo
    manager does not return to a sign-in form that has already been used.
  */
  async function finish(user: User) {
    const supabase = getSupabase();
    if (!supabase) return;
    setPhase("finishing");
    const { data: isAdmin, error } = await supabase.rpc("is_admin");
    if (error) {
      setFormError("Signed in, but the studio's account could not be checked. Check your connection and reload.");
      setSignedInAs(user.email ?? "");
      setPhase("no-access");
      return;
    }
    if (isAdmin === true) {
      const next = readNextParam();
      leaveTo(next && next.startsWith("/admin/") ? next : ADMIN_PHOTOS_PATH, true);
      return;
    }
    /*
      A session saved in this browser can outlive the sign-in it came from:
      promoting the owner ends every earlier sign-in, and so does "Log out"
      elsewhere. Ask the auth server before calling it "no access", so a
      stale one is cleared and the owner is simply asked to sign in again.
    */
    const { error: userError } = await supabase.auth.getUser();
    if (userError) {
      await supabase.auth.signOut({ scope: "local" });
      setFormError("Your earlier sign-in has ended. Sign in again below.");
      setPhase("email");
      return;
    }
    setSignedInAs(user.email ?? "");
    setPhase("no-access");
  }

  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let live = true;

    const query = new URLSearchParams(window.location.search);
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const urlError =
      hash.get("error_description") ??
      query.get("error_description") ??
      hash.get("error") ??
      query.get("error");
    const arrivedWithCode = query.has("code");

    /*
      getSession() waits for the client's own start-up, which includes
      finishing a magic link opened in this browser. The verdict is delivered
      from inside this callback rather than the effect body, so the first
      render is never a cascade.
    */
    supabase.auth.getSession().then(({ data }) => {
      if (!live) return;
      if (data.session) {
        void finish(data.session.user);
        return;
      }
      if (urlError) setFormError(linkErrorMessage(urlError));
      else if (arrivedWithCode) {
        setFormError(
          "That link only works in the browser the code was requested from. Type the 6-digit code from the email instead, or send a new one.",
        );
      }
      if (urlError || arrivedWithCode) {
        // Leave a clean address, so a reload does not repeat the message.
        window.history.replaceState(null, "", window.location.pathname);
      }
      setPhase("email");
    });

    return () => {
      live = false;
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Notice tone="info" title="The photo manager is not connected yet.">
        It needs the site&rsquo;s Supabase project, which has not been set up on
        this deployment. The steps are in docs/photo-manager.md.
      </Notice>
    );
  }

  if (phase === "checking" || phase === "finishing") {
    return <LoadingPanel label={phase === "checking" ? "One moment" : "Opening the photo manager"} />;
  }

  const normalised = email.trim().toLowerCase();

  async function sendCode() {
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    setFormError("");
    const { error } = await supabase.auth.signInWithOtp({
      email: normalised,
      options: {
        // The very first sign-in creates the account; promote_studio_owner()
        // is what later makes it the owner's.
        shouldCreateUser: true,
        emailRedirectTo: authRedirectTo("/admin/login/"),
      },
    });
    setBusy(false);
    if (error) {
      setFormError(sendErrorMessage(error));
      return false;
    }
    setCooldown(RESEND_SECONDS);
    return true;
  }

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const found: { "owner-email"?: string } = {};
    if (!normalised) found["owner-email"] = "Put in the studio's email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalised)) {
      found["owner-email"] = "That email address is missing something.";
    } else if (!isOwnerEmail(normalised)) {
      found["owner-email"] =
        "This sign-in is only for the studio owner's email address. Customers sign in at /login/.";
    }
    setErrors(found);
    if (found["owner-email"]) {
      focusFirstError(found);
      return;
    }
    if (await sendCode()) {
      setCode("");
      setPhase("code");
    }
  }

  async function onCodeSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = code.replace(/\s+/g, "");
    if (!/^\d{6,10}$/.test(token)) {
      const found = { "owner-code": "Enter the 6-digit code from the email." };
      setErrors(found);
      focusFirstError(found);
      return;
    }
    setErrors({});
    setFormError("");
    const supabase = getSupabase();
    if (!supabase) return;
    setBusy(true);
    const { data, error } = await supabase.auth.verifyOtp({
      email: normalised,
      token,
      type: "email",
    });
    if (error || !data.session) {
      setBusy(false);
      setFormError(verifyErrorMessage(error));
      return;
    }
    setBusy(false);
    await finish(data.session.user);
  }

  if (phase === "no-access") {
    const owner = isOwnerEmail(signedInAs);
    return (
      <div className="flex flex-col gap-6">
        {formError ? (
          <Notice tone="error">{formError}</Notice>
        ) : owner ? (
          <Notice tone="info" title="Owner access is not switched on yet.">
            You are signed in as {signedInAs}, but one setup step is still to
            be done in Supabase. Your developer runs it once
            (docs/photo-manager.md, &ldquo;Make Nat the owner&rdquo;); then sign
            in again here.
          </Notice>
        ) : (
          <Notice tone="error" title="This account cannot manage photos.">
            You are signed in as {signedInAs || "another account"}. Only the
            studio owner&rsquo;s account can use the photo manager.
          </Notice>
        )}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => {
              void signOut().then(() => {
                setSignedInAs("");
                setFormError("");
                setPhase("email");
              });
            }}
            className={buttonStyles.primary}
          >
            Sign out
          </button>
          <a href="/" className={buttonStyles.secondary}>
            Back to the site
          </a>
        </div>
      </div>
    );
  }

  if (phase === "code") {
    return (
      <form onSubmit={onCodeSubmit} noValidate className="flex flex-col gap-5">
        <Notice tone="success" title="Check your email.">
          A sign-in code is on its way to {normalised}. Type it below, or tap
          the link in the email if you are reading it on this device.
        </Notice>

        <TextField
          id="owner-code"
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={10}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={errors["owner-code"]}
          help="The code works once and expires after an hour."
          required
        />

        {formError ? <Notice tone="error">{formError}</Notice> : null}

        <button type="submit" disabled={busy} className={`${buttonStyles.primary} mt-2 w-full`}>
          {busy ? (
            <>
              <Spinner size={17} />
              Signing in
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
          <button
            type="button"
            disabled={busy || cooldown > 0}
            onClick={() => void sendCode()}
            className="inline-flex min-h-11 cursor-pointer items-center font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent disabled:cursor-not-allowed disabled:text-muted disabled:no-underline"
          >
            {cooldown > 0 ? `Send a new code in ${cooldown}s` : "Send a new code"}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              setFormError("");
              setErrors({});
              setPhase("email");
            }}
            className="inline-flex min-h-11 cursor-pointer items-center text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            Use a different email
          </button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onEmailSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        id="owner-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors["owner-email"]}
        required
      />

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <button type="submit" disabled={busy} className={`${buttonStyles.primary} mt-2 w-full`}>
        {busy ? (
          <>
            <Spinner size={17} />
            Sending
          </>
        ) : (
          "Email me a code"
        )}
      </button>
    </form>
  );
}
