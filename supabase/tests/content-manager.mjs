// The website's words: who can read, save and publish them (migration 0011).
//
// Drives a REAL local Supabase the way owner-only.mjs does: through the public
// API, with the public key, as a visitor, as a signed-in customer and as the
// owner, and compares the two content tables with a snapshot taken before
// every attack, so "the request returned an error" is never mistaken for
// "nothing changed". Then it publishes for real, with a stand-in for
// Cloudflare's deploy hook listening on this machine, and checks the request
// that reaches it.
//
// It REFUSES to run against anything but localhost: it deletes every draft and
// release, and creates accounts. Same environment variables as owner-only.mjs
// (supabase/tests/README.md), plus HOOK_PORT (default 4599) for the stand-in.
import { createServer } from "node:http";
import { execFileSync } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const API = (process.env.SUPABASE_URL ?? "").replace(/\/$/, "");
const ANON = process.env.SUPABASE_ANON_KEY ?? "";
const DB = process.env.SUPABASE_DB_CONTAINER ?? "";
const MAIL = (process.env.MAILPIT_URL ?? "").replace(/\/$/, "");
const MIGRATION = process.env.CONTENT_MIGRATION ?? "";
const HOOK_PORT = Number(process.env.HOOK_PORT ?? 4599);

if (!API || !ANON || !DB || !MAIL) {
  console.error("Set SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_DB_CONTAINER and MAILPIT_URL (supabase/tests/README.md).");
  process.exit(2);
}
if (!/^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(API)) {
  console.error(`Refusing to run against ${API}: this suite deletes data and is for a LOCAL stack only.`);
  process.exit(2);
}

const OWNER = "crownedbynattt@gmail.com";

let pass = 0;
let fail = 0;
function check(name, ok, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? "  -- " + detail : ""}`);
}
const section = (title) => console.log(`\n== ${title}`);
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function memoryStorage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
}
const client = () =>
  createClient(API, ANON, {
    auth: { storage: memoryStorage(), persistSession: true, autoRefreshToken: false, detectSessionInUrl: false, flowType: "pkce" },
  });
const withToken = (token) =>
  createClient(API, ANON, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

const exec = { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], env: { ...process.env, MSYS_NO_PATHCONV: "1" } };
const sql = (statement) =>
  execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-d", "postgres", "-At", "-v", "ON_ERROR_STOP=1", "-c", statement], exec).trim();
function runFile(path) {
  const target = `/tmp/${path.split(/[\\/]/).pop()}`;
  execFileSync("docker", ["cp", path, `${DB}:${target}`], exec);
  execFileSync("docker", ["exec", DB, "psql", "-U", "postgres", "-d", "postgres", "-v", "ON_ERROR_STOP=1", "-q", "-f", target], exec);
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
  await fetch(`${MAIL}/api/v1/messages`, { method: "DELETE" });
  const c = client();
  let sent;
  for (let attempt = 0; attempt < 4; attempt++) {
    sent = await c.auth.signInWithOtp({ email, options: { shouldCreateUser: true } });
    if (!sent.error || sent.error.code !== "over_email_send_rate_limit") break;
    await sleep(1300);
  }
  if (sent.error) throw new Error(`otp send (${email}): ${sent.error.message}`);
  const code = await latestCode(email);
  const verified = await c.auth.verifyOtp({ email, token: code, type: "email" });
  if (verified.error) throw new Error(`otp verify (${email}): ${verified.error.message}`);
  return c;
}

/** What a successful attack would have changed. */
const snapshot = () =>
  ["site_content_drafts", "site_content_releases"]
    .map((t) => sql(`select coalesce(md5(string_agg(x::text, '|' order by x::text)), 'empty') from public.${t} x;`))
    .join(" ");

const raw = async (path, init = {}, token = ANON) => {
  const response = await fetch(`${API}${path}`, {
    ...init,
    headers: { apikey: ANON, Authorization: `Bearer ${token}`, "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
  let body = null;
  try {
    body = await response.json();
  } catch {
    // empty body
  }
  return { status: response.status, body };
};

/** Every write a dashboard could make, attempted by `c`. Returns which ones got through. */
async function attack(c) {
  const got = [];
  const tries = {
    "insert draft": () => c.from("site_content_drafts").insert({ section: "faq", content: { heading: "Hacked" } }).select(),
    "update drafts": () => c.from("site_content_drafts").update({ content: { heading: "Hacked" } }).neq("section", "").select(),
    "delete drafts": () => c.from("site_content_drafts").delete().neq("section", "").select(),
    "upsert draft": () => c.from("site_content_drafts").upsert({ section: "business", content: { name: "Hacked" } }).select(),
    "insert release": () => c.from("site_content_releases").insert({ content: { business: { name: "Hacked" } }, is_current: true }).select(),
    "update releases": () => c.from("site_content_releases").update({ content: { business: { name: "Hacked" } } }).gt("id", 0).select(),
    "delete releases": () => c.from("site_content_releases").delete().gt("id", 0).select(),
    "publish": () => c.rpc("publish_site_content", { p_expected_release: null }),
    "retry rebuild": () => c.rpc("retry_site_content_rebuild"),
  };
  for (const [name, run] of Object.entries(tries)) {
    const { data, error } = await run();
    const changed = !error && (Array.isArray(data) ? data.length > 0 : data !== null);
    if (changed) got.push(name);
  }
  return got;
}

// ------------------------------------------------------------------ setup ---

let hookHits = [];
let hookStatus = 200;
const hook = createServer((req, res) => {
  let body = "";
  req.on("data", (chunk) => (body += chunk));
  req.on("end", () => {
    hookHits.push({ method: req.method, url: req.url, body });
    res.writeHead(hookStatus, { "Content-Type": "application/json" });
    res.end(hookStatus === 200 ? '{"success":true}' : '{"success":false}');
  });
});
await new Promise((resolve) => hook.listen(HOOK_PORT, "0.0.0.0", resolve));

try {
  section("0. Clean slate");
  sql("delete from public.site_content_drafts; delete from public.site_content_releases; delete from private.site_content_rebuilds;");
  sql("delete from vault.secrets where name = 'cloudflare_pages_deploy_hook';");
  check("no drafts or releases to start with", snapshot() === "empty empty");

  // The owner, promoted by hand as in production, then signed in afresh
  // (promotion ends every earlier session).
  await otpSignIn(OWNER);
  sql(`select public.promote_studio_owner('${OWNER}');`);
  const owner = await otpSignIn(OWNER);
  const ownerAdmin = await owner.rpc("is_admin");
  check("the owner is admin", ownerAdmin.data === true, JSON.stringify(ownerAdmin.error));

  const customerEmail = `customer-${Date.now()}@example.test`;
  const customer = await otpSignIn(customerEmail);
  const customerAdmin = await customer.rpc("is_admin");
  check("a signed-in customer is not admin", customerAdmin.data === false);

  // -------------------------------------------------------------- reads ---
  section("1. Before anything is published");
  const visitor = client();
  let read = await visitor.from("site_content_releases").select("*");
  check("a visitor reads no release", !read.error && read.data.length === 0, JSON.stringify(read.error));
  read = await visitor.from("site_content_drafts").select("*");
  check("a visitor cannot read drafts at all", !!read.error, JSON.stringify(read.data));

  // The owner saves a draft: the visitor and the customer still see nothing.
  const firstDraft = await owner
    .from("site_content_drafts")
    .insert({ section: "faq", content: { heading: "Draft heading only Nat sees" } })
    .select("section, content, updated_at");
  check("the owner saves a draft", !firstDraft.error && firstDraft.data?.length === 1, JSON.stringify(firstDraft.error));
  const draftStamp = firstDraft.data?.[0]?.updated_at;

  read = await customer.from("site_content_drafts").select("*");
  check("a customer reads no drafts", !read.error && read.data.length === 0, JSON.stringify(read.data));
  read = await raw("/rest/v1/site_content_drafts?select=*");
  check("raw REST with the public key: drafts refused", read.status === 401 || read.status === 403, String(read.status));

  // ------------------------------------------------------------ attacks ---
  section("2. A visitor with only the public key");
  let before = snapshot();
  let got = await attack(visitor);
  check("no write gets through", got.length === 0, got.join(", "));
  check("nothing changed in the database", snapshot() === before);
  for (const fn of ["publish_site_content", "site_content_status", "retry_site_content_rebuild"]) {
    const res = await raw(`/rest/v1/rpc/${fn}`, { method: "POST", body: JSON.stringify(fn === "publish_site_content" ? { p_expected_release: null } : {}) });
    check(`raw REST: ${fn} refused for a visitor`, res.status >= 400, `${res.status} ${JSON.stringify(res.body).slice(0, 100)}`);
  }

  section("3. A signed-in customer");
  before = snapshot();
  got = await attack(customer);
  check("no write gets through", got.length === 0, got.join(", "));
  check("nothing changed in the database", snapshot() === before);
  const customerStatus = await customer.rpc("site_content_status");
  check("site_content_status refused", !!customerStatus.error && /not authori/i.test(customerStatus.error.message), JSON.stringify(customerStatus.error));
  const customerPublish = await customer.rpc("publish_site_content", { p_expected_release: null });
  check("publish refused", !!customerPublish.error && /not authori/i.test(customerPublish.error.message));
  check("the owner's draft is still there, untouched", sql("select content->>'heading' from public.site_content_drafts where section = 'faq';") === "Draft heading only Nat sees");

  // -------------------------------------------------------------- owner ---
  section("4. The owner: save, conflicts, publish");
  const stale = await owner
    .from("site_content_drafts")
    .update({ content: { heading: "Edited elsewhere" } })
    .eq("section", "faq")
    .eq("updated_at", "2000-01-01T00:00:00+00:00")
    .select();
  check("a save based on an old copy changes nothing", !stale.error && stale.data.length === 0);
  const fresh = await owner
    .from("site_content_drafts")
    .update({ content: { heading: "Common questions, revised." } })
    .eq("section", "faq")
    .eq("updated_at", draftStamp)
    .select("updated_at");
  check("a save based on the latest copy goes through", !fresh.error && fresh.data.length === 1, JSON.stringify(fresh.error));
  check("the database moves updated_at on, not the browser", fresh.data?.[0]?.updated_at !== draftStamp);

  const bad = await owner.from("site_content_drafts").insert({ section: "../etc", content: {} }).select();
  check("a section name that is not a section is refused", !!bad.error, JSON.stringify(bad.error?.code));
  const notObject = await owner.from("site_content_drafts").insert({ section: "seo", content: ["x"] }).select();
  check("content that is not an object is refused", !!notObject.error, JSON.stringify(notObject.error?.code));

  let status = await owner.rpc("site_content_status");
  check("status: nothing published, one draft, automatic updates off", status.data?.release === null && status.data?.drafts === 1 && status.data?.auto_publish === false, JSON.stringify(status.data));

  const wrongBase = await owner.rpc("publish_site_content", { p_expected_release: 99 });
  check("publishing over a release Nat has not seen is refused (409)", wrongBase.error?.code === "PT409", JSON.stringify(wrongBase.error));

  const first = await owner.rpc("publish_site_content", { p_expected_release: null });
  check("the owner publishes", !first.error && typeof first.data?.release === "number", JSON.stringify(first.error));
  check("with no deploy hook, nothing is sent and it says so", first.data?.rebuild === "not_configured", first.data?.rebuild);
  const releaseOne = first.data?.release;
  check("drafts are emptied by publishing", sql("select count(*) from public.site_content_drafts;") === "0");

  const nothing = await owner.rpc("publish_site_content", { p_expected_release: releaseOne });
  check("publishing with no drafts is refused (422)", nothing.error?.code === "PT422", JSON.stringify(nothing.error));

  read = await visitor.from("site_content_releases").select("id, content, is_current");
  check("a visitor reads the current release", read.data?.length === 1 && read.data[0].id === releaseOne && read.data[0].content?.faq?.heading === "Common questions, revised.", JSON.stringify(read.data));

  // A second release lays its sections over the first.
  await owner.from("site_content_drafts").insert({ section: "business", content: { name: "Crowned by Nat", phone: "410 555 0134" } });
  const second = await owner.rpc("publish_site_content", { p_expected_release: releaseOne });
  const releaseTwo = second.data?.release;
  check("a second release", !second.error && releaseTwo > releaseOne, JSON.stringify(second.error));
  read = await visitor.from("site_content_releases").select("id, content");
  check(
    "it carries both sections, and only it is readable",
    read.data?.length === 1 && read.data[0].id === releaseTwo && read.data[0].content?.faq?.heading && read.data[0].content?.business?.phone === "410 555 0134",
    JSON.stringify(read.data),
  );
  read = await visitor.from("site_content_releases").select("id").eq("id", releaseOne);
  check("an earlier release is not readable by a visitor", read.data?.length === 0);
  read = await customer.from("site_content_releases").select("id").eq("id", releaseOne);
  check("nor by a customer", read.data?.length === 0);
  read = await owner.from("site_content_releases").select("id, is_current").order("id");
  check("the owner sees the whole history", read.data?.length === 2 && read.data[0].is_current === false && read.data[1].is_current === true);

  // What the build itself asks (next.config.ts), word for word.
  const build = await raw("/rest/v1/site_content_releases?select=id,content,published_at&is_current=eq.true&limit=1");
  check("the build's own query gets the current release", build.status === 200 && build.body?.[0]?.id === releaseTwo, String(build.status));

  let twoCurrent = "";
  try {
    sql(`update public.site_content_releases set is_current = true where id = ${releaseOne};`);
  } catch (error) {
    twoCurrent = String(error.stderr ?? error.message);
  }
  check("the database itself refuses two current releases", /duplicate key|unique/i.test(twoCurrent), twoCurrent.slice(0, 120));

  // ---------------------------------------------------------- rebuilds ---
  section("5. Asking Cloudflare to rebuild (a stand-in on this machine)");
  sql(`select vault.create_secret('http://host.docker.internal:${HOOK_PORT}/deploy-hook', 'cloudflare_pages_deploy_hook', 'content-manager test');`);
  status = await owner.rpc("site_content_status");
  check("status: automatic updates on", status.data?.auto_publish === true, JSON.stringify(status.data));

  hookHits = [];
  await owner.from("site_content_drafts").insert({ section: "seo", content: { instagram: "https://www.instagram.com/crownedbynattt/" } });
  const third = await owner.rpc("publish_site_content", { p_expected_release: releaseTwo });
  check("publishing asks for a rebuild", third.data?.rebuild === "requested", JSON.stringify(third.data ?? third.error));
  for (let i = 0; i < 40 && hookHits.length === 0; i++) await sleep(250);
  check("the deploy hook received exactly one POST", hookHits.length === 1 && hookHits[0].method === "POST", JSON.stringify(hookHits));
  check("naming the release", JSON.parse(hookHits[0]?.body || "{}").release === third.data?.release, hookHits[0]?.body);

  let answer = null;
  for (let i = 0; i < 40 && !answer?.status_code; i++) {
    await sleep(250);
    answer = (await owner.rpc("site_content_status")).data?.last_rebuild?.response;
  }
  check("the status reports Cloudflare's answer", answer?.status_code === 200, JSON.stringify(answer));

  const tooSoon = await owner.rpc("retry_site_content_rebuild");
  check("asking again within a minute is held back", tooSoon.data?.rebuild === "too_soon", JSON.stringify(tooSoon.data ?? tooSoon.error));
  sql("update private.site_content_rebuilds set requested_at = now() - interval '2 minutes';");
  hookHits = [];
  hookStatus = 404;
  const again = await owner.rpc("retry_site_content_rebuild");
  check("asking again later sends another request", again.data?.rebuild === "requested", JSON.stringify(again.data));
  for (let i = 0; i < 40 && hookHits.length === 0; i++) await sleep(250);
  answer = null;
  for (let i = 0; i < 40 && !answer?.status_code; i++) {
    await sleep(250);
    answer = (await owner.rpc("site_content_status")).data?.last_rebuild?.response;
  }
  check("a refused hook (404) is reported, for the dashboard to say so", answer?.status_code === 404, JSON.stringify(answer));
  hookStatus = 200;

  before = snapshot();
  hookHits = [];
  got = await attack(customer);
  await sleep(1500);
  check("a customer's refused publish starts no rebuild", got.length === 0 && hookHits.length === 0, `${got.join(", ")} ${hookHits.length}`);
  check("and changes nothing", snapshot() === before);

  // ------------------------------------------------------------ sessions ---
  section("6. Logging out ends it");
  const { data: sessionData } = await owner.auth.getSession();
  const token = sessionData.session.access_token;
  await owner.auth.signOut();
  const stolen = withToken(token);
  before = snapshot();
  got = await attack(stolen);
  check("the token of a logged-out session publishes nothing", got.length === 0, got.join(", "));
  check("nothing changed", snapshot() === before);

  // --------------------------------------------------------- the schema ---
  section("7. What the database itself says");
  const policies = sql("select string_agg(policyname || ':' || cmd || ':' || array_to_string(roles, ','), ' | ' order by policyname) from pg_policies where tablename like 'site_content%';");
  check("exactly four policies", policies.split(" | ").length === 4, policies);
  check("the public may only read the current release", /public reads current:SELECT:anon,authenticated/.test(policies));
  const anonGrants = sql("select coalesce(string_agg(table_name || ':' || privilege_type, ','), '') from information_schema.role_table_grants where grantee = 'anon' and table_name like 'site_content%';");
  check("anon holds SELECT on releases and nothing else", anonGrants === "site_content_releases:SELECT", anonGrants);
  const execs = sql("select coalesce(string_agg(routine_name || ':' || grantee, ',' order by routine_name, grantee), '') from information_schema.routine_privileges where routine_schema = 'public' and routine_name in ('publish_site_content','site_content_status','retry_site_content_rebuild') and grantee in ('anon','PUBLIC');");
  check("no publishing function is executable by anon or PUBLIC", execs === "", execs);
  const privateFn = sql("select coalesce(string_agg(grantee, ','), '') from information_schema.routine_privileges where routine_schema = 'private' and routine_name = 'request_content_rebuild' and grantee in ('anon','authenticated','PUBLIC');");
  check("the rebuild request itself is callable by no API role", privateFn === "", privateFn);

  // ----------------------------------------------------------- re-run ---
  if (MIGRATION) {
    section("8. Running 0011 again");
    const counts = sql("select (select count(*) from public.site_content_releases) || '/' || (select count(*) from public.site_content_drafts);");
    runFile(MIGRATION);
    check("releases and drafts are kept", sql("select (select count(*) from public.site_content_releases) || '/' || (select count(*) from public.site_content_drafts);") === counts);
    check("the current release is still current", sql("select count(*) from public.site_content_releases where is_current;") === "1");
  }
} catch (error) {
  fail++;
  console.log(`FAIL the suite stopped: ${error.stack ?? error}`);
} finally {
  sql("delete from vault.secrets where name = 'cloudflare_pages_deploy_hook';");
  hook.close();
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
