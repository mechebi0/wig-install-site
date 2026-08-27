"use client";

import { useEffect, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { buttonStyles } from "@/components/button";
import { LoadingPanel, Notice } from "@/components/ui/feedback";
import { SupabaseOffline } from "@/components/auth/supabase-offline";
import { useSession } from "@/lib/auth/session";
import { leaveTo, loginUrlFor } from "@/lib/auth/redirect";
import type { Profile } from "@/lib/supabase/types";

/**
 * The gate in front of /account and /admin.
 *
 * ---------------------------------------------------------------------------
 * WHAT THIS IS ACTUALLY FOR, SAID PLAINLY
 * ---------------------------------------------------------------------------
 * Routing, not security.
 *
 * This is a static export. Every page is a file on a CDN, and anybody can
 * fetch /admin/index.html without asking anyone's permission, including this
 * component. There is no middleware to stop them, and there could not be: the
 * deployment has no server in it.
 *
 * What that HTML gets them is an empty dashboard. Every number, every
 * appointment and every customer on it arrives from a query the database
 * answers according to who is asking, and `is_admin()` says no. The admin page
 * for someone who is not Nat renders zeroes and empty lists, and the write
 * controls fail with a policy violation if they are clicked.
 *
 * So this component's job is to make that experience legible rather than to
 * make it safe. It is the difference between "you need to log in" and a screen
 * of empty tables. Deleting it would cost nothing in security and everything
 * in comprehensibility, which is the correct shape for client-side gating and
 * the opposite of the usual mistake.
 *
 * The usual mistake, for the avoidance of doubt, is a gate like this one in
 * front of an API that would have answered anyone. See the RLS policies in
 * supabase/migrations/0001 for the half that does the work.
 */
export type GuardedSession = { user: User; profile: Profile | null };

export function Guarded({
  requireAdmin = false,
  /** Where to come back to after logging in. Must be on the allowlist. */
  returnTo,
  /**
   * The h1 for the gate's own screens.
   *
   * These routes prerender to whatever this component renders BEFORE a session
   * exists, which is a spinner. Without a heading that HTML is a page with no
   * h1 at all: a screen reader landing on it has nothing to orient from, and
   * "skip to content" arrives somewhere unnamed. The dashboards supply their
   * own h1 once they mount, so this one only ever appears on the gate.
   */
  heading,
  children,
}: {
  requireAdmin?: boolean;
  returnTo: string;
  heading: string;
  children: (session: GuardedSession) => ReactNode;
}) {
  const { status, user, profile, isAdmin } = useSession();

  /*
    Bounce a signed-out visitor to the login form, carrying where they were
    going. `replace` so the back button does not land them here again and
    bounce them straight back, which is the classic redirect ping-pong.
  */
  useEffect(() => {
    if (status === "signed-out") leaveTo(loginUrlFor(returnTo), true);
  }, [status, returnTo]);

  if (status === "unconfigured") {
    return (
      <Shell heading={heading}>
        <SupabaseOffline />
      </Shell>
    );
  }

  if (status === "loading") {
    return (
      <Shell heading={heading}>
        <LoadingPanel label="Checking your account" />
      </Shell>
    );
  }

  if (status === "signed-out" || !user) {
    return (
      <Shell heading={heading}>
        <LoadingPanel label="Taking you to log in" />
      </Shell>
    );
  }

  /*
    Signed in, but not Nat. This is a dead end rather than a redirect: bouncing
    a legitimately signed-in customer to a login form they have already
    completed is confusing, and it teaches them nothing about what went wrong.
    The wording is neutral on purpose. It does not confirm that an admin
    dashboard exists, does not name who holds the role, and offers the way back
    to the place they should be.
  */
  if (requireAdmin && !isAdmin) {
    return (
      <Shell heading={heading}>
        <Notice tone="error" title="This page is not available on your account.">
          If you were looking for your appointments, they are in your account.
        </Notice>
        <div className="mt-7 flex flex-col gap-3 sm:flex-row">
          <a href="/account/" className={buttonStyles.primary}>
            Go to my account
          </a>
          <a href="/" className={buttonStyles.secondary}>
            Back to the site
          </a>
        </div>
      </Shell>
    );
  }

  return <>{children({ user, profile })}</>;
}

/** Centres the gate's own states inside the page's normal measure. */
function Shell({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto max-w-[46rem] px-5 py-24 sm:px-8 lg:py-32">
      <h1 className="font-display text-3xl leading-[1.08] tracking-tight text-ink md:text-4xl">
        {heading}
      </h1>
      <div className="mt-9">{children}</div>
    </div>
  );
}
