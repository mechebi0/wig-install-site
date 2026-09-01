# Crowned by Nat

Marketing and booking site for **Crowned by Nat**, a one-chair lace wig install
studio working out of Towson, MD and Laurel, MD. Every install is performed
personally by Nat.

Next.js (App Router) + TypeScript + Tailwind CSS v4, exported as a fully static
site and deployed on Cloudflare Pages.

## Running it

```bash
npm install
npm run dev      # http://localhost:3000
npm run lint
npx tsc --noEmit
npx next build   # writes the static site to out/
```

## Pages

The homepage is a landing experience, not a table of contents. It carries the
brand, all six style collections as a visual directory, and two short doorways
out. Anything that needs a paragraph or a grid to be worth reading lives on its
own page.

| Route                      | What is on it                                                     |
| -------------------------- | ----------------------------------------------------------------- |
| `/`                        | Hero carousel, brand statement, six collections, teasers, CTA      |
| `/gallery`                  | The six collections as large editorial cards                       |
| `/gallery/deep-wave-glam`   | Collection hero, gallery with lightbox, CTA, related collections   |
| `/gallery/sleek-straight`   | as above                                                          |
| `/gallery/signature-bob`    | as above                                                          |
| `/gallery/body-wave-glam`   | as above                                                          |
| `/gallery/color-and-custom` | as above                                                          |
| `/gallery/natural-lace`     | as above                                                          |
| `/book`                    | Every service and price, studio details, the booking flow          |
| `/before-you-book`         | The appointment step by step, and the FAQ                          |
| `/reviews`                 | Client quotes                                                      |
| `/meet-nat`                | Introduction, credentials, three assurances                        |
| `/login` `/signup` `/account` | Customer accounts and appointments                              |
| `/admin`                   | Nat's dashboard. Deliberately absent from all public navigation    |

The six collection pages are generated from one file, `app/gallery/[slug]/page.tsx`,
via `generateStaticParams`, so the build emits six real HTML files and the six
pages cannot drift apart.

Two earlier URLs are still linked from elsewhere: `/work` (the single page that
carried the whole portfolio) and `/styles` (the collections, before the rename).
`public/_redirects` 301s both to `/gallery/`.

## Deployment

Cloudflare Pages, building from `main`:

| Setting           | Value                        |
| ----------------- | ---------------------------- |
| Production branch | `main`                       |
| Framework preset  | Next.js (Static HTML Export) |
| Build command     | `npx next build`             |
| Output directory  | `out`                        |
| Root directory    | `/`                          |

`next.config.ts` sets `output: "export"`, `images.unoptimized`, and
`trailingSlash: true` (so every route exports as `<route>/index.html` and
resolves on any static host). **Do not add API routes, server actions,
middleware, or ISR** — none of them exist on a static host, and any one of them
breaks the deployment.

### Why navigation uses plain `<a>` and not `next/link`

Under `output: "export"`, Next 16.3.3 writes each route's RSC payload to
`out/gallery/__next.gallery/__PAGE__.txt` but requests it at
`/gallery/__next.gallery.__PAGE__.txt`. Those never match, so with `next/link`
every page load fired a prefetch that 404'd, and every client-side navigation
fell back to a full page load anyway — the same navigation, plus a console full
of 404s on every page. The fix would be a post-build renaming step, which would
mean the Cloudflare build command could no longer be plain `npx next build`.
`@next/next/no-html-link-for-pages` is switched off in `eslint.config.mjs` for
that reason; if a future Next release fixes the payload paths, delete the
override and switch the nav, the footer and `ButtonLink` back to `next/link`.

## Where to change things

### `lib/collections.ts` — the six style collections

The single source of truth for the whole `/gallery` branch: every card, every
gallery, every collection page and all six sets of page metadata are generated
from the `COLLECTIONS` array. Each entry has a slug, a title, a three-beat
tagline, a summary, a description, a meta description, a hero photograph, a
hover photograph and a gallery.

Photographs live flat in `public/images/work/`, one definition per file in the
`WORK` map, so a look that belongs to two collections is described once. To add
a look: crop it to 3:4, export three widths into `public/images/work/`
(`name-1600.jpg`, `name.jpg`, `name-600.jpg`), add a `photo()` line with real
alt text, then list it in whichever collections it belongs to.

### `lib/content.ts` — all copy and business details

- `STUDIO` and the `CONTACT` block above it — brand name, owner, email, and the
  values still missing (phone, street, hours, Instagram). **Anything empty is
  empty on purpose**: every component reads these through helpers and renders
  nothing at all where there is no real value, so the site can never advertise a
  phone number nobody owns. Fill one in and it appears everywhere at once.
- `LOCATIONS` — Towson and Laurel. The compiled-in fallback for the announcement
  strip while there is no Supabase project; see `lib/catalog.ts`.
- `STUDIO.bookingUrl` — **the one switch that controls booking.** Leave it empty
  and every CTA goes to `/book`. Paste a Square / Fresha / Calendly / Acuity
  link and every CTA opens that instead, and `/book` swaps the form for a
  hand-off panel automatically.
- `SERVICES` — names, prices, durations. Still stand-ins.
- `PAGES`, `HOME`, `HERO`, `COLLECTION_PAGE` — page and section copy.
- `OWNER`, `QUESTIONS`, `TESTIMONIALS`, `PROCESS`, `ASSURANCES`.

### `lib/gallery.ts` — the read path

Every component that shows a collection reads it through here, not out of
`lib/collections.ts` directly. Today these functions return the compiled-in
constants; when Nat has a Supabase project and an admin screen, they return
rows and no component changes. See the note at the top of that file for why the
gallery is still in the bundle (short version: a static export has no server
render to fetch during, so a database-backed gallery would ship six pages of
empty grids).

### `lib/images.ts` — the hero rotation and the two non-portfolio slots

The hero slides reference photographs out of `lib/collections.ts`, so a picture
is never described in two places. What is left here is the ordering of the six
hero slides and the one remaining stock slot.

```
public/images/work/    every photograph of finished work, three widths each
public/images/         the lace-cap product shot (stock)
public/brand/          Nat's neon studio sign, background removed
```

## The brand mark

`public/brand/crowned-by-nat-neon.webp` is Nat's own neon studio sign — the same
sign on the wall behind the chair in half the photographs on this site. It was
supplied as a photograph on a black wall; the black has been lifted out so the
glow composites over any dark field.

It therefore belongs on **wine or darker surfaces only**. The nav and the mobile
menu use the typographic wordmark instead, and the mark itself appears on the
hero and in the footer.

## The hero carousel

Full width, six slides, 7s each with a 1.6s crossfade. It autoplays: there is
no play button to press to start it.

**The composition.** Every photograph here is a 3:4 portrait, and a full-width
desktop hero is roughly 2:1. Cropping one to the other was tried and it cuts the
face off at the mouth and removes the hair. So each slide paints the same file
twice: once scaled up, blurred and darkened to fill the width, and once at 46%
of the width, bled to the right edge, cropped only mildly. The copy sits on the
blurred half. The browser fetches one file, so the backdrop is free.

**Stopping it**, per WCAG 2.2.2, which requires a mechanism to pause anything
that moves automatically for more than five seconds:

- an explicit pause/play button, labelled, with `aria-pressed`
- hover pauses while the pointer is over the hero, and resumes on exit
- keyboard focus inside the hero pauses it, gated on `:focus-visible` so a
  mouse click does not leave it stuck
- a swipe, an arrow or a dot stops it for good; the play button hands it back
- it stops when scrolled past or the tab is backgrounded
- under `prefers-reduced-motion` it never starts and the crossfade collapses

Hover is wired to native `pointerenter`/`pointerleave` rather than React's
delegated `onMouseEnter`/`onMouseLeave`. Pressing pause swaps the glyph inside
the button, which unmounts the node the pointer is over, and the synthetic
leave for the next move never arrives: hover sticks on and the carousel that
was just asked to play sits still. The native events are computed from geometry
and do not care what the subtree did.

## Admin and customer accounts: what exists, what is pending

**Built and working today.** Customer signup, login, password reset, the
account dashboard, guest booking, the five-step booking flow, and the admin
dashboard with locations, appointments, customers and services. All of it is
real code against a real schema, and all of it degrades honestly when there is
no Supabase project: the nav hides the account control, `/login` and `/admin`
say plainly that the booking system is not connected, and `/book` falls back to
an email request form. **The production build does not need any Supabase
environment variable.**

**Schema ready, not yet wired.** `supabase/migrations/0002_gallery_reviews_settings.sql`
adds `gallery_items`, `gallery_categories`, `gallery_item_categories`,
`reviews` and `business_settings`, with row level security and an admin-only
write policy on each. Row types are in `lib/supabase/types.ts`. Nothing reads
them yet; they exist so the admin screens Nat eventually gets (manage gallery
photos, categories, featured images, ordering, reviews, and which town is open)
have a decided shape to be built against.

**Authorization is in the database, not the frontend.** Admin rights come from
`profiles.role` checked by `is_admin()` inside Postgres. The admin email
appearing anywhere in client code grants nothing: anyone can read the bundle and
call the API, so a check in the browser is decoration. Granting Nat admin is one
UPDATE, documented in `supabase/README.md`.

## Things still needed from Nat

- **Written consent from the clients in the photographs.** Every face on this
  site is a real customer. This is the one outstanding item that is not
  cosmetic.
- A phone number, a street address, opening hours, and an Instagram handle.
  Until then the site simply does not mention them.
- Confirmation that `crownedbynattt@gmail.com` is the right **public** contact.
  It is currently both the public address and the admin account.
- Confirmed service prices and durations.
- Confirmed appointment policy. `policiesAreDraft` in `lib/content.ts` is `true`,
  which puts a visible "draft answers" notice on `/before-you-book`.
- Her own biography, and a photograph of herself. Until one arrives, the portrait
  slot on `/meet-nat` holds a brand plate rather than a stranger's face; see
  `components/brand-plate.tsx`.
- Real client reviews. Until then `testimonialsArePlaceholder` stays `true`,
  which keeps the visible "sample wording" notice on `/reviews`. **Do not flip
  that flag while the words are still invented.**
- More Signature Bob photographs. That collection has three; the others have
  four to six.
- A booking link, if she moves to a booking tool.
- Supabase project credentials. See `supabase/README.md`.

## Photography and licence

Everything in `public/images/work/` is **Nat's own work**, shot in her own
studio. It is not stock and it is not licensed from anyone.

The one remaining stand-in is `public/images/unit-lace-cap-wide.jpg`, a
royalty-free photograph from [Pexels](https://www.pexels.com/license/) (free for
commercial use, no attribution required) used on `/book` to illustrate a lace
cap. It shows an object rather than a result, which is the line: stock may
illustrate a thing, never a piece of Nat's work.
