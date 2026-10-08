"use client";

import { Photograph } from "@/components/photo";
import { useSiteView } from "@/components/site-photos";

/**
 * The photograph beside the sign-in forms: the `sign-in` place in the photo
 * manager (lib/gallery.ts). A client component only so it follows Nat's
 * changes like every other photograph; AuthShell around it stays static.
 *
 * NOT `priority`, and that is what makes the panel's "desktop only" true
 * rather than merely intended: see the note in AuthShell.
 */
export function SignInPhoto() {
  const photo = useSiteView().signIn;
  if (!photo) return null;
  return (
    <Photograph
      photo={photo.item.image}
      sizes="50vw"
      large
      style={{ objectPosition: photo.focal }}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}
