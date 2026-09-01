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
| `/styles`                  | The six collections as large editorial cards                       |
| `/styles/deep-wave-glam`   | Collection hero, gallery with lightbox, CTA, related collections   |
| `/styles/sleek-straight`   | as above                                                          |
| `/styles/signature-bob`    | as above                                                          |
| `/styles/body-wave-glam`   | as above                                                          |
| `/styles/color-and-custom` | as above                                                          |
| `/styles/natural-lace`     | as above                                                          |
| `/book`                    | Every service and price, studio details, the booking flow          |
| `/before-you-book`         | The appointment step by step, and the FAQ                          |
| `/reviews`                 | Client quotes                                                      |
| `/meet-nat`                | Introduction, credentials, three assurances                        |
| `/login` `/signup` `/account` | Customer accounts and appointments                              |
| `/admin`                   | Nat's dashboard. Deliberately absent from all public navigation    |

The six collection pages are generated from one file, `app/styles/[slug]/page.tsx`,
via `generateStaticParams`, so the build emits six real HTML files and the six
pages cannot drift apart.

`/work` was the single page that carried the whole portfolio before the split.
`public/_redirects` sends it to `/styles/` with a 301 so old links keep working.

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
`out/styles/__next.styles/__PAGE__.txt` but requests it at
`/styles/__next.styles.__PAGE__.txt`. Those never match, so with `next/link`
every page load fired a prefetch that 404'd, and every client-side navigation
fell back to a full page load anyway — the same navigation, plus a console full
of 404s on every page. The fix would be a post-build renaming step, which would
mean the Cloudflare build command could no longer be plain `npx next build`.
`@next/next/no-html-link-for-pages` is switched off in `eslint.config.mjs` for
that reason; if a future Next release fixes the payload paths, delete the
override and switch the nav, the footer and `ButtonLink` back to `next/link`.

## Where to change things

### `lib/collections.ts` — the six style collections

The single source of truth for the whole `/styles` branch: every card, every
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

No play button. That is a deliberate design decision with a cost worth knowing
about: WCAG 2.2.2 asks for a mechanism to pause, stop or hide anything that
moves automatically for more than five seconds, and a labelled control is the
obvious way to provide one. In its place:

- touching any dot stops the rotation permanently
- rotation pauses while keyboard focus is anywhere inside the hero
- under `prefers-reduced-motion` it never starts, and the dots are full manual
  control
- it stops when scrolled past or when the tab is in the background

Hover deliberately does not pause: the hero is most of the viewport, so at
desktop the pointer rests on it almost all the time. If stricter conformance is
wanted later, restoring a discreet pause control beside the dots is a small
change in `components/hero-carousel.tsx`.

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
