import type { Metadata } from "next";
import { AuthAlternate, AuthShell } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { ACCOUNT } from "@/lib/content";

/**
 * The one login for the whole site.
 *
 * There is no separate admin login and there deliberately is not going to be
 * one. A /admin-login route is a sign saying "an admin account exists and it
 * signs in here", which is free reconnaissance and buys nothing: Nat and every
 * customer authenticate through the same form, and what differs afterwards is
 * a role in the database, not a URL. See the note in components/auth/login-form.tsx
 * on how the destination is chosen.
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
