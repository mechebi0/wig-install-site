import type { Metadata } from "next";
import { PhotoManager } from "@/components/admin/photo-manager";

/**
 * Nat's photo manager: add, edit, reorder and remove gallery photographs.
 *
 * NOT LINKED FROM ANYWHERE PUBLIC, and noindex. Neither is what protects it:
 * this is a static file anyone can fetch, and what it renders for anyone who
 * is not the owner is a redirect or a dead end, with every request behind it
 * refused by row level security and the Storage policies. See
 * supabase/migrations/0006_owner_photo_manager.sql.
 */
export const metadata: Metadata = {
  title: "Photo Manager",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPhotosPage() {
  return <PhotoManager />;
}
