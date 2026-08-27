"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { buttonStyles } from "@/components/button";
import { PasswordField, TextField, focusFirstError } from "@/components/ui/form";
import { Notice, Spinner } from "@/components/ui/feedback";
import { authErrorMessage } from "@/lib/auth/session";
import {
  homeForRole,
  leaveTo,
  readNextParam,
  ACCOUNT_PATH,
} from "@/lib/auth/redirect";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import { ACCOUNT } from "@/lib/content";
import { SupabaseOffline } from "@/components/auth/supabase-offline";

type Errors = { "login-email"?: string; "login-password"?: string };

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Errors>({});
  const [formError, setFormError] = useState("");
  const [busy, setBusy] = useState(false);

  /*
    Someone already signed in has no business looking at a login form: they
    arrived from a stale tab or a bookmark. Send them where they were going.
    `replace` so the back button does not bounce them straight back here.
  */
  useEffect(() => {
    const supabase = getSupabase();
    if (!supabase) return;
    let live = true;

    supabase.auth.getSession().then(async ({ data }) => {
      if (!live || !data.session) return;
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", data.session.user.id)
        .maybeSingle();
      if (!live) return;
      leaveTo(readNextParam() ?? homeForRole(profile?.role), true);
    });

    return () => {
      live = false;
    };
  }, []);

  if (!isSupabaseConfigured) return <SupabaseOffline />;

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError("");

    const found: Errors = {};
    if (!email.trim()) found["login-email"] = "Put in the email you booked with.";
    if (!password) found["login-password"] = "Your password is needed too.";

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error || !data.user) {
      setBusy(false);
      setFormError(authErrorMessage(error));
      return;
    }

    /*
      The destination depends on the role, so the role has to be read before
      leaving. This is a convenience, not a permission check: the /admin page
      re-reads it, and every query behind it is filtered by RLS regardless of
      which URL somebody types.
    */
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .maybeSingle();

    leaveTo(readNextParam() ?? homeForRole(profile?.role) ?? ACCOUNT_PATH, true);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <TextField
        id="login-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={errors["login-email"]}
        required
      />

      <div className="flex flex-col gap-2">
        <PasswordField
          id="login-password"
          label="Password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          error={errors["login-password"]}
          required
        />
        <a
          href="/forgot-password/"
          className="self-start text-sm text-muted underline decoration-line-strong underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
        >
          Forgot your password?
        </a>
      </div>

      {formError ? <Notice tone="error">{formError}</Notice> : null}

      <button
        type="submit"
        disabled={busy}
        className={`${buttonStyles.primary} mt-2 w-full`}
      >
        {busy ? (
          <>
            <Spinner size={17} />
            Signing in
          </>
        ) : (
          ACCOUNT.login.submit
        )}
      </button>
    </form>
  );
}
