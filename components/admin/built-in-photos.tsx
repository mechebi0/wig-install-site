import { Photograph } from "@/components/photo";
import { collectionTitle } from "@/components/admin/photo-fields";
import { GALLERY_ITEMS } from "@/lib/collections";

/**
 * The photographs that are part of the site itself, listed read-only.
 *
 * They live in public/images/work/ and lib/collections.ts, measured and
 * cropped by hand, and several of them are also the homepage hero, the
 * install pages' lead photographs and the social share image. Removing one
 * from a form would break those places silently, so the photo manager shows
 * them for reference and says how they are changed, rather than offering a
 * delete button that could not be honest about what it does.
 *
 * Collapsed by default: Nat opens the manager to work with her uploads, and
 * a grid of photographs she cannot change should not push them off screen.
 */
export function BuiltInPhotos() {
  return (
    <details className="group rounded-3xl border border-line bg-surface/60 p-5 sm:p-7">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block font-display text-xl tracking-tight text-ink">
            Photos built into the website
          </span>
          <span className="mt-1 block text-sm text-muted">
            {GALLERY_ITEMS.length} photos that are part of the site&rsquo;s design.
          </span>
        </span>
        <span
          aria-hidden="true"
          className="text-sm font-medium text-accent group-open:hidden"
        >
          Show
        </span>
        <span
          aria-hidden="true"
          className="hidden text-sm font-medium text-accent group-open:inline"
        >
          Hide
        </span>
      </summary>

      <p className="mt-5 max-w-[62ch] text-sm leading-relaxed text-muted">
        These are also used on the homepage, the install pages and in link
        previews, so they are changed by your developer rather than here. Your
        uploads appear in each gallery after them.
      </p>

      <ul className="mt-6 grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {GALLERY_ITEMS.map((item) => (
          <li key={item.id}>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-surface-3">
              <Photograph
                photo={item.image}
                sizes="(min-width: 1024px) 12vw, 30vw"
                style={{ objectPosition: item.focalPosition }}
                className="absolute inset-0 h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 text-xs font-medium leading-snug text-ink">{item.title}</p>
            <p className="mt-0.5 text-xs leading-snug text-muted">
              {/* Natural Lace membership is a finish tag, not a style. */}
              {[
                ...item.styleCategories,
                ...(item.finishAttributes.includes("natural-lace") ? ["natural-lace"] : []),
              ]
                .map(collectionTitle)
                .join(", ")}
            </p>
          </li>
        ))}
      </ul>
    </details>
  );
}
