import type { Metadata } from "next";
import { AuthAlternate, AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ACCOUNT } from "@/lib/content";

/**
 * The customer login.
 *
 * Nat does not sign in here. Her account has no password at all: she signs in
 * at /admin/login/ with a code emailed to the studio address (see
 * components/auth/owner-sign-in.tsx). That page existing tells nobody
 * anything useful, because what makes an account the owner's is a role in the
 * database, not a URL, and every admin request is checked against that role.
 * See the note in components/auth/login-form.tsx on how the destination is
 * chosen after a customer logs in.
 *
 * noindex, because a login form in search results is only ever useful to
 * somebody looking for one to attack.
 */
export const metadata: Metadata = {
  title: "Log in",
  description: ACCOUNT.login.lede,
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <AuthShell
      kicker={ACCOUNT.login.kicker}
      title={ACCOUNT.login.title}
      lede={ACCOUNT.login.lede}
      footer={
        <AuthAlternate
          prompt={ACCOUNT.login.alternate}
          linkLabel={ACCOUNT.login.alternateLink}
          href="/signup/"
        />
      }
    >
      <LoginForm />
    </AuthShell>
  );
}
