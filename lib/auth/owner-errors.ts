/**
 * What the owner's sign-in says when Supabase says no.
 *
 * ---------------------------------------------------------------------------
 * WHY THIS IS A LOOKUP AND NEVER A PASSTHROUGH
 * ---------------------------------------------------------------------------
 * `error.message` is written for developers. It can name internals ("Error
 * sending magic link email", "email rate limit exceeded") and a future GoTrue
 * release is free to reword it. Nothing from it reaches the screen: every
 * branch below returns a sentence written here, so a raw database error, a
 * token or a stack trace has no path to the page.
 *
 * Classification goes by `error.code` first. GoTrue has returned stable
 * machine codes since v2.80 (`over_email_send_rate_limit`, `otp_expired`,
 * `unexpected_failure`, ...), and `status` is the next most reliable thing. The
 * message text is only a fallback for the cases that predate a code, such as
 * the browser's own "Failed to fetch".
 *
 * ---------------------------------------------------------------------------
 * WHAT A SUCCESSFUL REQUEST DOES NOT PROVE
 * ---------------------------------------------------------------------------
 * signInWithOtp resolves when Supabase has ACCEPTED the request. It does not
 * mean the mail provider delivered anything, and nothing here says it did.
 *
 * The input type is structural rather than AuthError so the mapping carries no
 * dependency on the Supabase client and can be tested with plain objects
 * (tests/owner-errors.test.mjs).
 */

export type OwnerAuthFailure = {
  message?: string;
  code?: string;
  status?: number;
  name?: string;
} | null | undefined;

export type OwnerAuthMessage = {
  message: string;
  /**
   * Set when Supabase said exactly how long to wait. The page uses it to run
   * the resend countdown, so it counts what the server asked for instead of a
   * number assumed here.
   */
  waitSeconds?: number;
};

const RATE_LIMIT_CODES = new Set([
  "over_email_send_rate_limit",
  "over_request_rate_limit",
  "over_sms_send_rate_limit",
]);

function textOf(failure: OwnerAuthFailure) {
  return `${failure?.message ?? ""} ${failure?.code ?? ""}`.toLowerCase();
}

function isRateLimited(failure: OwnerAuthFailure) {
  return (
    failure?.status === 429 ||
    RATE_LIMIT_CODES.has(failure?.code ?? "") ||
    /rate limit|too many requests|only request this after/.test(textOf(failure))
  );
}

/**
 * The request never reached Supabase: offline, DNS, a blocked fetch.
 *
 * supabase-js wraps EVERY 5xx answer in an AuthRetryableFetchError too, with
 * the real HTTP status and the error code dropped (checked against 2.112: a
 * 500 "Error sending magic link email" arrives as that class with status 500
 * and no `code`). So the class alone does not mean "offline". Only a retryable
 * error with no HTTP status, or the browser's own fetch failure, does; a
 * status of 500 or more is Supabase answering with trouble, and goes to
 * isServiceTrouble instead.
 */
function isUnreachable(failure: OwnerAuthFailure) {
  const answered = typeof failure?.status === "number" && failure.status >= 100;
  return (
    (failure?.name === "AuthRetryableFetchError" && !answered) ||
    failure?.status === 0 ||
    /failed to fetch|load failed|networkerror|network request failed|fetch failed/.test(
      textOf(failure),
    )
  );
}

/** Supabase or its mail provider failed on their side. Usually passes. */
function isServiceTrouble(failure: OwnerAuthFailure) {
  return (
    (failure?.status !== undefined && failure.status >= 500) ||
    failure?.code === "unexpected_failure" ||
    /error sending|sending magic link|sending confirmation|smtp/.test(textOf(failure))
  );
}

/**
 * "For security purposes, you can only request this after 42 seconds."
 *
 * GoTrue rounds down, so a request a hair too early says "after 0 seconds".
 * That is still a per-address cooldown, one second from over, and it must not
 * fall through to the hourly-quota wording, which would tell the owner to wait
 * far longer than she has to (seen against a real GoTrue in
 * supabase/tests/owner-only.mjs).
 */
function secondsToWait(failure: OwnerAuthFailure): number | undefined {
  const match = /after (\d{1,4}) seconds?/.exec(failure?.message ?? "");
  if (!match) return undefined;
  return Math.max(1, Number(match[1]));
}

const UNREACHABLE =
  "Could not reach the sign-in service. Check your internet connection, then try again.";

/** Asking for a code failed. */
export function describeSendError(failure: OwnerAuthFailure): OwnerAuthMessage {
  const text = textOf(failure);

  if (isUnreachable(failure)) return { message: UNREACHABLE };

  if (isRateLimited(failure)) {
    const waitSeconds = secondsToWait(failure);
    if (waitSeconds) {
      return {
        waitSeconds,
        message: `A code was requested a moment ago. Wait ${waitSeconds} seconds before asking for another. If the first email has arrived, use its code: it is still valid.`,
      };
    }
    return {
      message:
        "Too many sign-in codes have been requested recently, so a new one cannot be sent right now. Wait a while before trying again (up to an hour), or use the code from the most recent email if you have one. Asking again sooner will not help and can extend the wait.",
    };
  }

  if (failure?.code === "email_address_not_authorized" || text.includes("not authorized")) {
    return {
      message:
        "Email sending has not been fully set up for this address yet. The site's developer needs to finish the email setup in Supabase (docs/photo-manager.md, “Email delivery”).",
    };
  }

  if (
    failure?.code === "signup_disabled" ||
    failure?.code === "otp_disabled" ||
    text.includes("signups not allowed")
  ) {
    return {
      message:
        "New sign-ins are switched off in Supabase, so this account cannot be created. The site's developer can switch them on (docs/photo-manager.md).",
    };
  }

  if (
    failure?.code === "email_address_invalid" ||
    (failure?.code === "validation_failed" && text.includes("email")) ||
    (text.includes("invalid") && text.includes("email"))
  ) {
    return { message: "That email address does not look right. Check it and try again." };
  }

  if (isServiceTrouble(failure)) {
    return {
      message:
        "The sign-in email could not be sent just now. This is usually temporary: wait a few minutes before trying again. If it keeps happening, the email settings in Supabase need a look.",
    };
  }

  return {
    message: "The code could not be requested. Wait a minute, then try once more.",
  };
}

/** Typing the code in failed. `failure` is null when Supabase returned no session. */
export function describeVerifyError(failure: OwnerAuthFailure): OwnerAuthMessage {
  if (isUnreachable(failure)) return { message: UNREACHABLE };

  if (isRateLimited(failure)) {
    return {
      message:
        "Too many attempts just now. Wait a few minutes before trying again. A new code is not needed: the one in your latest email stays valid.",
    };
  }

  if (isServiceTrouble(failure)) {
    return {
      message:
        "The sign-in service had a problem just now. Wait a minute and enter the code again.",
    };
  }

  // GoTrue answers a wrong code and an expired one identically
  // (`otp_expired`, "Token has expired or is invalid"), on purpose, so this
  // cannot say which it was.
  return {
    message:
      "That code did not work. It may be mistyped, may have expired, or may have been replaced by a newer one. Check the latest email, or request a new code.",
  };
}

/**
 * A sign-in LINK failed. Supabase sends the browser back with the reason in the
 * URL (`error_code=otp_expired&error_description=...`), not as a thrown error.
 */
export function describeLinkError(code: string | null, description: string | null): string {
  const expired = code === "otp_expired" || /expired|invalid|already/i.test(description ?? "");
  return expired
    ? "That sign-in link has expired or was already used. Request a new code below."
    : "That sign-in link could not be used. Request a new code below.";
}
