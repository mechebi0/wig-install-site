"use client";

import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { buttonStyles } from "@/components/button";
import { TextField, focusFirstError } from "@/components/ui/form";
import { LoadingPanel, Notice, Spinner } from "@/components/ui/feedback";
import { isOwnerEmail } from "@/lib/auth/owner";
import {
  describeLinkError,
  describeSendError,
  describeVerifyError,
} from "@/lib/auth/owner-errors";
import { signOut } from "@/lib/auth/session";
import { ADMIN_PATH, leaveTo, readNextParam } from "@/lib/auth/redirect";
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
 * database (the is_admin() function every owner policy uses) and only then
 * opens the studio dashboard. The address check before the code is sent is a
 * courtesy that stops this page being used to email codes to strangers; see
 * lib/auth/owner.ts. Anyone can skip it by calling Supabase directly, and
 * gets nothing for doing so: a code only signs them in to an account that has
 * no admin role.
 *
 * ---------------------------------------------------------------------------
 * WHAT IT SAYS WHEN SOMETHING GOES WRONG
 * ---------------------------------------------------------------------------
 * Every failure is mapped to a sentence in lib/auth/owner-errors.ts; nothing
 * Supabase returns is printed. Errors render in a role="alert" Notice, so a
 * screen reader announces them without the focus moving.
 *
 * "Code requested" is worded as a request, because that is all Supabase
 * confirms: it accepted the request, not that a mail provider delivered it.
 */

type Phase = "checking" | "email" | "code" | "finishing" | "no-access";

/**
 * Supabase's default gap between two code requests for one address. It is a
 * server rule, not this page's: a request inside it is refused with the
 * seconds still to wait, and describeSendError hands those back so the
 * countdown follows the server rather than this number.
 */
const RESEND_SECONDS = 60;

export function OwnerSignIn() {
  const [phase, setPhase] = useState<Phase>("checking");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [signedInAs, setSignedInAs] = useState("");
  const [errors, setErrors] = useState<{ "owner-email"?: string; "owner-code"?: string }>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  // True when the visitor was sent here from a page that needs a sign-in.
  const [continuing, setContinuing] = useState(false);

  /*
    `busy` is state, so it only becomes true on the NEXT render. Two quick
    Enter presses, or a double tap, can both run before that render lands and
    send two requests, and a second request inside Supabase's resend window is
    exactly what trips the rate limit. The ref is read and set synchronously,
    so only one request is ever in flight.
  */
  const inFlight = useRef(false);

  // Counts the resend button down. One timer, cleared on every tick.
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((left) => left - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  /*
    The code field appears in place of the email field, so without this the
    keyboard user is left on a button that no longer exists and a screen reader
    announces nothing. Focusing the field reads its label and help text, which
    is the announcement.
  */
  useEffect(() => {
    if (phase === "code") document.getElementById("owner-code")?.focus();
  }, [phase]);

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
      setFormError(
        "You are signed in, but the studio's account could not be checked. Check your connection and reload the page.",
      );
      setSignedInAs(user.email ?? "");
      setPhase("no-access");
      return;
    }
    if (isAdmin === true) {
      // Where she was going, or the studio dashboard, which links to the photo manager.
      const next = readNextParam();
      leaveTo(next && next.startsWith("/admin/") ? next : ADMIN_PATH, true);
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
    const urlErrorCode = hash.get("error_code") ?? query.get("error_code");
    const urlError =
      hash.get("error_description") ??
      query.get("error_description") ??
      hash.get("error") ??
      query.get("error");
    const arrivedWithCode = query.has("code");
    const sentHere = readNextParam() !== null;

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
      if (urlError) setFormError(describeLinkError(urlErrorCode, urlError));
      else if (arrivedWithCode) {
        setFormError(
          "That link only works in the browser the code was requested from. Type the 6-digit code from the email instead, or request a new one.",
        );
      }
      if (urlError || arrivedWithCode) {
        // Leave a clean address, so a reload does not repeat the message.
        window.history.replaceState(null, "", window.location.pathname);
      }
      setContinuing(sentHere && !urlError && !arrivedWithCode);
      setPhase("email");
    });

    return () => {
      live = false;
    };
  }, []);

  if (!isSupabaseConfigured) {
    return (
      <Notice tone="info" title="The studio dashboard is not connected yet.">
        It needs the site&rsquo;s Supabase project, which has not been set up on
        this deployment. The steps are in docs/photo-manager.md.
      </Notice>
    );
  }

  if (phase === "checking" || phase === "finishing") {
    return (
      <LoadingPanel
        label={phase === "checking" ? "One moment" : "Signed in. Opening your dashboard"}
      />
    );
  }

  const normalised = email.trim().toLowerCase();

  /** Asks Supabase to email a code. True once the request was accepted. */
  async function sendCode(): Promise<boolean> {
    const supabase = getSupabase();
    if (!supabase || inFlight.current) return false;
    inFlight.current = true;
    setBusy(true);
    setFormError("");
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email: normalised,
        options: {
          // The very first sign-in creates the account; promote_studio_owner()
          // is what later makes it the owner's.
          shouldCreateUser: true,
          emailRedirectTo: authRedirectTo("/admin/login/"),
        },
      });
      if (error) {
        const failure = describeSendError(error);
        setFormError(failure.message);
        if (failure.waitSeconds) setCooldown(failure.waitSeconds);
        return false;
      }
      setCooldown(RESEND_SECONDS);
      return true;
    } catch (thrown) {
      // supabase-js reports failures in `error`, but a thrown fetch error
      // must still end in a message and never in a form stuck on "Sending".
      setFormError(describeSendError(thrown as Error).message);
      return false;
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
  }

  async function onEmailSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    // Inside the cooldown a second request is refused by Supabase anyway, and
    // each refusal makes the wait feel longer. The button says how long is left.
    if (inFlight.current || cooldown > 0) return;
    const found: { "owner-email"?: string } = {};
    if (!normalised) found["owner-email"] = "Enter the studio owner's email address.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalised)) {
      found["owner-email"] = "That email address is missing something. Check it and try again.";
    } else if (!isOwnerEmail(normalised)) {
      found["owner-email"] = "This sign-in is only for the studio owner's email address.";
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
    if (inFlight.current) return;
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
    inFlight.current = true;
    setBusy(true);
    let user: User | null = null;
    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email: normalised,
        token,
        type: "email",
      });
      if (error || !data.session) setFormError(describeVerifyError(error).message);
      else user = data.session.user;
    } catch (thrown) {
      setFormError(describeVerifyError(thrown as Error).message);
    } finally {
      inFlight.current = false;
      setBusy(false);
    }
    if (user) await finish(user);
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
          <Notice tone="error" title="This account cannot manage the website.">
            You are signed in as {signedInAs || "another account"}. Only the
            studio owner&rsquo;s account can use the studio dashboard.
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
        <Notice tone="success" title="Code requested.">
          We asked for a sign-in code to be emailed to {normalised}. It usually
          arrives within a minute. Enter it below, or tap the link in the email
          if you are reading it on this device.
        </Notice>

        {/*
          enterKeyHint labels the phone keyboard's return key "Go". With the
          keyboard up on a short phone, the Sign in button below can be
          behind it, and the return key is then the button within reach.
        */}
        <TextField
          id="owner-code"
          label="6-digit code"
          inputMode="numeric"
          autoComplete="one-time-code"
          enterKeyHint="go"
          maxLength={10}
          value={code}
          onChange={(event) => setCode(event.target.value)}
          error={errors["owner-code"]}
          help="The code works once and expires after a short time. Nothing there? Check your spam folder."
          required
        />

        {formError ? <Notice tone="error">{formError}</Notice> : null}

        <button
          type="submit"
          aria-disabled={busy ? true : undefined}
          className={`${buttonStyles.primary} mt-1 w-full aria-disabled:pointer-events-none aria-disabled:opacity-55`}
        >
          {busy ? (
            <>
              <Spinner size={17} />
              Signing in
            </>
          ) : (
            "Sign in"
          )}
        </button>

        <div className="flex flex-col gap-1 text-sm">
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <button
              type="button"
              aria-disabled={busy || cooldown > 0 ? true : undefined}
              onClick={() => {
                if (!busy && cooldown === 0) void sendCode();
              }}
              className="inline-flex min-h-11 cursor-pointer items-center font-medium text-accent underline decoration-accent/30 underline-offset-4 transition-colors hover:decoration-accent aria-disabled:cursor-not-allowed aria-disabled:text-muted aria-disabled:no-underline"
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
          <p className="text-muted">
            Only ask for another code if the first has not arrived after a
            couple of minutes. A new code replaces the earlier one.
          </p>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={onEmailSubmit} noValidate className="flex flex-col gap-5">
      {continuing ? (
        <Notice tone="info">Sign in to continue to your dashboard.</Notice>
      ) : null}

      <TextField
        id="owner-email"
        label="Studio owner email"
        type="email"
        inputMode="email"
        autoComplete="email"
        enterKeyHint="send"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors["owner-email"]}
        required
      />

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      {/*
        `aria-disabled` for the request and for the cooldown, never `disabled`
        (and the same on the code form's button): a button that is focused when
        it becomes disabled drops keyboard focus to the page, and this one is
        focused the whole time, since it is what was pressed. The handlers
        ignore a submit while a request is in flight or the wait is running, so
        it is inert either way, and the user keeps their place.
      */}
      <button
        type="submit"
        aria-disabled={busy || cooldown > 0 ? true : undefined}
        className={`${buttonStyles.primary} mt-1 w-full aria-disabled:pointer-events-none aria-disabled:opacity-55`}
      >
        {busy ? (
          <>
            <Spinner size={17} />
            Requesting code
          </>
        ) : cooldown > 0 ? (
          `Try again in ${cooldown}s`
        ) : (
          "Email me a sign-in code"
        )}
      </button>
    </form>
  );
}
