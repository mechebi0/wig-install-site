import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { ACCOUNT } from "@/lib/content";

/**
 * The landing page for a password reset email.
 *
 * This URL has to be listed under Authentication -> URL Configuration ->
 * Redirect URLs in the Supabase dashboard, for every origin the site runs on,
 * or Supabase refuses to redirect here and the link dies. That allowlist is
 * the thing standing between a reset flow and an open redirect, so it is a
 * required manual step rather than an optional one. See supabase/README.md.
 */
export const metadata: Metadata = {
  title: "Pick a new password",
  description: ACCOUNT.reset.lede,
  robots: { index: false, follow: false },
};

export default function ResetPasswordPage() {
  return (
    <AuthShell
      kicker={ACCOUNT.reset.kicker}
      title={ACCOUNT.reset.title}
      lede={ACCOUNT.reset.lede}
    >
      <ResetPasswordForm />
    </AuthShell>
  );
}
