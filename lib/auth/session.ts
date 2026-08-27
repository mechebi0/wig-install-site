"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AuthError, User } from "@supabase/supabase-js";
import { getSupabase, isSupabaseConfigured } from "@/lib/supabase/client";
import type { Profile } from "@/lib/supabase/types";

/**
 * The session, the profile and the role, resolved once and shared by every
 * gated screen.
 *
 * WHAT THIS IS AND IS NOT FOR
 * This hook decides what to RENDER. It does not decide what a user is allowed
 * to DO. `isAdmin` here exists so the admin dashboard can show a dashboard
 * instead of a login form, not so that hiding it keeps anyone out: the profile
 * row it reads is itself only readable because of a row level security policy,
 * and every write the dashboard makes is checked again by another one. If this
 * hook were bypassed entirely with devtools, the attacker would arrive at an
 * admin layout populated with nothing, because the queries behind it would all
 * come back empty. That is the property that makes client-side gating
 * acceptable on a static site, and it is worth stating plainly because
 * client-side gating WITHOUT that property is the single most common way a
 * project like this ends up wide open.
 */
export type SessionStatus =
  | "loading"
  /** No Supabase project wired up. Not an error; see lib/supabase/client.ts. */
  | "unconfigured"
  | "signed-out"
  | "signed-in";

export type SessionState = {
  status: SessionStatus;
  user: User | null;
  profile: Profile | null;
  isAdmin: boolean;
  /** Re-reads the profile row, after the customer edits their own details. */
  refreshProfile: () => Promise<void>;
};

export function useSession(): SessionState {
  const supabase = useMemo(() => getSupabase(), []);
  const [status, setStatus] = useState<SessionStatus>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const loadProfile = useCallback(
    async (id: string) => {
      if (!supabase) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      return (data as Profile | null) ?? null;
    },
    [supabase],
  );

  useEffect(() => {
    if (!supabase) return;

    /*
      React 18 StrictMode mounts effects twice in development, and an auth
      round trip that resolves after unmount would otherwise call setState on a
      dead component. This flag is the cheap version of an AbortController for
      a promise chain that cannot actually be aborted.
    */
    let live = true;

    const apply = async (nextUser: User | null) => {
      if (!live) return;
      setUser(nextUser);

      if (!nextUser) {
        setProfile(null);
        setStatus("signed-out");
        return;
      }

      const found = await loadProfile(nextUser.id);
      if (!live) return;
      setProfile(found);
      setStatus("signed-in");
    };

    supabase.auth.getSession().then(({ data }) => {
      void apply(data.session?.user ?? null);
    });

    /*
      Covers three things a one-shot read cannot: signing in or out in another
      tab, the token refreshing on a long-lived page, and the PASSWORD_RECOVERY
      event that fires when someone arrives from a reset email.
    */
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      void apply(session?.user ?? null);
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return;
    const found = await loadProfile(user.id);
    setProfile(found);
  }, [user, loadProfile]);

  return {
    status,
    user,
    profile,
    isAdmin: profile?.role === "admin",
    refreshProfile,
  };
}

/** Ends the session in this tab and every other one on this origin. */
export async function signOut(): Promise<void> {
  const supabase = getSupabase();
  if (!supabase) return;
  await supabase.auth.signOut();
}

/**
 * Turns a Supabase auth error into something a person would say.
 *
 * The rule this follows, and the reason it is a lookup rather than a
 * passthrough: a sign-in failure must never reveal whether the ACCOUNT exists.
 * "No account with that email" and "wrong password" together are an account
 * enumeration oracle, so both arrive here as the same sentence. Supabase's own
 * "Invalid login credentials" is already careful about this; the mapping keeps
 * it that way while making it sound like the rest of the site.
 */
export function authErrorMessage(error: AuthError | Error | null): string {
  if (!error) return "";
  const raw = error.message.toLowerCase();

  if (raw.includes("invalid login credentials")) {
    return "That email and password do not match. Try again, or reset your password.";
  }
  if (raw.includes("email not confirmed")) {
    return "Confirm your email address first. Check your inbox for the link from Crown by Nat.";
  }
  if (raw.includes("user already registered") || raw.includes("already been registered")) {
    return "There is already an account with that email. Log in instead, or reset the password.";
  }
  if (raw.includes("password should be at least")) {
    return "Passwords need to be at least 8 characters.";
  }
  if (raw.includes("weak password") || raw.includes("password is too weak")) {
    return "Pick a stronger password. Longer is better than complicated.";
  }
  if (raw.includes("rate limit") || raw.includes("too many requests")) {
    return "Too many attempts just now. Wait a minute and try once more.";
  }
  if (raw.includes("same password")) {
    return "That is the password you already have. Pick a different one.";
  }
  if (raw.includes("expired") || raw.includes("invalid") || raw.includes("token")) {
    return "That link has expired. Request a new one and it will arrive in a moment.";
  }
  if (raw.includes("failed to fetch") || raw.includes("network")) {
    return "Could not reach the studio's booking system. Check your connection and try again.";
  }

  return "Something went wrong. Try again, or call the studio.";
}

/**
 * Signed in or not, and nothing else.
 *
 * The site navigation renders on every page and needs exactly one bit of
 * information: whether to say "Log in" or "Account". useSession() would also
 * fetch the profile row, which the nav has no use for, on every page load. At
 * one extra query per navigation that is not a crisis, but it is a query that
 * buys nothing, and the nav is the one component guaranteed to be mounted.
 *
 * Returns "unconfigured" when there is no Supabase project, which the nav uses
 * to leave the account control out entirely rather than showing a login link
 * that leads to a page explaining there are no logins.
 */
export type AuthState = "loading" | "unconfigured" | "signed-out" | "signed-in";

export function useAuthState(): AuthState {
  const supabase = useMemo(() => getSupabase(), []);
  const [state, setState] = useState<AuthState>(
    isSupabaseConfigured ? "loading" : "unconfigured",
  );

  useEffect(() => {
    if (!supabase) return;
    let live = true;

    supabase.auth.getSession().then(({ data }) => {
      if (live) setState(data.session ? "signed-in" : "signed-out");
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (live) setState(session ? "signed-in" : "signed-out");
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [supabase]);

  return state;
}
