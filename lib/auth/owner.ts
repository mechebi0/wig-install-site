/**
 * The studio owner's sign-in address.
 *
 * ---------------------------------------------------------------------------
 * THIS GRANTS NOTHING
 * ---------------------------------------------------------------------------
 * It is in the bundle, so anyone can read it, and anyone can send whatever
 * they like to the API regardless of what this file says. What makes Nat the
 * owner is profiles.role = 'admin' in the database, checked by is_admin()
 * inside every policy that guards a photograph or a Storage object (see
 * supabase/migrations/0006_owner_photo_manager.sql).
 *
 * It exists for two pieces of courtesy on /admin/login/:
 *   - the form only emails a sign-in code to this address, so a stranger
 *     cannot use the owner's page to send codes to other people or to burn
 *     through the project's hourly email allowance
 *   - when the owner is signed in but has not been promoted yet, the page can
 *     say "one setup step is left" instead of a flat "no access"
 *
 * Separate from STUDIO.email in lib/content.ts on purpose. That one is the
 * public contact address and may change; this is an account, and changing it
 * means changing the account in Supabase as well.
 */
export const OWNER_EMAIL = "crownedbynattt@gmail.com";

export function isOwnerEmail(email: string | null | undefined): boolean {
  return (email ?? "").trim().toLowerCase() === OWNER_EMAIL;
}
