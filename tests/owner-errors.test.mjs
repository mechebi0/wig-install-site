// Run with: npm test
//
// The owner's sign-in turns Supabase errors into sentences. These tests feed it
// the real error classes supabase-js throws (AuthApiError, AuthRetryableFetchError),
// shaped the way GoTrue answers, and check three things for every case:
//   1. it picks the right branch,
//   2. nothing Supabase wrote (message text, codes, status) reaches the output,
//   3. the wait it reports is the one the server asked for.
import assert from "node:assert/strict";
import test from "node:test";
import { AuthApiError, AuthRetryableFetchError } from "@supabase/supabase-js";
import {
  describeLinkError,
  describeSendError,
  describeVerifyError,
} from "../lib/auth/owner-errors.ts";
import { isOwnerEmail, OWNER_EMAIL } from "../lib/auth/owner.ts";

const api = (message, status, code) => new AuthApiError(message, status, code);

/** Text a developer would recognise from Supabase, none of which may be shown. */
const LEAKS = [
  /over_email_send_rate_limit/i,
  /over_request_rate_limit/i,
  /unexpected_failure/i,
  /otp_expired/i,
  /for security purposes/i,
  /email rate limit exceeded/i,
  /error sending magic link/i,
  /token has expired or is invalid/i,
  /\bGoTrue\b/i,
  /\b(429|500|502|503)\b/,
];

function assertClean(text) {
  for (const pattern of LEAKS) {
    assert.doesNotMatch(text, pattern, `output leaked ${pattern}: ${text}`);
  }
}

test("a per-address cooldown reports the seconds Supabase asked for", () => {
  const result = describeSendError(
    api("For security purposes, you can only request this after 42 seconds.", 429, "over_email_send_rate_limit"),
  );
  assert.equal(result.waitSeconds, 42);
  assert.match(result.message, /42 seconds/);
  assertClean(result.message);
});

test("a singular '1 second' cooldown is read too", () => {
  const result = describeSendError(
    api("For security purposes, you can only request this after 1 second.", 429, "over_email_send_rate_limit"),
  );
  assert.equal(result.waitSeconds, 1);
});

test("GoTrue's rounded-down '0 seconds' is still a one second wait, never the hourly wording", () => {
  const result = describeSendError(
    api("For security purposes, you can only request this after 0 seconds.", 429, "over_email_send_rate_limit"),
  );
  assert.equal(result.waitSeconds, 1);
  assert.doesNotMatch(result.message, /hour/i);
});

test("the hourly email quota has no countdown and says to wait, not to retry", () => {
  const result = describeSendError(api("email rate limit exceeded", 429, "over_email_send_rate_limit"));
  assert.equal(result.waitSeconds, undefined);
  assert.match(result.message, /wait/i);
  assert.match(result.message, /will not help/i);
  assertClean(result.message);
});

test("a request-rate 429 without a code is still a rate limit", () => {
  const result = describeSendError({ message: "Request rate limit reached", status: 429 });
  assert.match(result.message, /too many/i);
  assertClean(result.message);
});

test("offline (AuthRetryableFetchError) is a connection message, not a Supabase one", () => {
  const result = describeSendError(new AuthRetryableFetchError("Failed to fetch", 0));
  assert.match(result.message, /internet connection/i);
  assertClean(result.message);
});

test("supabase-js reports a 500 from the mail provider as AuthRetryableFetchError, and that is NOT 'offline'", () => {
  // Exactly what supabase-js 2.112 throws for a 500 {"error_code":"unexpected_failure"}:
  // the retryable class, the real status, and the code dropped.
  const result = describeSendError(new AuthRetryableFetchError("Error sending magic link email", 500));
  assert.doesNotMatch(result.message, /internet connection/i);
  assert.match(result.message, /usually temporary/i);
  assertClean(result.message);
});

test("gateway errors (502, 503, 504) are Supabase being down, not the owner's connection", () => {
  for (const status of [502, 503, 504]) {
    const result = describeSendError(new AuthRetryableFetchError("Bad Gateway", status));
    assert.match(result.message, /usually temporary/i, `status ${status}`);
    const verify = describeVerifyError(new AuthRetryableFetchError("Bad Gateway", status));
    assert.match(verify.message, /problem just now/i, `verify ${status}`);
    assert.doesNotMatch(verify.message, /internet connection/i);
  }
});

test("a thrown browser fetch error is treated the same way", () => {
  const result = describeSendError(new TypeError("Failed to fetch"));
  assert.match(result.message, /internet connection/i);
});

test("the mail provider failing is temporary trouble, with no raw text", () => {
  const result = describeSendError(api("Error sending magic link email", 500, "unexpected_failure"));
  assert.match(result.message, /usually temporary/i);
  assertClean(result.message);
});

test("a 5xx from Supabase itself is temporary trouble", () => {
  const result = describeSendError({ message: "upstream connect error", status: 503 });
  assert.match(result.message, /usually temporary/i);
});

test("an address Supabase will not mail yet points at email setup", () => {
  const result = describeSendError(
    api("Email address not authorized", 400, "email_address_not_authorized"),
  );
  assert.match(result.message, /email setup/i);
});

test("signups switched off is explained for the developer", () => {
  const result = describeSendError(api("Signups not allowed for otp", 422, "otp_disabled"));
  assert.match(result.message, /switched off/i);
});

test("an invalid address is the user's to fix", () => {
  const result = describeSendError(api("Unable to validate email address: invalid format", 400, "email_address_invalid"));
  assert.match(result.message, /does not look right/i);
});

test("an unknown failure still ends in a calm sentence", () => {
  const result = describeSendError(api("something new", 418, "some_future_code"));
  assert.match(result.message, /try once more/i);
  assertClean(result.message);
  assert.doesNotMatch(result.message, /something new|418|some_future_code/);
});

test("null and undefined do not throw", () => {
  assert.ok(describeSendError(null).message.length > 0);
  assert.ok(describeVerifyError(undefined).message.length > 0);
});

test("a wrong or expired code gets one answer, as GoTrue gives one", () => {
  const result = describeVerifyError(api("Token has expired or is invalid", 403, "otp_expired"));
  assert.match(result.message, /did not work/i);
  assert.match(result.message, /expired/i);
  assert.match(result.message, /new code/i);
  assertClean(result.message);
});

test("too many verify attempts says to wait and that the latest code is still good", () => {
  const result = describeVerifyError(api("Request rate limit reached", 429, "over_request_rate_limit"));
  assert.match(result.message, /wait/i);
  assert.match(result.message, /still valid|stays valid/i);
  assertClean(result.message);
});

test("verifying while offline is a connection message", () => {
  const result = describeVerifyError(new AuthRetryableFetchError("Failed to fetch", 0));
  assert.match(result.message, /internet connection/i);
});

test("an expired or used link asks for a new code", () => {
  assert.match(describeLinkError("otp_expired", "Email link is invalid or has expired"), /expired or was already used/i);
  assert.match(describeLinkError(null, "Email link is invalid or has expired"), /expired or was already used/i);
});

test("an unrecognised link failure is generic, not echoed", () => {
  const message = describeLinkError("server_error", "Database error saving new user");
  assert.match(message, /could not be used/i);
  assert.doesNotMatch(message, /database/i);
});

test("the owner address comparison ignores case and padding and nothing else", () => {
  assert.equal(OWNER_EMAIL, "crownedbynattt@gmail.com");
  assert.equal(isOwnerEmail("  CrownedByNattt@Gmail.com "), true);
  assert.equal(isOwnerEmail("crownedbynatt@gmail.com"), false);
  assert.equal(isOwnerEmail("crownedbynattt+x@gmail.com"), false);
  assert.equal(isOwnerEmail("crowned.bynattt@gmail.com"), false);
  assert.equal(isOwnerEmail(""), false);
  assert.equal(isOwnerEmail(null), false);
});
