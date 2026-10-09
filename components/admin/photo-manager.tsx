"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { SignOut } from "@phosphor-icons/react/dist/ssr";
import { Guarded } from "@/components/auth/guarded";
import { Wordmark } from "@/components/wordmark";
import { Notice } from "@/components/ui/feedback";
import { PhotoLibrary } from "@/components/admin/photo-library";
import { PhotoPlaces } from "@/components/admin/photo-places";
import { PhotoUpload } from "@/components/admin/photo-upload";
import { useBuiltPhotoSet } from "@/components/site-photos";
import { signOut } from "@/lib/auth/session";
import { ADMIN_LOGIN_PATH, ADMIN_PHOTOS_PATH, leaveTo } from "@/lib/auth/redirect";
import { fetchAdminPhotos, sweepOrphanFiles, type AdminPhoto } from "@/lib/photo-admin";
import { byWebsiteOrder, storageKeys, type PhotoSet } from "@/lib/site-photos";

/**
 * /admin/photos/ - Nat's photo manager.
 *
 * ---------------------------------------------------------------------------
 * EVERY PHOTOGRAPH ON THE WEBSITE
 * ---------------------------------------------------------------------------
 * Two sections. "Website photos" is every photograph, the eighteen the site
 * launched with and everything added since, managed the same way: add,
 * replace, edit, hide, reorder, remove. "Where photos appear" is which
 * photograph fills each fixed place (the homepage slideshow, the collection
 * covers, the install pages and so on). Between them there is nothing about
 * the site's photography left that needs a developer; see
 * docs/photo-manager.md for the little that does.
 *
 * ---------------------------------------------------------------------------
 * WHO GETS IN, AND WHAT DECIDES IT
 * ---------------------------------------------------------------------------
 * Guarded (components/auth/guarded.tsx) sends a signed-out visitor to the
 * owner's sign-in and shows anyone signed in without the admin role a dead
 * end. That is routing. The security is underneath it: every read and write
 * on this screen is answered by Postgres and Storage according to
 * is_admin(), so the same requests from anyone else are refused however they
 * are sent (supabase/migrations/0006 and 0007).
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
  const [set, setSet] = useState<PhotoSet | null>(null);
  const [status, setStatus] = useState<LoadStatus>("loading");
  const [loadError, setLoadError] = useState("");

  /*
    Every Storage file the deployed pages were built with. A file in here is
    never deleted, even after its photograph is replaced or removed, until a
    deployment that no longer uses it is live (lib/photo-admin.ts).
  */
  const built = useBuiltPhotoSet();
  const deployed = useMemo(() => storageKeys(built), [built]);

  /*
    `.then()` rather than awaits, so every setState lands in a promise
    callback and none in the body of the effect that starts it (the same
    pattern as components/admin/admin-locations.tsx).
  */
  const load = useCallback(
    () =>
      fetchAdminPhotos().then(({ set: found, truncated, error }) => {
        if (error || !found) {
          setLoadError(error);
          setStatus("error");
          return;
        }
        setSet(found);
        setStatus("ready");
        // Housekeeping, only against a complete list: a partial one would
        // make files that are in use look abandoned.
        if (!truncated) void sweepOrphanFiles(found.photos, deployed);
      }),
    [deployed],
  );

  useEffect(() => {
    void load();
  }, [load]);

  /* Where a new batch goes: after the last photograph, or before the first. */
  const orders = useMemo(() => {
    const all = set?.photos.map((photo) => photo.order) ?? [];
    return all.length > 0
      ? { first: Math.min(...all), last: Math.max(...all) }
      : { first: 1, last: 0 };
  }, [set]);

  const setPhotos = (photos: AdminPhoto[]) =>
    setSet((current) => (current ? { ...current, photos } : current));

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
            {/* Its own line on a phone. Beside the label, break-all cut the
                address at 320px and left the final "m" alone on a line. */}
            <span className="block break-all font-medium text-ink sm:inline">{email}</span>
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
        <section aria-labelledby="website-photos-heading" className="flex flex-col gap-10">
          <div>
            <h2
              id="website-photos-heading"
              className="font-display text-2xl tracking-tight text-ink lg:text-3xl"
            >
              Website photos
            </h2>
            <p className="mt-2 max-w-[62ch] text-base leading-relaxed text-muted">
              Manage the photos featured across Crowned by Nat. Add, replace,
              remove, hide, or reorder photos without contacting your
              developer.
            </p>
          </div>

          <PhotoUpload
            orders={orders}
            onUploaded={(added) => {
              setSet((current) =>
                current
                  ? { ...current, photos: [...current.photos, ...added].sort(byWebsiteOrder) }
                  : current,
              );
            }}
          />

          <PhotoLibrary
            set={set}
            status={status}
            loadError={loadError}
            deployed={deployed}
            onRetry={() => {
              setStatus("loading");
              void load();
            }}
            onChange={setPhotos}
          />
        </section>

        {status === "ready" && set ? <PhotoPlaces set={set} onChange={setSet} /> : null}
      </div>
    </div>
  );
}
