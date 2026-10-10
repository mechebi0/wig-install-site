# The studio dashboard (content manager)

Nat's private dashboard for changing the website's words herself: business
details, locations, services and prices, the homepage, every page's text,
FAQs and policies, reviews, and search and social settings. Photos stay in the
photo manager, which the dashboard links to (`docs/photo-manager.md`).

| | |
| --- | --- |
| **Sign in** | `https://crownedbynat.com/admin/login/` |
| **Studio dashboard** | `https://crownedbynat.com/admin/` |
| **Photo manager** | `https://crownedbynat.com/admin/photos/` |
| **Owner account** | `crownedbynattt@gmail.com`, signed in with an emailed code, no password |

None of these pages is linked from the public site, on purpose (see
`docs/photo-manager.md`). Signing in now opens the studio dashboard; the photo
manager is one tap away from it.

> **Status (2026-10-09):** the dashboard is built and tested, but
> `0011_website_content.sql` has **not** been run on the hosted Supabase
> project. Until it is, the dashboard opens with a notice saying one setup
> step is left and saving is switched off, and the website keeps exactly the
> words it has today. Automatic website updates (the Cloudflare deploy hook in
> Vault, step 2 below) are not set up either. See
> [One-time setup](#one-time-setup-for-the-developer).

---

## For Nat

### Save, then publish

Changing the website is two steps, on purpose:

1. **Save** a section when you have finished with it. A save is private: it is
   stored, but nobody visiting the website sees it.
2. **Review & publish** (the **Website** card) when you are ready. You see a
   list of everything that will change, *was* and *now*, before anything goes
   live. Publishing then asks the website to update itself, which takes a few
   minutes.

So you can change several sections across several days, check them, and put
them live together.

### What the Website card says

| It says | What it means |
| --- | --- |
| **Showing the original words** | Nothing has been published from the dashboard yet. |
| **Publishing…** | You published, and the website is being updated. It usually takes 2 to 5 minutes. The card changes by itself; you can keep working. |
| **Live on the website** | The website has been checked, and it really shows your latest publish. The card never says this on the strength of a save. |
| **Publication pending** | Your words are published, but the website has not been updated with them yet. If automatic updates are not switched on, it catches up at its next update; if they are, the card offers **Update the website now**. |
| **Publication failed** | The update did not happen (the card says why). Your words are safe and published; the website still shows the version before. Tap **Try updating the website again**, and if it fails again, tell your developer. |

Each section also shows where it stands: **On the website**, **Saved, not
published**, or **Unsaved changes**. In the menu, a filled dot means unsaved
changes and a ring means saved changes waiting to be published.

### The menu

| Section | What it changes |
| --- | --- |
| **Overview** | Where the website is, what is published, and a way into everything else. |
| **Business information** | Business name, your name, contact email, phone (optional), studio address (optional) and the booking hours on the booking page. |
| **Locations** | Your current location and the other places you serve. See below. |
| **Services & pricing** | Each service's name, price, length shown on the menu, description, and whether it is offered; the menu order; the four menu headings; the finishes (Curls, Wand Curls, Crimps). |
| **Homepage** | The slideshow's words; the order of the blocks under it, and which are shown; each block's heading, sentence and link. |
| **Website content** | Every other page's words, by part of the website: header, footer and buttons; the booking page; the service booking pages; the install pages; gallery and collections; Before you book; Meet Nat; the page-not-found page. |
| **FAQs & policies** | The questions and answers on Before you book (add, edit, reorder, remove), and the draft notice beside them. |
| **Reviews** | Client reviews, and the sample notice. |
| **Photos & gallery** | Opens the photo manager. |
| **SEO & social links** | Your Instagram, and how the site appears in search results and link previews. |
| **Publishing history** | Every publish, and a way to bring an earlier version back. |

### Locations

- **Current location** is the one the website names first everywhere: the
  announcement bar, the footer, the booking page, the search-result title,
  and any sentence that uses `{current location}`. Only a location that is
  switched on can be chosen.
- **Adding a location does not make it current.** Choose it as current
  yourself if you have moved.
- **Switch a location off** to stop the website mentioning it, without
  deleting it. If you switch every location off, the website says you are
  between studios and names no town.
- Each location can have a short description and an instruction or notice
  (parking, "text when you arrive"). Both show under the town on the booking
  page.
- The box **How the website will read** shows the announcement bar's sentence
  before you save.

### Words that fill themselves in

Write these in any text and the website fills them in, so a sentence never goes
out of date when you change location:

| Write | Shows (today) |
| --- | --- |
| `{current location}` | Towson, MD |
| `{other locations}` | Laurel, MD |
| `{all locations}` | Towson and Laurel, MD |

The service booking pages also understand `{service}` (the service's name) and
`{finish}` (the finish the client chose), and the booking steps on a
collection page (Website content, Gallery, "Booking on a collection page")
understand `{style}` (the collection's name). The step for a look's Square
add-on also understands `{add on}`: each collection has a "Square add-on for
this look" (Signature Bob ships with Bob cut, spelled as in Square), and a
look with one gets that extra step; leave it empty for none. Under each text
that uses one, the dashboard shows **Reads as:** with them filled in. Anything else in curly
brackets is refused when you save, so a typo cannot reach the website.

### Prices and Square

**Square Appointments takes the bookings** and shows its own names, prices
and lengths in the scheduler. The dashboard does not change Square. When you
change a service's name, price, length or whether it is offered, the review
before publishing marks it **Change this in Square Appointments too**: make the
same change in your Square dashboard so clients see the same thing in both
places. Keep each service's name the same as in Square, because the booking
pages tell clients which line to tap.

Taking a service off the menu removes it from the booking page's menu; its own
booking page stays, and says it is not on the menu at the moment.

### Reviews and the draft notices

- The site launched with three **sample** reviews and a notice saying so. Use
  real clients' words only, with their permission. The notice cannot be
  switched off while any of the three samples is still on the list.
- The FAQ answers carry a **draft notice** until you switch it off. Switch it
  off only once every answer is a policy you stand by.

### Mistakes and second thoughts

- **Cancel** throws away what you typed since you last saved (it asks first).
- **Undo saved changes** puts a section back to exactly what is on the website.
- **Publishing history → Copy into my changes** brings an earlier version back
  as saved changes, to review and publish again. Nothing on the website changes
  until you publish.
- If you edit the same section on two devices, the second save is stopped
  with *"This was changed on another device or in another tab"* rather than
  quietly overwriting the first. Tap **Load the latest version** and make
  your change again.
- Leaving the page with unsaved changes asks first.

---

## How it works

### Where things are stored

| What | Where |
| --- | --- |
| Saved, unpublished changes | Table **`site_content_drafts`** (0011): one row per section, only the owner can read or write it |
| Everything published | Table **`site_content_releases`** (0011): one row per publish, never edited or deleted; exactly one is current |
| Update requests sent to Cloudflare | `private.site_content_rebuilds` (0011), in a schema the API does not serve |
| The words the site shipped with, and every field's shape | `lib/cms/defaults.ts` |
| The dashboard's forms: labels, help, limits | `lib/cms/admin-schema.ts` |

### How the public site gets the words

The site is a static export on Cloudflare Pages: every page is written when the
site is built, and there is no server. So:

1. **At each build**, `next.config.ts` asks Supabase for the current release,
   once, with the public key (read-only), and hands it to every page as
   `CBN_SITE_CONTENT`. It uses Node's own HTTP client rather than `fetch()`,
   for the reason in `lib/site-photos-server.ts` (Next's fetch cache can serve
   an older answer to a later build).
2. `lib/cms/published.ts` lays the release over `lib/cms/defaults.ts`
   (`lib/cms/model.ts`): any missing or invalid value falls back to the
   original wording, links must be `https`/`http` addresses or the site's own
   pages, numbers must be in range, and the location placeholders are filled
   in. Whatever is published, every page gets content of the right shape.
3. `lib/content.ts`, `lib/taxonomy.ts`, `lib/collections.ts` and
   `lib/images.ts` hand the result to the pages under the names they have
   always used, so the components did not change shape.

The release is written into the HTML **and** the JavaScript, so a page never
shows one wording and then swaps to another, search engines and link previews
see the published words, and nothing on a page waits for the database.

**The trade-off:** a published change reaches the website when the site has
been rebuilt, not the moment it is saved. Publishing asks Cloudflare for that
rebuild straight away through a deploy hook (step 2 below), and the dashboard
watches for it. Without the hook, a release waits for the next deployment
(any push to `main`, or **Retry deployment** in Cloudflare).

**How "Live on the website" is checked.** Every build writes
`/content-version.json` (`app/content-version.json/route.ts`), saying which
release it carries. `public/_headers` stops it being cached. The dashboard
reads it from the site itself and says **Live** only when it names the
current release (`lib/cms/phase.ts`).

**When Supabase does not answer.** If Supabase is configured but the build
cannot read the release, **the build fails** rather than publish words Nat may
have replaced; Cloudflare keeps the last deployment live. Until 0011 has run,
the build log says *"Supabase does not have migration 0011 yet"* and the site is
built from the original words. With no Supabase at all (a clean clone), the
same. `next dev` only warns.

Photos are different: the browser refreshes them as each page opens
(`docs/photo-manager.md`), so a photo change shows straight away.

### Who can do what

| | Visitor | Signed-in customer | Nat |
| --- | --- | --- | --- |
| Read the published words | yes | yes | yes |
| Read earlier releases or saved drafts | no | no | yes |
| Save, undo, publish, ask for an update | **no** | **no** | yes |

- Enforced in Postgres: row level security on both tables, plus functions that
  check `public.is_admin()` themselves (the admin role **and** a sign-in that
  still exists, so logging out ends access at once). No email address appears
  in any rule. The dashboard hiding a button decides nothing.
- `anon` has `SELECT` on `site_content_releases` and nothing else; its policy
  only shows the current row. Nobody, not even the owner, can write a release
  directly: only `publish_site_content()` does, after checking `is_admin()`.
- Publishing refuses to publish over a release the dashboard has not seen
  (another device published in the meantime), and refuses when there is
  nothing to publish.
- The deploy hook lives only in Vault (`cloudflare_pages_deploy_hook`, shared
  with the photo manager's 0008). A customer's refused publish changes no rows
  and sends nothing.
- The browser only ever holds the project URL and the anon key. No service
  role key is used anywhere; `node scripts/check-bundle-secrets.mjs` checks a
  build.

### Tests

- `npm test`: the content model, the dashboard's map of every field (it fails
  if a word on the site has no field, or a field has no word), its validation,
  the review list and the Website card's states.
- `supabase/tests/content-manager.mjs`: 56 checks against a local Supabase, as
  a visitor, a customer, the owner and a logged-out token, including a real
  publish through a stand-in deploy hook (`supabase/tests/README.md`).
- `supabase/tests/owner-only.mjs` still passes (135 checks) with 0011 applied.
- On 2026-10-09 the dashboard was also driven end to end in Chrome against a
  local Supabase and a local build (95 checks): signing in, editing and saving
  each kind of field, validation, Cancel, the unsaved-changes prompt, the two-
  device conflict, review and publish, *Publication pending* until a rebuild,
  *Publishing…* to *Live* with a stand-in deploy hook, the rebuilt pages
  showing the new current location, prices and FAQ wording, drafts never
  public, a customer refused, the photo manager unchanged, and no sideways
  scrolling at 320 and 390 pixels.

---

## One-time setup (for the developer)

### 1. Run the migration

Supabase dashboard → **SQL Editor**: paste
`supabase/migrations/0011_website_content.sql` and run it. It needs 0006, and
nothing else from 0007 onwards. It is safe to run again and changes nothing a
visitor sees. Check it took:

```sql
select to_regclass('public.site_content_releases') is not null;  -- true
```

Nothing needs redeploying afterwards: until Nat publishes, the site is built
from the same words it has now.

### 2. Automatic website updates (recommended)

The same Cloudflare deploy hook as the photo manager's automatic rebuilds
(`docs/photo-manager.md`, step 7). If that is already set up, there is nothing
to do: publishing uses the same Vault secret. Otherwise:

1. **Cloudflare** → Workers & Pages → `wig-install-site` → Settings → Builds
   → **Deploy hooks** → Add deploy hook, branch `main`. Copy the URL.
2. **Supabase SQL Editor** (paste the URL in place of the example):

   ```sql
   select vault.create_secret(
     'https://api.cloudflare.com/client/v4/pages/webhooks/deploy_hooks/...',
     'cloudflare_pages_deploy_hook',
     'Rebuilds crownedbynat.com when Nat publishes or changes photos'
   );
   ```

0011 enables `pg_net`, which sends the request. 0008 (the photo manager's
rebuild schedule) is not required for publishing. Check after a publish:

```sql
select release_id, requested_at, outcome from private.site_content_rebuilds order by id desc limit 3;
select status_code, created from net._http_response order by created desc limit 3;
```

### 3. Check it end to end

| # | Do this | Expect |
| --- | --- | --- |
| 1 | Sign in at `/admin/login/` | The studio dashboard, Overview, **Showing the original words** |
| 2 | **Locations**: choose Laurel as current, **Save changes** | *Saved.* and **Saved, not published**; the website unchanged |
| 3 | **Review & publish** → **Publish to the website** | The review lists *Current location: Towson, MD → Laurel, MD*; then **Publishing…** (or **Publication pending** without step 2) |
| 4 | Wait for the Cloudflare build | **Live on the website**; the announcement bar, footer and `/book/` name Laurel first |
| 5 | Choose Towson again, save and publish | Back as it was |
| 6 | Open `/admin/` in a private window | Sent to `/admin/login/` |

---

## Words that are still in code

Everything a visitor reads on the public pages is in the dashboard, except:

- **Screen-reader labels of controls**: the slideshow's arrows, dots and pause
  button, the photo viewer's close and arrows, "Skip to content", "Pause the
  announcements", and phrases such as "Step 2 of 4". They describe controls,
  not the business.
- **The "8 looks" count** on collection cards and pages (the number is
  automatic).
- **Lace detail names** on gallery photos (Melted Hairline, HD Lace and so on),
  which are fixed choices in the photo manager.
- **Meet Nat's portrait**: the photo itself is a file in `public/images/`, not
  in the photo manager, and its description ("Nat, founder of Crowned by Nat")
  is in `components/owner.tsx`.
- **Search keywords and the structured-data blurb**: the `keywords` list in
  `app/layout.tsx` and the one-line description in the homepage's
  LocalBusiness data (`app/page.tsx`). Search engines largely ignore both.
- **Pages nobody can reach**: the customer account and booking-form screens
  (`/login/`, `/signup/`, `/account/`, `components/booking/`), switched off
  since Square took over booking; their words stay in `lib/content.ts`.
- **What only Square shows**: everything inside the Square scheduler.
- **Structure, deliberately**: which heading each service is filed under,
  which finishes each install takes, page addresses, the six collections and
  their order, the slideshow's photo crops and which collection each slide
  links to. Changing these is a developer job.

## For developers

- **Adding a field**: add it, with its current wording, to
  `DEFAULT_CONTENT` in `lib/cms/defaults.ts`; give it a form field in
  `lib/cms/admin-schema.ts`; read it where it shows (through `lib/content.ts`
  or `SITE` from `lib/cms/published.ts`). `npm test` fails until the two
  files agree. If it may never be empty, add its path to `REQUIRED_TEXT`; a
  test checks that matches the form.
- **Never rename a field's key**: the database stores published words under
  it, and the old value would silently stop being used. Add a new key instead.
- **Building with a given release** (tests): set `CBN_SITE_CONTENT_SNAPSHOT`
  to `{"release":1,"publishedAt":"...","content":{...}}` and `next.config.ts`
  uses it instead of asking Supabase. Never set it in Cloudflare.
- **Restoring an old release by hand** is never needed: use Publishing history.

## Troubleshooting

**"One setup step is still to be done."** 0011 has not been run (step 1).

**The card stays on "Publication pending".** Automatic updates are not set up
(step 2), or were set up after that publish: tap **Update the website now**. Or
redeploy in Cloudflare (**Deployments → Retry deployment**).

**"Publication failed: Cloudflare refused the request … (HTTP 404)".** The deploy
hook was deleted in Cloudflare. Make a new one and replace the Vault secret
(`delete from vault.secrets where name = 'cloudflare_pages_deploy_hook';` then
step 2).

**"The website has not updated within 20 minutes."** The Cloudflare build
probably failed. Look at the deployment's log: *"Could not read the website's
published words from Supabase"* means Supabase did not answer (a paused free
project, for one); retry the deployment once it does.

**"This was changed on another device or in another tab."** Tap **Load the
latest version**, check it, and make your change again.

**A change is live but a search result or link preview still shows the old
words.** Search engines and apps cache what they have read; they catch up on
their own schedule.
