import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Enums } from "@/types/database";

import { moderationStrings as s } from "./strings";

// Admin-only reads (RLS lets admins read reports and every reported row).

type TargetType = Enums<"report_target_type">;
type Supabase = Awaited<ReturnType<typeof createClient>>;

// What the admin sees of the reported content. Text is always rendered as plain text.
export type ReportPreview = {
  title: string;
  lines: string[];
  ownerId: string | null;
  flags: string[];
};

export type ModerationReport = {
  id: string;
  targetType: TargetType;
  targetId: string;
  reason: Enums<"report_reason">;
  details: string | null;
  status: Enums<"report_status">;
  createdAt: string;
  resolvedAt: string | null;
  resolutionNote: string | null;
  reporterName: string | null;
  resolverName: string | null;
  // Null when the reported content no longer exists.
  preview: ReportPreview | null;
  ownerName: string | null;
};

const PAGE_SIZE = 100;

function idsOf(reports: { target_type: TargetType; target_id: string }[], type: TargetType): string[] {
  return [...new Set(reports.filter((r) => r.target_type === type).map((r) => r.target_id))];
}

function clip(text: string | null | undefined, max = 400): string {
  const value = (text ?? "").trim();
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

function payloadSummary(payload: unknown): string[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return [];
  return Object.entries(payload)
    .filter(([key]) => !key.endsWith("_id") && key !== "lat" && key !== "lng")
    .map(([key, value]) => `${key.replaceAll("_", " ")}: ${clip(String(value), 200)}`);
}

// Loads a preview for every reported row, keyed by `${type}:${id}`.
async function loadPreviews(
  supabase: Supabase,
  reports: { target_type: TargetType; target_id: string }[],
): Promise<Map<string, ReportPreview>> {
  const previews = new Map<string, ReportPreview>();
  const set = (type: TargetType, id: string, preview: ReportPreview) => previews.set(`${type}:${id}`, preview);
  const flag = (on: boolean, label: string) => (on ? [label] : []);

  const ids = {
    user: idsOf(reports, "user"),
    company: idsOf(reports, "company"),
    job: idsOf(reports, "job"),
    flat: idsOf(reports, "flat_listing"),
    relocation: idsOf(reports, "relocation_request"),
    review: idsOf(reports, "review"),
    tip: idsOf(reports, "area_tip"),
    message: idsOf(reports, "message"),
    suggestion: idsOf(reports, "place_suggestion"),
  };
  const none = Promise.resolve({ data: [] });

  const [cities, users, companies, jobs, flats, relocations, reviews, tips, messages, suggestions] = await Promise.all([
    supabase.from("cities").select("id, name"),
    ids.user.length ? supabase.from("profiles").select("id, full_name, city_id, suspended_at").in("id", ids.user) : none,
    ids.company.length ? supabase.from("companies").select("id, name, owner_id, hidden_at").in("id", ids.company) : none,
    ids.job.length ? supabase.from("jobs").select("id, title, posted_by, hidden_at, companies(name)").in("id", ids.job) : none,
    ids.flat.length
      ? supabase.from("flat_listings").select("id, title, lister_id, city_id, hidden_at").in("id", ids.flat)
      : none,
    ids.relocation.length
      ? supabase.from("relocation_requests").select("id, note, user_id, city_id, hidden_at").in("id", ids.relocation)
      : none,
    ids.review.length
      ? supabase.from("buddy_ratings").select("id, rating, comment, rater_id, hidden_at").in("id", ids.review)
      : none,
    ids.tip.length ? supabase.from("area_tips").select("id, body, author_id, hidden_at").in("id", ids.tip) : none,
    ids.message.length
      ? supabase.from("messages").select("id, body, attachment_path, sender_id, hidden_at").in("id", ids.message)
      : none,
    ids.suggestion.length ? supabase.from("place_suggestions").select("id, payload, user_id, status").in("id", ids.suggestion) : none,
  ]);
  const cityName = (id: string | null) => cities.data?.find((c) => c.id === id)?.name ?? null;
  const withCity = (id: string | null) => {
    const name = cityName(id);
    return name ? [name] : [];
  };

  for (const u of users.data ?? []) {
    set("user", u.id, {
      title: u.full_name ?? "Unnamed user",
      lines: withCity(u.city_id),
      ownerId: u.id,
      flags: flag(Boolean(u.suspended_at), s.suspended),
    });
  }
  for (const c of companies.data ?? []) {
    set("company", c.id, { title: c.name, lines: [], ownerId: c.owner_id, flags: flag(Boolean(c.hidden_at), s.hidden) });
  }
  for (const j of jobs.data ?? []) {
    set("job", j.id, {
      title: j.title,
      lines: j.companies?.name ? [j.companies.name] : [],
      ownerId: j.posted_by,
      flags: flag(Boolean(j.hidden_at), s.hidden),
    });
  }
  for (const l of flats.data ?? []) {
    set("flat_listing", l.id, {
      title: l.title,
      lines: withCity(l.city_id),
      ownerId: l.lister_id,
      flags: flag(Boolean(l.hidden_at), s.hidden),
    });
  }
  for (const r of relocations.data ?? []) {
    set("relocation_request", r.id, {
      title: clip(r.note) || "(no note)",
      lines: withCity(r.city_id),
      ownerId: r.user_id,
      flags: flag(Boolean(r.hidden_at), s.hidden),
    });
  }
  for (const r of reviews.data ?? []) {
    set("review", r.id, {
      title: `${r.rating} / 5`,
      lines: r.comment ? [clip(r.comment)] : [],
      ownerId: r.rater_id,
      flags: flag(Boolean(r.hidden_at), s.hidden),
    });
  }
  for (const t of tips.data ?? []) {
    set("area_tip", t.id, { title: clip(t.body), lines: [], ownerId: t.author_id, flags: flag(Boolean(t.hidden_at), s.hidden) });
  }
  for (const m of messages.data ?? []) {
    set("message", m.id, {
      title: clip(m.body) || s.photoOnly,
      lines: [],
      ownerId: m.sender_id,
      flags: flag(Boolean(m.hidden_at), s.hidden),
    });
  }
  for (const p of suggestions.data ?? []) {
    const lines = payloadSummary(p.payload);
    set("place_suggestion", p.id, { title: lines[0] ?? "(empty suggestion)", lines: lines.slice(1), ownerId: p.user_id, flags: [] });
  }
  return previews;
}

export async function getReports(tab: "open" | "resolved"): Promise<ModerationReport[]> {
  const supabase = await createClient();
  const base = supabase
    .from("reports")
    .select("id, reporter_id, target_type, target_id, reason, details, status, resolved_by, resolved_at, resolution_note, created_at");
  const { data: reports, error } =
    tab === "open"
      ? await base.eq("status", "open").order("created_at", { ascending: true }).limit(PAGE_SIZE)
      : await base.neq("status", "open").order("resolved_at", { ascending: false }).limit(PAGE_SIZE);
  if (error) throw new Error("Could not load reports");
  if (reports.length === 0) return [];

  const previews = await loadPreviews(supabase, reports);
  const personIds = new Set<string>();
  for (const r of reports) {
    if (r.reporter_id) personIds.add(r.reporter_id);
    if (r.resolved_by) personIds.add(r.resolved_by);
    const owner = previews.get(`${r.target_type}:${r.target_id}`)?.ownerId;
    if (owner) personIds.add(owner);
  }
  const { data: people } = personIds.size
    ? await supabase.from("profiles").select("id, full_name").in("id", [...personIds])
    : { data: [] };
  const nameOf = (id: string | null | undefined) => (id ? (people?.find((p) => p.id === id)?.full_name ?? null) : null);

  return reports.map((r) => {
    const preview = previews.get(`${r.target_type}:${r.target_id}`) ?? null;
    return {
      id: r.id,
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      details: r.details,
      status: r.status,
      createdAt: r.created_at,
      resolvedAt: r.resolved_at,
      resolutionNote: r.resolution_note,
      reporterName: nameOf(r.reporter_id),
      resolverName: nameOf(r.resolved_by),
      preview,
      ownerName: nameOf(preview?.ownerId),
    };
  });
}
