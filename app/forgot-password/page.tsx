import type { Metadata } from "next";
import { AuthAlternate, AuthShell } from "@/components/auth/auth-shell";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { ACCOUNT } from "@/lib/content";

export const metadata: Metadata = {
  title: "Reset your password",
  description: ACCOUNT.forgot.lede,
  robots: { index: false, follow: false },
};

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      kicker={ACCOUNT.forgot.kicker}
      title={ACCOUNT.forgot.title}
      lede={ACCOUNT.forgot.lede}
      footer={
        <AuthAlternate
          prompt="Remembered it?"
          linkLabel="Log in"
          href="/login/"
        />
      }
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
