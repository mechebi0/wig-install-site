// Fails if anything privileged is shipped to browsers.
//
//   node scripts/check-bundle-secrets.mjs            scans ./out (after `npm run build`)
//   node scripts/check-bundle-secrets.mjs <dir>      scans another build directory
//   node scripts/check-bundle-secrets.mjs <https://site>
//                                                    fetches the pages and every script
//                                                    they load from the live site
//
// The browser is supposed to hold exactly one Supabase credential: the project
// URL and the PUBLISHABLE (anon) key, which is public by design and bounded by
// row level security. Anything that can bypass row level security, or reach
// the database, the mail provider or the deploy hook directly, must never be
// in a file a visitor can download. A key's role is read from its own payload,
// so a service-role key is caught whatever it is named or wherever it hides.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const target = process.argv[2] ?? "out";
const PAGES = ["/", "/gallery/", "/book/", "/admin/login/", "/admin/photos/", "/admin/", "/login/"];

const findings = [];
const notes = [];
let scanned = 0;
const jwtRoles = new Map();

const PATTERNS = [
  [/sb_secret_[A-Za-z0-9_-]{16,}/g, "a Supabase secret key (sb_secret_...)"],
  [/\bsbp_[a-f0-9]{40}\b/g, "a Supabase personal access token (sbp_...)"],
  [/postgres(?:ql)?:\/\/[^\s"'`:@/]+:[^\s"'`@/]+@[^\s"'`]+/g, "a database connection string with a password"],
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/g, "a private key"],
  [/\bre_[A-Za-z0-9]{24,}\b/g, "what looks like a Resend API key"],
  [/\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g, "what looks like a SendGrid API key"],
  [/api\.cloudflare\.com\/client\/v4\/pages\/webhooks\/deploy_hooks\/[A-Za-z0-9-]+/g, "the Cloudflare Pages deploy hook URL (it belongs in Supabase Vault)"],
  [/SUPABASE_SERVICE_ROLE_KEY|SERVICE_ROLE_KEY|SUPABASE_DB_PASSWORD|JWT_SECRET/g, "the NAME of a server-only secret"],
];

function scan(label, text) {
  scanned++;
  for (const [pattern, what] of PATTERNS) {
    for (const match of text.matchAll(pattern)) findings.push(`${label}: ${what}: ${match[0].slice(0, 12)}...`);
  }
  for (const match of text.matchAll(/eyJ[A-Za-z0-9_-]{8,}\.(eyJ[A-Za-z0-9_-]{8,})\.[A-Za-z0-9_-]{8,}/g)) {
    let role = "(unreadable)";
    try {
      role = JSON.parse(Buffer.from(match[1], "base64url").toString()).role ?? "(no role claim)";
    } catch {
      /* not a JWT after all */
    }
    jwtRoles.set(role, (jwtRoles.get(role) ?? 0) + 1);
    if (role !== "anon") findings.push(`${label}: a signed token whose role is "${role}", not "anon"`);
  }
}

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) walk(path);
    else if (/\.(js|mjs|html|txt|json|css|map)$/.test(name)) scan(path, readFileSync(path, "utf8"));
  }
}

async function fetchText(url) {
  const res = await fetch(url, { headers: { "Cache-Control": "no-cache" } });
  return res.ok ? await res.text() : "";
}

if (/^https?:\/\//.test(target)) {
  const origin = target.replace(/\/$/, "");
  const scripts = new Set();
  for (const page of PAGES) {
    const html = await fetchText(origin + page);
    scan(origin + page, html);
    for (const m of html.matchAll(/(?:src|href)="(\/_next\/static\/[^"]+\.js)"/g)) scripts.add(m[1]);
  }
  for (const src of scripts) scan(origin + src, await fetchText(origin + src));
  notes.push(`fetched ${PAGES.length} pages and ${scripts.size} scripts from ${origin}`);
} else {
  walk(target);
  notes.push(`scanned ${scanned} files under ${target}`);
}

for (const note of notes) console.log(note);
console.log(`signed tokens found, by role: ${jwtRoles.size ? [...jwtRoles].map(([r, n]) => `${r} x${n}`).join(", ") : "none"}`);
if (findings.length) {
  console.error(`\nFAIL: ${findings.length} privileged item(s) in the client files:`);
  for (const f of [...new Set(findings)]) console.error(`  - ${f}`);
  process.exit(1);
}
console.log("PASS: nothing privileged is shipped to browsers (the only signed token, if any, is the public anon key).");
