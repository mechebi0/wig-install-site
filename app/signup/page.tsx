import type { Metadata } from "next";
import { AuthAlternate, AuthShell } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { ACCOUNT } from "@/lib/content";

export const metadata: Metadata = {
  title: "Make an account",
  description: ACCOUNT.signup.lede,
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return (
    <AuthShell
      kicker={ACCOUNT.signup.kicker}
      title={ACCOUNT.signup.title}
      lede={ACCOUNT.signup.lede}
      footer={
        <AuthAlternate
          prompt={ACCOUNT.signup.alternate}
          linkLabel={ACCOUNT.signup.alternateLink}
          href="/login/"
        />
      }
    >
      <SignupForm />
    </AuthShell>
  );
}
