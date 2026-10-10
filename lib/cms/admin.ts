"use client";

import type { SectionKey } from "@/lib/cms/defaults";
import { requireSupabase } from "@/lib/supabase/client";

/**
 * The dashboard's reads and writes of the website's words
 * (supabase/migrations/0011_website_content.sql).
 *
 * Every request here is answered by Postgres according to is_admin(); the
 * dashboard hiding a button decides nothing. What this file adds is the
 * conversation around those answers: optimistic checks so two devices cannot
 * overwrite each other's work unseen, and every failure turned into a
 * sentence Nat can act on, never a raw database error.
 */

export type DraftRow = {
  section: SectionKey;
  content: Record<string, unknown>;
  updated_at: string;
};

export type ReleaseRow = {
  id: number;
  content: Record<string, unknown>;
  sections: string[];
  published_at: string;
  is_current: boolean;
};

export type RebuildOutcome = "requested" | "not_configured" | "unavailable" | "too_soon";

export type ContentStatus = {
  release: number | null;
  published_at: string | null;
  drafts: number;
  /** The deploy hook is in Vault and pg_net can send it. */
  auto_publish: boolean;
  last_rebuild: {
    release: number | null;
    requested_at: string;
    outcome: RebuildOutcome;
    /** Cloudflare's answer, while pg_net still keeps it (a few hours). */
    response: { status_code: number | null; timed_out: boolean | null; error: string | null } | null;
  } | null;
};

export type PublishResult = {
  release: number;
  published_at: string;
  sections: string[];
  rebuild: RebuildOutcome;
};

/** What the deployed site says it was built with (app/content-version.json/route.ts). */
export type LiveVersion = { release: number | null; publishedAt: string | null; builtAt: string };

// ------------------------------------------------------------------ errors ---

type ServiceError = { message?: string; code?: string; status?: number; details?: string } | null | undefined;

const MESSAGES = {
  network: "Could not reach the website's database. Check your connection and try again.",
  expired: "Your sign-in has ended. Sign in again to carry on.",
  denied: "This account is not allowed to change the website.",
  setup:
    "The content manager needs a one-time update to the website's database before it can save anything. Your developer has the steps in docs/content-manager.md (One-time setup).",
  conflict:
    "This was changed on another device or in another tab in the meantime. Reload the page to see the latest version, then make your change again.",
  nothing: "There is nothing to publish: every change is already on the website.",
  invalid: "Some of this was not accepted. Check the highlighted fields, then try again.",
  unknown: "Something went wrong, and nothing was changed. Try again in a moment.",
} as const;

type Kind = keyof typeof MESSAGES;

function classify(error: ServiceError): Kind {
  const raw = `${error?.message ?? ""} ${error?.code ?? ""} ${error?.details ?? ""}`.toLowerCase();
  const status = Number(error?.status ?? 0);

  if (/pt409|published from somewhere else/.test(raw) || status === 409) return "conflict";
  if (/pt422|nothing to publish/.test(raw)) return "nothing";
  // The tables or functions of 0011 are not there yet.
  if (/pgrst20[0-5]|42p01|42883|could not find the function/.test(raw)) return "setup";
  if (/failed to fetch|load failed|networkerror|network request/.test(raw)) return "network";
  if (/jwt|pgrst30[0-9]|session/.test(raw) || status === 401) return "expired";
  if (/row-level security|42501|not authori[sz]ed|permission denied/.test(raw) || status === 403) return "denied";
  if (/23505/.test(raw)) return "conflict";
  if (/23514|23502|22p02|check constraint/.test(raw)) return "invalid";
  return "unknown";
}

/**
 * A refusal is checked once more before it is reported: the usual reason is
 * not an impostor but a sign-in that ended (Log out in another tab). If the
 * session really is gone it is cleared here too, which sends the dashboard
 * back to the sign-in page instead of leaving dead controls on screen.
 */
async function explain(error: ServiceError): Promise<{ message: string; kind: Kind }> {
  const kind = classify(error);
  if (kind === "expired" || kind === "denied") {
    const supabase = requireSupabase();
    const { error: userError } = await supabase.auth.getUser();
    if (userError) {
      await supabase.auth.signOut({ scope: "local" });
      return { message: MESSAGES.expired, kind: "expired" };
    }
  }
  return { message: MESSAGES[kind], kind };
}

// ------------------------------------------------------------------- reads ---

export async function fetchStatus(): Promise<{ status: ContentStatus | null; error: string; kind?: Kind }> {
  const { data, error } = await requireSupabase().rpc("site_content_status");
  if (error) {
    const { message, kind } = await explain(error);
    return { status: null, error: message, kind };
  }
  return { status: data as ContentStatus, error: "" };
}

/**
 * Everything the dashboard opens with: the current release, every draft, and
 * the publishing status. The status is asked first, of a function that
 * refuses anyone but the owner, so a revoked or unpromoted session is told so
 * rather than shown the public release as if it could edit it.
 */
export async function loadContent(): Promise<{
  release: ReleaseRow | null;
  drafts: Partial<Record<SectionKey, DraftRow>>;
  status: ContentStatus | null;
  error: string;
  kind?: Kind;
}> {
  const supabase = requireSupabase();

  const status = await supabase.rpc("site_content_status");
  if (status.error) {
    const { message, kind } = await explain(status.error);
    return { release: null, drafts: {}, status: null, error: message, kind };
  }

  const [release, drafts] = await Promise.all([
    supabase
      .from("site_content_releases")
      .select("id, content, sections, published_at, is_current")
      .eq("is_current", true)
      .maybeSingle(),
    supabase.from("site_content_drafts").select("section, content, updated_at"),
  ]);

  const failed = release.error ?? drafts.error;
  if (failed) {
    const { message, kind } = await explain(failed);
    return { release: null, drafts: {}, status: null, error: message, kind };
  }

  const bySection: Partial<Record<SectionKey, DraftRow>> = {};
  for (const row of (drafts.data ?? []) as DraftRow[]) bySection[row.section] = row;

  return {
    release: (release.data as ReleaseRow | null) ?? null,
    drafts: bySection,
    status: status.data as ContentStatus,
    error: "",
  };
}

export async function listReleases(limit = 30): Promise<{ releases: Omit<ReleaseRow, "content">[]; error: string }> {
  const { data, error } = await requireSupabase()
    .from("site_content_releases")
    .select("id, sections, published_at, is_current")
    .order("id", { ascending: false })
    .limit(limit);
  if (error) return { releases: [], error: (await explain(error)).message };
  return { releases: (data ?? []) as Omit<ReleaseRow, "content">[], error: "" };
}

/**
 * The deployed site's own answer, from the same origin the dashboard is on.
 * A query string and no-store, so neither the browser nor Cloudflare can hand
 * back an older deployment's file (public/_headers says no-store as well).
 */
export async function fetchLiveVersion(): Promise<LiveVersion | null> {
  try {
    const response = await fetch(`/content-version.json?check=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const body = (await response.json()) as LiveVersion;
    return typeof body === "object" && body !== null && "release" in body ? body : null;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------ writes ---

/**
 * Saves one section's draft. `expected` is the draft's updated_at as the
 * dashboard last saw it, or null for a section with no draft yet: if the row
 * has moved on since (another tab, another device), nothing is written and
 * the dashboard says so.
 */
export async function saveDraft(
  section: SectionKey,
  content: Record<string, unknown>,
  expected: string | null,
): Promise<{ row: DraftRow | null; error: string; kind?: Kind }> {
  const supabase = requireSupabase();
  const query = expected
    ? supabase
        .from("site_content_drafts")
        .update({ content })
        .eq("section", section)
        .eq("updated_at", expected)
        .select("section, content, updated_at")
    : supabase.from("site_content_drafts").insert({ section, content }).select("section, content, updated_at");

  const { data, error } = await query;
  if (error) {
    const { message, kind } = await explain(error);
    return { row: null, error: message, kind };
  }
  const row = (data as DraftRow[] | null)?.[0];
  if (!row) {
    // No row matched: changed elsewhere, or refused by a policy. explain() tells the two apart.
    const { message, kind } = await explain({ message: "row-level security" });
    return kind === "denied"
      ? { row: null, error: MESSAGES.conflict, kind: "conflict" }
      : { row: null, error: message, kind };
  }
  return { row, error: "" };
}

/** Throws a section's draft away, so it shows the published words again. */
export async function discardDraft(section: SectionKey, expected: string): Promise<{ error: string; kind?: Kind }> {
  const { data, error } = await requireSupabase()
    .from("site_content_drafts")
    .delete()
    .eq("section", section)
    .eq("updated_at", expected)
    .select("section");
  if (error) return explain(error).then(({ message, kind }) => ({ error: message, kind }));
  if (!data || data.length === 0) return { error: MESSAGES.conflict, kind: "conflict" };
  return { error: "" };
}

/** Publishes every draft as a new release, if the current one is still `expected`. */
export async function publishContent(
  expected: number | null,
): Promise<{ result: PublishResult | null; error: string; kind?: Kind }> {
  const { data, error } = await requireSupabase().rpc("publish_site_content", {
    p_expected_release: expected,
  });
  if (error) {
    const { message, kind } = await explain(error);
    return { result: null, error: message, kind };
  }
  return { result: data as PublishResult, error: "" };
}

/** Asks Cloudflare for the rebuild again (at most once a minute; the database enforces it). */
export async function retryRebuild(): Promise<{ outcome: RebuildOutcome | null; error: string }> {
  const { data, error } = await requireSupabase().rpc("retry_site_content_rebuild");
  if (error) return { outcome: null, error: (await explain(error)).message };
  return { outcome: (data as { rebuild: RebuildOutcome }).rebuild, error: "" };
}

/**
 * Copies an earlier release into drafts, section by section, so Nat can look
 * it over and publish it again. Nothing on the website changes until she does.
 */
export async function restoreRelease(id: number): Promise<{ sections: string[]; error: string }> {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from("site_content_releases")
    .select("content")
    .eq("id", id)
    .maybeSingle();
  if (error) return { sections: [], error: (await explain(error)).message };
  const content = ((data as { content?: Record<string, unknown> } | null)?.content ?? {}) as Record<string, unknown>;
  const rows = Object.entries(content).map(([section, value]) => ({ section, content: value }));
  if (rows.length === 0) return { sections: [], error: "" };

  const saved = await supabase.from("site_content_drafts").upsert(rows, { onConflict: "section" }).select("section");
  if (saved.error) return { sections: [], error: (await explain(saved.error)).message };
  return { sections: rows.map((row) => row.section), error: "" };
}
