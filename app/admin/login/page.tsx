import type { Metadata } from "next";
import { OwnerShell } from "@/components/auth/owner-shell";
import { OwnerSignIn } from "@/components/auth/owner-sign-in";

/**
 * The studio owner's sign-in, in front of /admin/photos/ and /admin/.
 *
 * Separate from /login/ because it works differently, not because it is
 * secret: customers sign in with a password there, and the owner signs in
 * here with a code emailed to the studio address, so no password for the
 * owner account exists anywhere. Like every admin page it is linked from
 * nowhere public and kept out of search results, and like every admin page
 * none of that is what protects it; see components/admin/photo-manager.tsx.
 *
 * Nat reaches it by its address, https://crownedbynat.com/admin/login/, which
 * she bookmarks (docs/photo-manager.md). There is deliberately no link to it
 * from the navigation or the footer.
 */
export const metadata: Metadata = {
  title: "Owner sign-in",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminLoginPage() {
  return (
    <OwnerShell
      kicker="Studio owner"
      title="Owner sign-in"
      lede="A secure one-time code is emailed to the studio owner. No password needed."
    >
      <OwnerSignIn />
    </OwnerShell>
  );
}
