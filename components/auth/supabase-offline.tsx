"use client";

import { buttonStyles } from "@/components/button";
import { Notice } from "@/components/ui/feedback";
import { REACH, STUDIO } from "@/lib/content";

/**
 * What every account screen shows when no Supabase project is wired up.
 *
 * This is not an error page and it is not a placeholder. It is the honest
 * state of a site whose booking database has not been connected yet, and it
 * exists so that state is never mistaken for a broken one.
 *
 * The rules it follows:
 *   - it does NOT pretend to work. No fake form, no "success" that goes
 *     nowhere, no login that accepts anything
 *   - it does NOT show the visitor a stack trace or the name of an
 *     environment variable. That is the developer's problem, and it is written
 *     up in supabase/README.md where a developer will look
 *   - it DOES give the visitor a way to reach Nat, because a customer who
 *     arrived here still wants an appointment
 *
 * See the long note in lib/supabase/client.ts for why a missing configuration
 * is a first-class state rather than a crash.
 */
export function SupabaseOffline() {
  return (
    <div className="flex flex-col gap-6">
      <Notice tone="info" title="Accounts are not open yet.">
        Online booking and accounts are being set up. Nat is still taking
        appointments the usual way in the meantime.
      </Notice>

      <div className="flex flex-col gap-3 sm:flex-row">
        <a href={REACH.href} className={buttonStyles.primary}>
          {STUDIO.phone ? "Call the studio" : "Email the studio"}
        </a>
        <a href="/book/" className={buttonStyles.secondary}>
          Send a request
        </a>
      </div>
    </div>
  );
}
