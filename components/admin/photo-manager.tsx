"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { Guarded } from "@/components/auth/guarded";
import { Wordmark } from "@/components/wordmark";
import { Notice } from "@/components/ui/feedback";
import { BuiltInPhotos } from "@/components/admin/built-in-photos";
import { PhotoLibrary } from "@/components/admin/photo-library";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { signOut } from "@/lib/auth/session";
import { ADMIN_LOGIN_PATH, ADMIN_PHOTOS_PATH, leaveTo } from "@/lib/auth/redirect";
import { fetchAdminPhotos, sweepOrphanFiles, type AdminPhoto } from "@/lib/photo-admin";

/**
 * /admin/photos/ - Nat's photo manager.
 *
 * ---------------------------------------------------------------------------
 * WHO GETS IN, AND WHAT DECIDES IT
 * ---------------------------------------------------------------------------
 * Guarded (components/auth/guarded.tsx) sends a signed-out visitor to the
 * owner's sign-in and shows anyone signed in without the admin role a dead
 * end. That is routing. The security is underneath it: every read and write
 * on this screen is answered by Postgres and Storage according to
 * is_admin(), so the same requests from anyone else are refused however they
 * are sent (supabase/migrations/0006_owner_photo_manager.sql).
 *
 * When the session ends while the page is open - "Log out" in another tab,
 * an expired sign-in, or the sessions being revoked - Supabase reports it,
 * Guarded swaps this whole screen for the sign-in redirect, and no control
 * here stays on screen to be pressed. A write that is refused because the
 * session ended does the same (see explain() in lib/photo-admin.ts).
 *
 * Same blush paper, wine ink and single rose accent as the rest of the site,
 * the same as the booking dashboard at /admin/.
 */
export function PhotoManager() {
  return (
    <Guarded
      requireAdmin
      returnTo={ADMIN_PHOTOS_PATH}
      heading="Crowned by Nat"
      offline={
        <Notice tone="info" title="The photo manager is not connected yet.">
          It needs the site&rsquo;s Supabase project, which has not been set up
          on this deployment. The steps are in docs/photo-manager.md.
        </Notice>
      }
    >
      {({ user }) => <Manager email={user.email ?? ""} />}
    </Guarded>
  );
}

type LoadStatus = "loading" | "ready" | "error";

function Manager({ email }: { email: string }) {
  const [photos, setPhotos] = useState<AdminPhoto[]>([]);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState("");

  /*
    `.then()` rather than awaits, so every setState lands in a promise
    callback and none in the body of the effect that starts it (the same
    pattern as components/admin/admin-locations.tsx).
  */
  const load = useCallback(
    () =>
      fetchAdminPhotos().then(({ photos: found, truncated, error }) => {
        if (error) {
          setLoadError(error);
          setStatus("error");
          return;
        }
        setPhotos(found);
        setStatus("ready");
        // Housekeeping, only against a complete list: a partial one would
        // make files that are in use look abandoned.
        if (!truncated) void sweepOrphanFiles(found);
      }),
    [],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /* New uploads go in ahead of the first one. */
  const firstOrder = useMemo(
    () => (photos.length > 0 ? Math.min(...photos.map((photo) => photo.order)) : 0),
    [photos],
  );

  return (
    <div className="mx-auto max-w-[1400px] px-5 pb-24 pt-10 sm:px-8 lg:pb-28 lg:pt-14">
      {/* ------------------------------------------------------- header --- */}
      <header className="flex flex-wrap items-start justify-between gap-6 border-b border-line pb-8">
        {/* One h1 for the brand and the tool, as on the dashboard at /admin/. */}
        <h1>
          <Wordmark className="text-2xl text-ink" />
          <span className="label mt-3 block text-accent">Photo Manager</span>
        </h1>

        <div className="flex min-w-0 flex-col gap-3 sm:items-end">
          <p className="text-sm text-muted">
            Owner account:{" "}
            <span className="break-all font-medium text-ink">{email}</span>
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <a
              href="/admin/"
              className="inline-flex min-h-11 items-center rounded-full px-4 text-sm text-muted transition-colors hover:text-accent"
            >
              Dashboard
            </a>
            <a
              href="/gallery/"
              className="inline-flex min-h-11 items-center rounded-full border border-line-strong bg-surface px-5 text-sm text-ink transition-colors hover:border-accent hover:text-accent"
            >
              View the gallery
            </a>
            <button
              type="button"
              onClick={() => {
                void signOut().then(() => leaveTo(ADMIN_LOGIN_PATH, true));
              }}
              className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full px-4 text-sm text-muted transition-colors hover:text-accent"
            >
              <SignOut size={17} weight="regular" aria-hidden="true" />
              Log out
            </button>
          </div>
        </div>
      </header>

      <div className="mt-10 flex flex-col gap-16 lg:mt-14 lg:gap-20">
        <PhotoUpload
          firstOrder={firstOrder}
          onUploaded={(added) => {
            setPhotos((current) =>
              [...added, ...current].sort(
                (a, b) => a.order - b.order || b.createdAt.localeCompare(a.createdAt),
              ),
            );
          }}
        />

        <PhotoLibrary
          photos={photos}
          status={status}
          loadError={loadError}
          onRetry={() => {
            setStatus("loading");
            void load();
          }}
          onChange={setPhotos}
        />

        <BuiltInPhotos />
      </div>
    </div>
  );
}
