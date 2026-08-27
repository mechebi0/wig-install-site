"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { buttonStyles } from "@/components/button";
import { TextField, focusFirstError } from "@/components/ui/form";
import { Notice, Spinner } from "@/components/ui/feedback";
import { requireSupabase } from "@/lib/supabase/client";
import { appointmentErrorMessage } from "@/lib/appointments";
import type { Profile } from "@/lib/supabase/types";

/**
 * Name, phone and email, editable in place.
 *
 * ---------------------------------------------------------------------------
 * WHY EMAIL IS SHOWN BUT NOT EDITABLE HERE
 * ---------------------------------------------------------------------------
 * profiles.email is a mirror. The real address lives in auth.users, and
 * changing it is a Supabase Auth operation that sends a confirmation to BOTH
 * the old and the new address before it takes effect. Writing to the mirror
 * would produce an account whose profile says one thing and whose login says
 * another, with no way to sign in to the new one.
 *
 * protect_profile_columns() refuses the write for exactly that reason: it
 * resets `email` to its previous value for any caller who is not an admin. The
 * field is disabled here to match the database rather than to substitute for
 * it, which is the same relationship every control on this site has with its
 * policy.
 *
 * The `role` column gets no field at all, not even a disabled one. The same
 * trigger raises an exception on any attempt to change it.
 */
export function AccountDetails({
  profile,
  onSaved,
}: {
  profile: Profile;
  onSaved: () => void;
}) {
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [errors, setErrors] = useState<{ "account-phone"?: string }>({});
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  const dirty =
    fullName !== (profile.full_name ?? "") || phone !== (profile.phone ?? "");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved(false);

    const found: { "account-phone"?: string } = {};
    const digits = phone.replace(/\D/g, "");
    if (digits && (digits.length < 10 || digits.length > 15)) {
      found["account-phone"] = "That looks off. Include the area code.";
    }

    setErrors(found);
    if (Object.keys(found).length > 0) {
      focusFirstError(found);
      return;
    }

    setBusy(true);
    const supabase = requireSupabase();
    const { error: failed } = await supabase
      .from("profiles")
      .update({
        full_name: fullName.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", profile.id);

    setBusy(false);

    if (failed) {
      setError(appointmentErrorMessage(failed));
      return;
    }

    setSaved(true);
    onSaved();
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          id="account-name"
          label="Your name"
          autoComplete="name"
          value={fullName}
          onChange={(event) => {
            setFullName(event.target.value);
            setSaved(false);
          }}
        />
        <TextField
          id="account-phone"
          label="Mobile number"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          value={phone}
          onChange={(event) => {
            setPhone(event.target.value);
            setSaved(false);
          }}
          error={errors["account-phone"]}
          help="How Nat confirms your slot."
        />
        <TextField
          id="account-email"
          label="Email"
          type="email"
          value={profile.email}
          disabled
          readOnly
          className="sm:col-span-2"
          help="Your email is your login. To change it, text the studio and Nat will get it moved over safely."
        />
      </div>

      {error ? <Notice tone="error">{error}</Notice> : null}
      {saved ? <Notice tone="success">Saved.</Notice> : null}

      <div>
        <button
          type="submit"
          disabled={busy || !dirty}
          className={buttonStyles.primary}
        >
          {busy ? (
            <>
              <Spinner size={17} />
              Saving
            </>
          ) : (
            "Save my details"
          )}
        </button>
      </div>
    </form>
  );
}
