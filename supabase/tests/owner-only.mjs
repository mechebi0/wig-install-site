// Owner-only photo management: the authorization tests.
//
// Drives a REAL local Supabase (auth, storage, Postgres with every migration
// applied) the way an attacker would: through the public API, with the public
// key, as a visitor, as a signed-in customer, and as a stranger who used the
// owner's sign-in page. After every attack the database and the bucket are
// compared with a snapshot taken before it, so "the request returned an error"
// is never mistaken for "nothing changed".
//
// It REFUSES to run against anything but localhost: it creates and deletes
// accounts and photographs. See supabase/tests/README.md for how to start the
// stack and which environment variables to set.
import { createHmac } from "node:crypto";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  describeSendError,
  describeVerifyError,
} from "../../lib/auth/owner-errors.ts";

const API = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
const JWT_SECRET = process.env.SUPABASE_JWT_SECRET ?? "";
const DB = process.env.SUPABASE_DB_CONTAINER ?? "";
const MAIL = (process.env.MAILPIT_URL ?? "").replace(/\/$/, "");
const MIGRATIONS = process.env.MIGRATIONS_DIR ?? "";

if (!API || !ANON || !SERVICE || !DB || !MAIL) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_DB_CONTAINER and MAILPIT_URL (supabase/tests/README.md).");
  process.exit(2);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API)) {
  console.error(`Refusing to run against ${API}: this suite creates and deletes data and is for a LOCAL stack only.`);
  process.exit(2);
}

const BUCKET = "website-photos";
const OWNER = "crownedbynattt@gmail.com";
const ZERO = "00000000-0000-0000-0000-000000000000";

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "  -- " + detail : ""}`);
}
const note = (text) => console.log(`NOTE ${text}`);
const section = (title) => console.log(`\n== ${title}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function memoryStorage() {
  const map = new Map();
  return {
    getItem: (k) => map.get(k) ?? null,
    setItem: (k, v) => map.set(k, v),
    removeItem: (k) => map.delete(k),
  };
}
const client = () =>
  createClient(API, ANON, {
    auth: { storage: memoryStorage(), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: "pkce" },
  });
/** A client that only sends a fixed bearer token, like a copied or stale one. */
const withToken = (token) =>
  createClient(API, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
const service = createClient(API, SERVICE, { auth: { persistSession: false } });

// stderr is piped, not inherited: a refusal the tests EXPECT (an unknown
// account passed to promote_studio_owner) is read from the thrown error, and
// must not scroll past as if something had gone wrong.
const exec = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, MSYS_NO_PATHCONV: "1" } };
function sql(statement) {
  return execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], exec).trim();
}
function runFile(path) {
  const target = `/tmp/${path.split(/[\\/]/).pop()}`;
  execFileSync("docker", ["cp", path, `${DB}:${target}`], exec);
  execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", target], exec);
}

async function clearMail() {
  await fetch(`${MAIL}/api/v1/messages`, { method: "DELETE" });
}
async function latestCode(to) {
  for (let i = 0; i < 30; i++) {
    const body = await (await fetch(`${MAIL}/api/v1/search?query=${encodeURIComponent("to:" + to)}`)).json();
    if (body.messages?.length) {
      const msg = await (await fetch(`${MAIL}/api/v1/message/${body.messages[0].ID}`)).json();
      const code = (msg.Text || "").match(/\b(\d{6})\b/)?.[1];
      if (code) return code;
    }
    await sleep(400);
  }
  return null;
}
async function otpSignIn(email) {
  await clearMail();
  const c = client();
  // Two codes for one address inside the project's resend window are refused
  // (the very rule the sign-in page's countdown follows), so wait it out.
  let sent;
  for (let attempt = 0; attempt < 4; attempt++) {
    sent = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (!sent.error || sent.error.code !== "over_email_send_rate_limit") break;
    await sleep(1300);
    await clearMail();
  }
  if (sent.error) throw new Error(`otp send (${email}): ${sent.error.message}`);
  const code = await latestCode(email);
  const verified = await c.auth.verifyOtp({ email, token: code, type: "email" });
  if (verified.error) throw new Error(`otp verify (${email}): ${verified.error.message}`);
  return c;
}

const webp = (bytes = 2048) => new Blob([new Uint8Array(bytes)], { type: "image/webp" });
const photoRow = (src, extra = {}) => ({ src, alt: "A long body wave install with a side part", width: 1200, height: 1600, active: true, display_order: 0, ...extra });

// --- snapshots: what a successful attack would have changed ----------------
const TABLES = ["gallery_items", "gallery_categories", "gallery_item_categories", "site_photo_slots", "business_settings", "reviews", "profiles"];
function snapshot() {
  const parts = TABLES.map((t) => `${t}:${sql(`select coalesce(md5(string_agg(x::text, '|' order by x::text)), 'empty') from public.${t} x;`)}`);
  parts.push(`storage:${sql(`select coalesce(md5(string_agg(name || coalesce(updated_at::text, ''), '|' order by name)), 'empty') from storage.objects where bucket_id = '${BUCKET}';`)}`);
  return parts.join(" ");
}
function changedTables(before, after) {
  const a = Object.fromEntries(before.split(" ").map((p) => p.split(":")));
  const b = Object.fromEntries(after.split(" ").map((p) => p.split(":")));
  return Object.keys(a).filter((k) => a[k] !== b[k]);
}

// ---------------------------------------------------------------- the attack
// Every write a photo manager could make, attempted by `c`, with VALID rows so
// that a refusal can only come from a policy or a grant, never a constraint.
async function attackAsEveryWriter(c, who, target) {
  const before = snapshot();
  const evil = `evil-${who}-${Date.now()}`;
  const attempts = {
    "insert photo": () => c.from("gallery_items").insert(photoRow(`gallery/${evil}.webp`)),
    "insert collection": () => c.from("gallery_categories").insert({ slug: evil, title: "Evil" }),
    "insert setting": () => c.from("business_settings").insert({ key: evil, value: { x: 1 } }),
    "upsert a place": () => c.from("site_photo_slots").upsert({ slot: "home-1", item_id: null }),
    "update every photo": () => c.from("gallery_items").update({ alt: "Defaced by an attacker here", active: false }).neq("id", ZERO),
    "update one photo's file": () => c.from("gallery_items").update({ src: "gallery/elsewhere.webp" }).eq("id", target.publishedId),
    // A value the CHECK accepts (0010), so only a policy can stop it.
    "update booking pages": () => c.from("gallery_items").update({ booking_services: ["wig-touch-up"] }).neq("id", ZERO),
    "update collections": () => c.from("gallery_categories").update({ title: "Defaced", hero_item_id: null }).neq("id", ZERO),
    "update places": () => c.from("site_photo_slots").update({ item_id: null }).neq("slot", ""),
    "update settings": () => c.from("business_settings").update({ value: { defaced: true } }).neq("key", ""),
    "update reviews": () => c.from("reviews").update({ published: false }).neq("id", ZERO),
    "delete photos": () => c.from("gallery_items").delete().neq("id", ZERO),
    "delete collections": () => c.from("gallery_categories").delete().neq("id", ZERO),
    "delete collection links": () => c.from("gallery_item_categories").delete().neq("item_id", ZERO),
    "delete places": () => c.from("site_photo_slots").delete().neq("slot", ""),
    "delete settings": () => c.from("business_settings").delete().neq("key", ""),
    "rpc set collections": () => c.rpc("set_gallery_item_categories", { p_item_id: target.publishedId, p_slugs: [] }),
    "rpc reorder": () => c.rpc("reorder_gallery_items", { p_ids: [target.publishedId] }),
    "rpc promote owner": () => c.rpc("promote_studio_owner", { p_email: "someone@example.test" }),
    "upload into gallery/": () => c.storage.from(BUCKET).upload(`gallery/${evil}.webp`, webp(), { contentType: "image/webp" }),
    "upload at the bucket root": () => c.storage.from(BUCKET).upload(`${evil}.webp`, webp(), { contentType: "image/webp" }),
    "overwrite a live file": () => c.storage.from(BUCKET).upload(target.publishedKey, webp(64), { contentType: "image/webp", upsert: true }),
    "update a live file": () => c.storage.from(BUCKET).update(target.publishedKey, webp(64), { contentType: "image/webp" }),
    "remove a live file": () => c.storage.from(BUCKET).remove([target.publishedKey, target.hiddenKey]),
    "move a live file": () => c.storage.from(BUCKET).move(target.publishedKey, `gallery/${evil}-moved.webp`),
    "copy a live file": () => c.storage.from(BUCKET).copy(target.publishedKey, `gallery/${evil}-copy.webp`),
    "signed upload URL": () => c.storage.from(BUCKET).createSignedUploadUrl(`gallery/${evil}-signed.webp`),
  };
  const slipped = [];
  for (const run of Object.values(attempts)) {
    try {
      await run();
    } catch {
      /* a thrown error is a refusal too */
    }
  }
  const changed = changedTables(before, snapshot());
  check(`${who}: all ${Object.keys(attempts).length} write attempts changed nothing in the database or the bucket`, changed.length === 0, changed.length ? `CHANGED: ${changed.join(", ")}` : "");
  // And the same attempts must also have been REFUSED outright wherever the
  // API can say so, so a silent no-op is distinguishable from a rejection.
  for (const [name, run] of Object.entries(attempts)) {
    if (!/^(insert|upload|rpc|signed|copy|move|overwrite|update a live)/.test(name)) continue;
    let error = null;
    try {
      const result = await run();
      error = result?.error ?? null;
    } catch (e) {
      error = e;
    }
    if (!error) slipped.push(name);
  }
  check(`${who}: inserts, uploads, copies, moves and RPCs are refused with an error, not ignored`, slipped.length === 0, slipped.length ? `NOT REFUSED: ${slipped.join(", ")}` : "");
  const after = changedTables(before, snapshot());
  check(`${who}: still nothing changed after the second pass`, after.length === 0, after.join(", "));
}

// ==========================================================================
section("0. Clean slate");
const keyRole = (jwt) => {
  try {
    return JSON.parse(Buffer.from(jwt.split(".")[1], "base64url").toString()).role;
  } catch {
    return "(not a JWT)";
  }
};
check("the key the website would ship is the anon key, not a privileged one", ["anon", "(not a JWT)"].includes(keyRole(ANON)) && !/sb_secret_/.test(ANON), keyRole(ANON));
{
  for (const folder of ["gallery", "other", "elsewhere", ""]) {
    const { data } = await service.storage.from(BUCKET).list(folder, { limit: 1000 });
    const names = (data ?? []).filter((o) => o.id && /^(fixture|evil|t-)/.test(o.name)).map((o) => (folder ? `${folder}/${o.name}` : o.name));
    if (names.length) await service.storage.from(BUCKET).remove(names);
  }
  sql(`delete from public.gallery_items where src like 'gallery/fixture-%' or src like 'gallery/t-%' or src like 'gallery/evil-%';`);
  sql(`delete from auth.users where email like '%@example.test' or email in ('${OWNER}', 'crownedbynattt+evil@gmail.com', 'crowned.bynattt@gmail.com');`);
  check("test accounts cleared", sql(`select count(*) from auth.users where email like '%@example.test' or email = '${OWNER}';`) === "0");
}
const seededVisible = Number(sql(`select count(*) from public.gallery_items where active;`));
note(`${seededVisible} published photographs are in the database before the tests start (the launch set)`);

// ==========================================================================
section("1. The owner account: normalised address, promoted only by hand");
// Typed in capitals on a phone keyboard. GoTrue must treat it as the one
// account, and the address the site compares against is lower case.
let owner = await otpSignIn("CrownedByNattt@Gmail.com");
check("owner signs in with an emailed code, address typed in mixed case", !!(await owner.auth.getSession()).data.session);
check("exactly one account exists, stored lower case", sql(`select count(*) from auth.users where lower(email) = '${OWNER}';`) === "1" && sql(`select email from auth.users where lower(email) = '${OWNER}';`) === OWNER);
{
  const { data } = await owner.rpc("is_admin");
  check("signing in with the owner's address does NOT make anyone admin", data === false, `is_admin=${data}`);
  const up = await owner.storage.from(BUCKET).upload(`gallery/t-pre-${Date.now()}.webp`, webp(), { contentType: "image/webp" });
  check("an owner-address account that is not promoted cannot upload", !!up.error, up.error?.message ?? "upload succeeded");
  const attempt = await owner.from("profiles").update({ role: "admin" }).eq("email", OWNER).select();
  check("it cannot promote itself either", !!attempt.error || (attempt.data ?? []).length === 0 || sql(`select role from public.profiles where email = '${OWNER}';`) !== "admin", attempt.error?.message ?? "");
  check("the owner's profile is still a customer", sql(`select role from public.profiles where email = '${OWNER}';`) === "customer");
}
const preToken = (await owner.auth.getSession()).data.session.access_token;
{
  const out = sql(`select public.promote_studio_owner('${OWNER}');`);
  check("promote_studio_owner() works from the SQL editor", out.includes("is now the studio owner"), out);
  check("exactly one admin exists afterwards, and it is the owner", sql(`select string_agg(email, ',') from public.profiles where role = 'admin';`) === OWNER);
  const { data } = await withToken(preToken).rpc("is_admin");
  check("a sign-in from before promotion carries no admin rights", data === false, `is_admin=${data}`);
}
for (const bad of ["someone-else@example.test", " ", "no-such-account@example.test"]) {
  let message = "";
  try {
    sql(`select public.promote_studio_owner('${bad}');`);
  } catch (e) {
    message = String(e.stderr || e.message);
  }
  check(`promote_studio_owner('${bad.trim() || "blank"}') refuses an unknown account`, /no account for/i.test(message), message.slice(0, 120));
}
owner = await otpSignIn(OWNER);
{
  const { data } = await owner.rpc("is_admin");
  check("owner IS admin after signing in again", data === true, `is_admin=${data}`);
}
const ownerToken = (await owner.auth.getSession()).data.session.access_token;
const ownerId = (await owner.auth.getUser()).data.user.id;

// ==========================================================================
section("2. Fixtures, made by the owner through the same API the manager uses");
const stem = `gallery/fixture-${crypto.randomUUID()}`;
const publishedKey = `${stem}-live.webp`;
const hiddenKey = `${stem}-hidden.webp`;
for (const key of [publishedKey, hiddenKey]) {
  const up = await owner.storage.from(BUCKET).upload(key, webp(), { contentType: "image/webp", upsert: false });
  check(`owner uploads ${key.slice(-11)}`, !up.error, up.error?.message ?? "");
}
// Both on the Closure Install booking page (0010), so the visitor checks can
// show that a hidden photograph never reaches one.
const published = await owner.from("gallery_items").insert(photoRow(publishedKey, { title: "Fixture live", booking_services: ["closure-install"] })).select("id").single();
const hidden = await owner.from("gallery_items").insert(photoRow(hiddenKey, { title: "Fixture hidden", active: false, booking_services: ["closure-install"] })).select("id").single();
check("owner inserts a published and a hidden photograph", !published.error && !hidden.error, published.error?.message ?? hidden.error?.message ?? "");
const target = { publishedId: published.data?.id, hiddenId: hidden.data?.id, publishedKey, hiddenKey };
{
  const slot = await owner.from("site_photo_slots").upsert({ slot: "sign-in", item_id: target.hiddenId }).select();
  check("owner can fill a place with a photograph", !slot.error, slot.error?.message ?? "");
  const restore = await owner.from("site_photo_slots").upsert({ slot: "sign-in", item_id: null });
  check("and empty it again", !restore.error, restore.error?.message ?? "");
}

// ==========================================================================
section("3. A visitor with only the public key");
const anon = client();
await attackAsEveryWriter(anon, "visitor", target);
{
  const { data } = await anon.from("gallery_items").select("id, active").in("id", [target.publishedId, target.hiddenId]);
  check("visitor sees the published photograph and NOT the hidden one", data?.length === 1 && data[0].id === target.publishedId, `rows=${data?.length}`);
  const all = await anon.from("gallery_items").select("id, active");
  check("visitor sees only published rows in the whole table", (all.data ?? []).length > 0 && (all.data ?? []).every((r) => r.active === true), `rows=${all.data?.length}`);
  // The query a booking page's photographs come from, asked directly.
  const closure = await anon.from("gallery_items").select("id").contains("booking_services", ["closure-install"]);
  check("a booking page gets the published photograph and never the hidden one", !closure.error && (closure.data ?? []).some((r) => r.id === target.publishedId) && !(closure.data ?? []).some((r) => r.id === target.hiddenId), closure.error?.message ?? `rows=${closure.data?.length}`);
  const slots = await anon.from("site_photo_slots").select("slot");
  check("visitor can read the photo places", !slots.error && (slots.data ?? []).length > 0, slots.error?.message ?? `rows=${slots.data?.length}`);
  const cats = await anon.from("gallery_categories").select("slug");
  check("visitor can read the collections", !cats.error && (cats.data ?? []).length > 0);
  // What the rest of the public site reads, which migration 0009 must leave alone.
  for (const table of ["locations", "services", "reviews", "business_settings"]) {
    const r = await anon.from(table).select("*").limit(1);
    check(`visitor can still read ${table} (the public pages use it)`, !r.error, r.error?.message ?? "");
  }
  const slotsRpc = await anon.rpc("booked_slots", { p_location_id: ZERO, p_date: "2030-01-01" });
  check("visitor can still call booked_slots() (runs as its owner, not through table grants)", !slotsRpc.error, slotsRpc.error?.message ?? "");
  for (const table of ["profiles", "appointments"]) {
    const r = await anon.from(table).select("*").limit(1);
    check(`visitor cannot read ${table}`, !!r.error || (r.data ?? []).length === 0, r.error?.message ?? `rows=${r.data?.length}`);
  }
  const listing = await anon.storage.from(BUCKET).list("gallery");
  check("visitor cannot list the bucket (hidden photographs stay unlisted)", !!listing.error || (listing.data ?? []).length === 0, `listed=${listing.data?.length}`);
  const pub = await fetch(`${API}/storage/v1/object/public/${BUCKET}/${publishedKey}`);
  check("a published photograph's file loads by its public URL", pub.status === 200, `status=${pub.status}`);
  const hid = await fetch(`${API}/storage/v1/object/public/${BUCKET}/${hiddenKey}`);
  note(`a HIDDEN photograph's file answers ${hid.status} at its exact URL: the bucket is public by design, hiding unpublishes the row, and the file name is an unguessable UUID that nothing public lists`);
  for (const schema of ["private", "auth", "storage"]) {
    const r = await fetch(`${API}/rest/v1/objects?limit=1`, { headers: { apikey: ANON, "Accept-Profile": schema } });
    check(`the public key cannot read the ${schema} schema through the REST API`, r.status >= 400, `status=${r.status}`);
  }
  const rebuild = await anon.schema("private").from("site_rebuild").select("*");
  check("the rebuild bookkeeping (0008) is unreachable", !!rebuild.error, rebuild.error?.message ?? "readable");
  const { data: adminFlag } = await anon.rpc("is_admin");
  check("is_admin() answers false to a visitor", adminFlag === false, `is_admin=${adminFlag}`);
}
// The same, without the client library: raw HTTP with nothing but the public key.
{
  const before = snapshot();
  const headers = { apikey: ANON, "Content-Type": "application/json", Prefer: "return=representation" };
  const raw = [
    ["POST", "gallery_items", photoRow("gallery/evil-raw.webp")],
    ["PATCH", "gallery_items?id=neq." + ZERO, { active: false }],
    ["DELETE", "gallery_items?id=neq." + ZERO, undefined],
    ["POST", "site_photo_slots", { slot: "book", item_id: null }],
    ["PATCH", "gallery_categories?id=neq." + ZERO, { title: "Defaced" }],
    ["POST", "rpc/reorder_gallery_items", { p_ids: [] }],
  ];
  const statuses = [];
  for (const [method, path, body] of raw) {
    const r = await fetch(`${API}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    // 4xx is a refusal; a 2xx whose body is an empty list is a filtered no-op.
    statuses.push(`${method} ${path.split("?")[0]} -> ${r.status}${r.ok ? " " + text.slice(0, 20) : ""}`);
  }
  const rawStorage = await fetch(`${API}/storage/v1/object/${BUCKET}/gallery/evil-raw.webp`, { method: "POST", headers: { apikey: ANON, "Content-Type": "image/webp" }, body: new Uint8Array(64) });
  statuses.push(`POST storage upload -> ${rawStorage.status}`);
  const rawDelete = await fetch(`${API}/storage/v1/object/${BUCKET}/${publishedKey}`, { method: "DELETE", headers: { apikey: ANON } });
  statuses.push(`DELETE storage object -> ${rawDelete.status}`);
  check("raw HTTP with only the public key changes nothing", changedTables(before, snapshot()).length === 0, statuses.join(" | "));
  check("raw HTTP storage writes with only the public key are refused", rawStorage.status >= 400 && rawDelete.status >= 400 || changedTables(before, snapshot()).length === 0, statuses.slice(-2).join(" | "));
}

// ==========================================================================
section("4. Signed-in accounts that are not the owner");
const customer = client();
{
  await customer.auth.signUp({ email: "customer@example.test", password: "customer-pass-123" });
  sql(`update auth.users set email_confirmed_at = now() where email = 'customer@example.test';`);
  const s = await customer.auth.signInWithPassword({ email: "customer@example.test", password: "customer-pass-123" });
  check("setup: a customer account signs in", !s.error, s.error?.message ?? "");
}
// A stranger who typed a code on the owner's page for THEIR OWN address (the
// client-side owner check is a courtesy; calling Supabase directly skips it).
const stranger = await otpSignIn("stranger@example.test");
check("setup: a stranger can create an account through the OTP endpoint directly", !!(await stranger.auth.getSession()).data.session);
const lookalikes = [];
for (const address of ["crownedbynattt+evil@gmail.com", "crowned.bynattt@gmail.com"]) {
  lookalikes.push([address, await otpSignIn(address)]);
}
const nonOwners = [["customer", customer], ["stranger", stranger], ...lookalikes.map(([a, c]) => [`look-alike ${a}`, c])];
for (const [who, c] of nonOwners) {
  const { data } = await c.rpc("is_admin");
  check(`${who}: is_admin() is false`, data === false, `is_admin=${data}`);
  await attackAsEveryWriter(c, who, target);
  const hiddenRows = await c.from("gallery_items").select("id").eq("id", target.hiddenId);
  check(`${who}: cannot see the hidden photograph`, (hiddenRows.data ?? []).length === 0);
  const listing = await c.storage.from(BUCKET).list("gallery");
  check(`${who}: cannot list the bucket`, !!listing.error || (listing.data ?? []).length === 0, `listed=${listing.data?.length}`);
}
{
  // Privilege escalation, every route a signed-in account has to its own row.
  const before = sql(`select string_agg(role || ':' || email, ',' order by email) from public.profiles;`);
  const own = (await stranger.auth.getUser()).data.user.id;
  const results = {
    "update own role": await stranger.from("profiles").update({ role: "admin" }).eq("id", own),
    "upsert own role": await stranger.from("profiles").upsert({ id: own, email: "stranger@example.test", role: "admin" }),
    "insert a second admin profile": await stranger.from("profiles").insert({ id: crypto.randomUUID(), email: "x@example.test", role: "admin" }),
    "change role of the owner": await stranger.from("profiles").update({ role: "customer" }).eq("id", ownerId),
    "set role in user metadata": await stranger.auth.updateUser({ data: { role: "admin", is_admin: true } }),
  };
  check("a signed-in stranger cannot escalate through profiles or user metadata", sql(`select string_agg(role || ':' || email, ',' order by email) from public.profiles;`) === before && (await stranger.rpc("is_admin")).data === false);
  const refused = Object.entries(results).filter(([, r]) => !r.error).map(([k]) => k);
  note(`escalation attempts the API accepted without error (harmless no-ops, state verified unchanged): ${refused.join(", ") || "none"}`);
  const signup = client();
  await signup.auth.signUp({ email: "signup-admin@example.test", password: "customer-pass-123", options: { data: { role: "admin", full_name: "Admin" } } });
  check("signing up with {role: 'admin'} in the metadata still yields a customer", sql(`select role from public.profiles where email = 'signup-admin@example.test';`) === "customer");
  const swap = await stranger.auth.updateUser({ email: OWNER });
  check("asking to change a stranger's email to the owner's address grants nothing", (await stranger.rpc("is_admin")).data === false && sql(`select role from public.profiles where id = '${own}';`) === "customer", swap.error?.message ?? "pending confirmation");
}

// ==========================================================================
section("5. The owner can do all of it");
{
  const cats = await owner.rpc("set_gallery_item_categories", { p_item_id: target.publishedId, p_slugs: ["body-wave-glam", "natural-lace"] });
  check("owner sets collections", !cats.error, cats.error?.message ?? "");
  const unknown = await owner.rpc("set_gallery_item_categories", { p_item_id: target.publishedId, p_slugs: ["not-a-collection"] });
  check("an unknown collection is refused, even for the owner", !!unknown.error);
  const edit = await owner.from("gallery_items").update({ title: "Edited", alt: "A freshly edited description here" }).eq("id", target.publishedId).select("title");
  check("owner edits a photograph", !edit.error && edit.data?.[0]?.title === "Edited", edit.error?.message ?? "");
  const pages = await owner.from("gallery_items").update({ booking_services: ["frontal-reinstall", "closure-reinstall"] }).eq("id", target.publishedId).select("booking_services");
  check("owner chooses a photograph's booking pages", !pages.error && JSON.stringify(pages.data?.[0]?.booking_services) === JSON.stringify(["frontal-reinstall", "closure-reinstall"]), pages.error?.message ?? "");
  const notAService = await owner.from("gallery_items").update({ booking_services: ["frontal-curls"] }).eq("id", target.publishedId);
  check("a booking page that is not a service is refused, even for the owner", !!notAService.error, notAService.error?.message ?? "accepted");
  const hide = await owner.from("gallery_items").update({ active: false }).eq("id", target.publishedId).select("id");
  check("owner hides a photograph", !hide.error && hide.data?.length === 1);
  const gone = await anon.from("gallery_items").select("id").eq("id", target.publishedId);
  check("hiding takes it off the public API at once", (gone.data ?? []).length === 0);
  const show = await owner.from("gallery_items").update({ active: true }).eq("id", target.publishedId).select("id");
  check("owner shows it again", !show.error && show.data?.length === 1);
  const seen = await anon.from("gallery_items").select("id").eq("id", target.publishedId);
  check("and the public sees it again", (seen.data ?? []).length === 1);
  const order = await owner.rpc("reorder_gallery_items", { p_ids: [target.hiddenId, target.publishedId] });
  const orders = sql(`select string_agg(display_order::text, ',' order by display_order) from public.gallery_items where id in ('${target.hiddenId}', '${target.publishedId}');`);
  check("owner reorders", !order.error && orders === "1,2", order.error?.message ?? orders);
  const replace = await owner.storage.from(BUCKET).upload(publishedKey, webp(4096), { contentType: "image/webp", upsert: true });
  check("owner replaces a file in place", !replace.error, replace.error?.message ?? "");
  const place = await owner.from("site_photo_slots").upsert({ slot: "book", item_id: target.publishedId }).select();
  check("owner chooses the photograph for a place", !place.error && place.data?.length === 1, place.error?.message ?? "");
  const seenSlot = await anon.from("site_photo_slots").select("item_id").eq("slot", "book").single();
  check("and the public reads that choice", seenSlot.data?.item_id === target.publishedId);
  const refill = await owner.from("site_photo_slots").upsert({ slot: "book", item_id: null });
  check("owner empties a place again", !refill.error);
  const bad = {
    "a PNG, which the bucket does not allow": owner.storage.from(BUCKET).upload(`gallery/t-${Date.now()}.png`, new Blob([new Uint8Array(64)], { type: "image/png" }), { contentType: "image/png" }),
    "a file over 5 MB": owner.storage.from(BUCKET).upload(`gallery/t-${Date.now()}-big.webp`, webp(5 * 1024 * 1024 + 1), { contentType: "image/webp" }),
    "a path outside gallery/": owner.storage.from(BUCKET).upload(`other/t-${Date.now()}.webp`, webp(), { contentType: "image/webp" }),
  };
  for (const [name, promise] of Object.entries(bad)) {
    check(`the bucket refuses ${name}, even for the owner`, !!(await promise).error);
  }
  const short = await owner.from("gallery_items").insert(photoRow("gallery/t-short.webp", { alt: "short" }));
  check("the database refuses a photograph with no real description, even for the owner", !!short.error);
  const rmFiles = await owner.storage.from(BUCKET).remove([publishedKey, hiddenKey]);
  check("owner removes the files", !rmFiles.error && (rmFiles.data ?? []).length === 2, rmFiles.error?.message ?? `removed=${rmFiles.data?.length}`);
  const rmRows = await owner.from("gallery_items").delete().in("id", [target.publishedId, target.hiddenId]).select("id");
  check("owner deletes the rows", !rmRows.error && rmRows.data?.length === 2, rmRows.error?.message ?? "");
  check("nothing of the fixtures is left behind", sql(`select count(*) from storage.objects where bucket_id='${BUCKET}' and name like '${stem}%';`) === "0" && sql(`select count(*) from public.gallery_items where src like '${stem}%';`) === "0");
  check("the launch photographs were never touched", Number(sql(`select count(*) from public.gallery_items where active;`)) === seededVisible, `before=${seededVisible}`);
}

// ==========================================================================
section("6. Logging out, expired and forged sessions");
{
  // Fresh fixture so each case has something real to try to delete.
  const key = `gallery/fixture-${crypto.randomUUID()}.webp`;
  await owner.storage.from(BUCKET).upload(key, webp(), { contentType: "image/webp" });
  const second = await otpSignIn(OWNER); // a second sign-in, then the first logs out
  const secondToken = (await second.auth.getSession()).data.session.access_token;
  check("a second sign-in for the owner is admin too", (await withToken(secondToken).rpc("is_admin")).data === true);

  await owner.auth.signOut();
  const stale = withToken(ownerToken);
  check("after Log out, the old access token has no admin rights", (await stale.rpc("is_admin")).data === false);
  const up = await stale.storage.from(BUCKET).upload(`gallery/evil-after-logout-${Date.now()}.webp`, webp(), { contentType: "image/webp" });
  check("after Log out, the old token cannot upload", !!up.error, up.error?.message ?? "uploaded");
  const del = await stale.storage.from(BUCKET).remove([key]);
  check("after Log out, the old token cannot delete", sql(`select count(*) from storage.objects where bucket_id='${BUCKET}' and name='${key}';`) === "1", del.error?.message ?? "");
  // signOut() is global by default, which is what the site's Log out calls
  // (lib/auth/session.ts): it ends the owner's sign-in on every device.
  check("Log out ends the owner's OTHER sign-ins too, so a copied token dies with it", (await withToken(secondToken).rpc("is_admin")).data === false);

  const third = await otpSignIn(OWNER);
  const thirdToken = (await third.auth.getSession()).data.session.access_token;
  check("a fresh sign-in after logging out is admin again", (await withToken(thirdToken).rpc("is_admin")).data === true);

  // The session reaching its end while the token is still within its hour.
  sql(`update auth.sessions set not_after = now() - interval '1 minute' where user_id = '${ownerId}';`);
  check("an EXPIRED session (not_after in the past) carries no admin rights", (await withToken(thirdToken).rpc("is_admin")).data === false);
  const expiredWrite = await withToken(thirdToken).from("gallery_items").insert(photoRow("gallery/evil-expired.webp"));
  check("an expired session cannot write", !!expiredWrite.error, expiredWrite.error?.message ?? "inserted");
  const expiredUpload = await withToken(thirdToken).storage.from(BUCKET).upload(`gallery/evil-expired-${Date.now()}.webp`, webp(), { contentType: "image/webp" });
  check("an expired session cannot upload", !!expiredUpload.error, expiredUpload.error?.message ?? "uploaded");
  sql(`update auth.sessions set not_after = null where user_id = '${ownerId}';`);
  check("clearing the expiry restores it (the check reads the session, nothing else)", (await withToken(thirdToken).rpc("is_admin")).data === true);

  // The sessions being revoked, as promote_studio_owner() does.
  sql(`delete from auth.sessions where user_id = '${ownerId}';`);
  check("a REVOKED session (deleted) carries no admin rights", (await withToken(thirdToken).rpc("is_admin")).data === false);

  // A token that is correctly signed but belongs to no live session.
  if (JWT_SECRET) {
    const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
    const head = b64({ alg: "HS256", typ: "JWT" });
    const body = b64({ aud: "authenticated", role: "authenticated", sub: ownerId, email: OWNER, exp: Math.floor(Date.now() / 1000) + 3600 });
    const sig = createHmac("sha256", JWT_SECRET).update(`${head}.${body}`).digest("base64url");
    const forged = withToken(`${head}.${body}.${sig}`);
    check("a validly SIGNED token for the owner with no session_id has no admin rights", (await forged.rpc("is_admin")).data === false);
    const w = await forged.from("gallery_items").insert(photoRow("gallery/evil-forged.webp"));
    check("and cannot write", !!w.error, w.error?.message ?? "inserted");
  } else {
    note("SUPABASE_JWT_SECRET not set: skipped the forged-token check");
  }
  const tampered = withToken(ownerToken.slice(0, -4) + "AAAA");
  check("a token with a broken signature is rejected", (await tampered.rpc("is_admin")).error !== null || (await tampered.rpc("is_admin")).data === false);
  await service.storage.from(BUCKET).remove([key]);
  const fresh = await otpSignIn(OWNER);
  check("the owner can sign in again after all of that", (await fresh.rpc("is_admin")).data === true);
  await fresh.auth.signOut();
}

// ==========================================================================
section("7. What the database itself says (policies and grants)");
{
  const rows = (q) => sql(q).split("\n").filter(Boolean);
  const writers = rows(`select tablename || '|' || policyname || '|' || cmd || '|' || array_to_string(roles, ',') || '|' || coalesce(qual, '') || coalesce(with_check, '') from pg_policies where schemaname = 'public' and tablename in ('gallery_items','gallery_categories','gallery_item_categories','site_photo_slots','business_settings') and cmd <> 'SELECT';`);
  check("every non-SELECT policy on the photo tables calls is_admin()", writers.length > 0 && writers.every((r) => /is_admin\(\)/.test(r)), writers.filter((r) => !/is_admin\(\)/.test(r)).join(" // "));
  check("no write policy on the photo tables names anon or public", writers.every((r) => !/\|(anon|public)(,|\|)/.test(r.split("|").slice(0, 4).join("|") + "|")), "");
  const storagePolicies = rows(`select policyname || '|' || cmd || '|' || coalesce(qual, '') || coalesce(with_check, '') from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'website-photos:%';`);
  check("the bucket has a policy for each of select, insert, update and delete", ["SELECT", "INSERT", "UPDATE", "DELETE"].every((c) => storagePolicies.some((p) => p.split("|")[1] === c)), storagePolicies.map((p) => p.split("|").slice(0, 2).join(" ")).join(", "));
  check("every bucket policy calls is_admin() on its own", storagePolicies.every((p) => /is_admin\(\)/.test(p)));
  check("the bucket write policies are for signed-in users only, never anon", sql(`select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'website-photos:%' and ('anon' = any(roles) or 'public' = any(roles));`) === "0");
  const anonExtra = rows(`select table_name || ' ' || privilege_type from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and privilege_type <> 'SELECT' order by 1;`);
  check("anon holds nothing but SELECT, on any table (needs migration 0009)", anonExtra.length === 0, anonExtra.slice(0, 6).join(", "));
  const authExtra = rows(`select table_name || ' ' || privilege_type from information_schema.role_table_grants where grantee = 'authenticated' and table_schema = 'public' and privilege_type in ('TRUNCATE','REFERENCES','TRIGGER') order by 1;`);
  check("signed-in accounts hold no TRUNCATE, REFERENCES or TRIGGER, which row level security cannot constrain (0009)", authExtra.length === 0, authExtra.slice(0, 6).join(", "));
  const noRls = rows(`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity;`);
  check("row level security is switched on for EVERY table in public", noRls.length === 0, noRls.join(", "));
  check("a visitor holds no privilege at all on profiles or appointments (0009)", sql(`select count(*) from information_schema.role_table_grants where grantee = 'anon' and table_schema = 'public' and table_name in ('profiles','appointments');`) === "0");
  check("the bucket is limited to webp and jpeg under 5 MB", sql(`select allowed_mime_types::text || file_size_limit from storage.buckets where id = '${BUCKET}';`) === "{image/webp,image/jpeg}5242880");
  check("promote_studio_owner() is executable by no API role", sql(`select count(*) from information_schema.routine_privileges where routine_schema = 'public' and routine_name = 'promote_studio_owner' and grantee in ('anon','authenticated','PUBLIC');`) === "0");
  check("the private schema is closed to every API role", sql(`select (has_schema_privilege('anon','private','usage') or has_schema_privilege('authenticated','private','usage'))::text;`) === "false");
  check("only ONE profile can ever be admin here, and it is the owner's", sql(`select count(*) from public.profiles where role = 'admin';`) === "1" && sql(`select email from public.profiles where role = 'admin';`) === OWNER);
}

// ==========================================================================
section("8. What the sign-in page would show for REAL Supabase errors");
{
  const probe = client();
  const address = "ratelimit@example.test";
  await probe.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
  const second = await probe.auth.signInWithOtp({ email: address, options: { shouldCreateUser: true } });
  if (second.error) {
    const shown = describeSendError(second.error);
    check("a real per-address cooldown is classified as a rate limit", second.error.status === 429, `status=${second.error.status} code=${second.error.code}`);
    check("its wait is read from Supabase's own message", shown.waitSeconds > 0, `waitSeconds=${shown.waitSeconds} from "${second.error.message}"`);
    check("the message shown contains none of Supabase's wording", !/for security purposes|over_email|rate_limit/i.test(shown.message), shown.message);
  } else {
    note("the local max_frequency let the second request through (set it above 1s to exercise the real cooldown)");
  }
  await sleep(1300);
  await clearMail();
  const a = client();
  await a.auth.signInWithOtp({ email: "replace@example.test", options: { shouldCreateUser: true } });
  const first = await latestCode("replace@example.test");
  await sleep(1300);
  await clearMail();
  await a.auth.signInWithOtp({ email: "replace@example.test", options: { shouldCreateUser: true } });
  const next = await latestCode("replace@example.test");
  const old = await a.auth.verifyOtp({ email: "replace@example.test", token: first, type: "email" });
  check("a NEW code replaces the earlier one (the page says so)", first !== next && !!old.error, old.error?.message ?? "old code still worked");
  if (old.error) {
    const shown = describeVerifyError(old.error);
    check("the real 'wrong or expired code' error maps to the page's own sentence", /did not work/.test(shown.message) && !/token has expired or is invalid|otp_expired/i.test(shown.message), shown.message);
  }
  const good = await a.auth.verifyOtp({ email: "replace@example.test", token: next, type: "email" });
  check("the newest code signs in", !good.error);
  const reuse = await client().auth.verifyOtp({ email: "replace@example.test", token: next, type: "email" });
  check("a code cannot be used twice", !!reuse.error);
  const offline = createClient("http://127.0.0.1:9", ANON, { auth: { persistSession: false } });
  const down = await offline.auth.signInWithOtp({ email: OWNER });
  const shownDown = describeSendError(down.error);
  check("with the service unreachable, the page says so in plain words", !!down.error && /internet connection/i.test(shownDown.message), `${down.error?.name}: ${shownDown.message}`);
}

// ==========================================================================
section("9. The migrations are safe to run again");
if (MIGRATIONS) {
  // A launch photograph Nat has taken off its booking page: 0010's seed must
  // not put it back when the file is run again.
  const launch = sql(`select id from public.gallery_items where install_type = 'frontal' order by display_order limit 1;`);
  const pagesBefore = launch ? sql(`select booking_services::text from public.gallery_items where id = '${launch}';`) : "";
  if (launch) sql(`update public.gallery_items set booking_services = '{}' where id = '${launch}';`);
  const snapBefore = snapshot();
  try {
    for (const file of ["0006_owner_photo_manager.sql", "0007_website_photos.sql", "0008_rebuild_site_on_photo_change.sql", "0009_revoke_excess_api_grants.sql", "0010_photo_booking_services.sql"]) {
      runFile(`${MIGRATIONS}/${file}`);
    }
    check("0006 to 0010 re-run cleanly on a database that already has them", true);
  } catch (e) {
    check("0006 to 0010 re-run cleanly on a database that already has them", false, String(e.stderr || e.message).slice(0, 300));
  }
  check("re-running them changed no photograph, place or collection", changedTables(snapBefore, snapshot()).filter((t) => t !== "profiles").length === 0, changedTables(snapBefore, snapshot()).join(","));
  if (launch) {
    check("0010's seed ran once: a booking page Nat cleared stays cleared", sql(`select booking_services::text from public.gallery_items where id = '${launch}';`) === "{}");
    sql(`update public.gallery_items set booking_services = '${pagesBefore}' where id = '${launch}';`);
  }
  const { data } = await (await otpSignIn(OWNER)).rpc("is_admin");
  check("and the owner is still the owner afterwards", data === true);
} else {
  note("MIGRATIONS_DIR not set: skipped the re-run check");
}

// ---------------------------------------------------------------- tidy up ---
sql(`delete from auth.users where email like '%@example.test' or email in ('crownedbynattt+evil@gmail.com', 'crowned.bynattt@gmail.com');`);
sql(`delete from public.gallery_items where src like 'gallery/fixture-%' or src like 'gallery/t-%' or src like 'gallery/evil-%';`);

console.log(`\n${fail === 0 ? "ALL PASS" : fail + " FAILED"}  (${pass} passed, ${fail} failed)`);
process.exit(fail === 0 ? 0 : 1);
