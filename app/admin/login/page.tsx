import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { OwnerSignIn } from "@/components/auth/owner-sign-in";

/**
 * The studio owner's sign-in, in front of /admin/photos/ and /admin/.
 *
 * Separate from /login/ because it works differently, not because it is
 * secret: customers sign in with a password there, and the owner signs in
 * here with a code emailed to the studio address, so no password for the
 * owner account exists anywhere. It is the one admin page the nav links to
 * (ADMIN_LINK in lib/content.ts). Like every admin page it is kept out of
 * search results, and like every admin page that is not what protects it;
 * see components/admin/photo-manager.tsx.
 */
export const metadata: Metadata = {
  title: "Owner sign-in",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLoginPage() {
  return (
    <AuthShell
      kicker="Studio owner"
      title="Sign in to manage photos."
      lede="No password needed. Enter the studio's email address and a sign-in code will be emailed to it."
    >
      <OwnerSignIn />
    </AuthShell>
  );
}
