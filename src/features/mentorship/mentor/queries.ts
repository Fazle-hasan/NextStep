import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import { mentorStrings } from "./strings";
import type {
  AvailabilityException,
  AvailabilityRule,
  MentorProfile,
  MentorSession,
  MentorSessionDetail,
  MentorSessionGroups,
  SessionFeedback,
} from "./types";

const SESSION_COLUMNS = "id, mentee_id, session_type, starts_at, ends_at, status, goal_note, meeting_url";
type SessionRow = Pick<
  Tables<"mentorship_sessions">,
  "id" | "mentee_id" | "session_type" | "starts_at" | "ends_at" | "status" | "goal_note" | "meeting_url"
>;

function toSession(row: SessionRow, names: Map<string, string | null>): MentorSession {
  return {
    id: row.id,
    menteeId: row.mentee_id,
    menteeName: names.get(row.mentee_id) ?? mentorStrings.sessions.someone,
    sessionType: row.session_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    goalNote: row.goal_note,
    meetingUrl: row.meeting_url,
  };
}

export async function getMentorProfile(userId: string): Promise<MentorProfile | null> {
  const supabase = await createClient();
  const [profile, skills] = await Promise.all([
    supabase
      .from("mentor_profiles")
      .select(
        "headline, bio, industries, years_experience, languages, city_id, timezone, session_types, default_duration_min, is_accepting, verification_status, rating_avg, rating_count",
      )
      .eq("user_id", userId)
      .maybeSingle(),
    supabase.from("mentor_skills").select("skill_id").eq("mentor_id", userId),
  ]);
  if (profile.error || skills.error) throw new Error("Could not load your mentor profile");
  const data = profile.data;
  if (!data) return null;

  let rejectionReason: string | null = null;
  if (data.verification_status === "rejected") {
    const { data: request } = await supabase
      .from("verification_requests")
      .select("rejection_reason")
      .eq("user_id", userId)
      .eq("kind", "mentor")
      .eq("status", "rejected")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    rejectionReason = request?.rejection_reason ?? null;
  }

  return {
    headline: data.headline,
    bio: data.bio,
    industries: data.industries,
    yearsExperience: data.years_experience,
    languages: data.languages,
    cityId: data.city_id,
    timezone: data.timezone,
    sessionTypes: data.session_types,
    defaultDurationMin: data.default_duration_min,
    isAccepting: data.is_accepting,
    verificationStatus: data.verification_status,
    rejectionReason,
    ratingAvg: data.rating_avg,
    ratingCount: data.rating_count,
    skillIds: skills.data.map((row) => row.skill_id),
  };
}

// Weekly rules and one-off exceptions from yesterday onwards (older exceptions no longer matter).
export async function getAvailability(userId: string): Promise<{ rules: AvailabilityRule[]; exceptions: AvailabilityException[] }> {
  const supabase = await createClient();
  const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
  const [rules, exceptions] = await Promise.all([
    supabase
      .from("mentor_availability_rules")
      .select("id, weekday, start_time, end_time")
      .eq("mentor_id", userId)
      .order("weekday")
      .order("start_time"),
    supabase
      .from("mentor_availability_exceptions")
      .select("id, on_date, kind, start_time, end_time")
      .eq("mentor_id", userId)
      .gte("on_date", yesterday)
      .order("on_date")
      .order("start_time", { nullsFirst: true }),
  ]);
  if (rules.error || exceptions.error) throw new Error("Could not load your availability");

  return {
    rules: rules.data.map((r) => ({ id: r.id, weekday: r.weekday, startTime: r.start_time, endTime: r.end_time })),
    exceptions: exceptions.data.map((x) => ({
      id: x.id,
      onDate: x.on_date,
      kind: x.kind,
      startTime: x.start_time,
      endTime: x.end_time,
    })),
  };
}

export async function hasAvailabilityRules(userId: string): Promise<boolean> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("mentor_availability_rules")
    .select("id", { count: "exact", head: true })
    .eq("mentor_id", userId);
  if (error) throw new Error("Could not load your availability");
  return (count ?? 0) > 0;
}

// The mentor's sessions, split into requests waiting for an answer, confirmed upcoming ones and the rest.
export async function getMentorSessions(userId: string): Promise<MentorSessionGroups> {
  const supabase = await createClient();
  const { data: rows, error } = await supabase
    .from("mentorship_sessions")
    .select(SESSION_COLUMNS)
    .eq("mentor_id", userId)
    .order("starts_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("Could not load your sessions");
  if (rows.length === 0) return { requests: [], upcoming: [], past: [] };

  const { data: people, error: peopleError } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", [...new Set(rows.map((r) => r.mentee_id))]);
  if (peopleError) throw new Error("Could not load your sessions");
  const names = new Map(people.map((p) => [p.id, p.full_name]));

  const now = Date.now();
  const groups: MentorSessionGroups = { requests: [], upcoming: [], past: [] };
  for (const row of rows) {
    const session = toSession(row, names);
    const starts = new Date(row.starts_at).getTime();
    const ends = new Date(row.ends_at).getTime();
    if (row.status === "requested" && starts > now) groups.requests.push(session);
    else if (row.status === "confirmed" && ends > now) groups.upcoming.push(session);
    else groups.past.push(session);
  }
  // Soonest first for things still to come; most recent first for the past.
  groups.requests.reverse();
  groups.upcoming.reverse();
  return groups;
}

function toFeedback(row: Pick<Tables<"session_feedback">, "rating" | "comment" | "next_steps"> | undefined): SessionFeedback | null {
  return row ? { rating: row.rating, comment: row.comment, nextSteps: row.next_steps } : null;
}

// One session, only when the viewer is its mentor.
export async function getMentorSession(sessionId: string, userId: string): Promise<MentorSessionDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase
    .from("mentorship_sessions")
    .select(`${SESSION_COLUMNS}, mentor_id, decline_reason, cancel_reason, cancelled_by`)
    .eq("id", sessionId)
    .eq("mentor_id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load the session");
  if (!row) return null;

  const [mentee, feedback, notes] = await Promise.all([
    supabase.from("profiles").select("id, full_name").eq("id", row.mentee_id).maybeSingle(),
    supabase.from("session_feedback").select("author_side, rating, comment, next_steps").eq("session_id", sessionId),
    supabase
      .from("mentor_private_notes")
      .select("id, body, created_at")
      .eq("session_id", sessionId)
      .eq("mentor_id", userId)
      .order("created_at"),
  ]);
  if (feedback.error || notes.error) throw new Error("Could not load the session");

  const names = new Map([[row.mentee_id, mentee.data?.full_name ?? null]]);
  const now = Date.now();
  const notStarted = new Date(row.starts_at).getTime() > now;
  const hasEnded = new Date(row.ends_at).getTime() <= now;
  const myFeedback = toFeedback(feedback.data.find((f) => f.author_side === "mentor"));

  return {
    ...toSession(row, names),
    declineReason: row.decline_reason,
    cancelReason: row.cancel_reason,
    cancelledByMe: row.cancelled_by === userId,
    canRespond: row.status === "requested" && notStarted,
    canCancel: (row.status === "requested" || row.status === "confirmed") && notStarted,
    hasEnded,
    canGiveFeedback: (row.status === "confirmed" || row.status === "completed") && hasEnded && !myFeedback,
    myFeedback,
    menteeFeedback: toFeedback(feedback.data.find((f) => f.author_side === "mentee")),
    notes: notes.data.map((n) => ({ id: n.id, body: n.body, createdAt: n.created_at })),
  };
}

// Time zones for the profile form, with India first (D-006).
export function getTimeZoneOptions(): string[] {
  const zones = Intl.supportedValuesOf("timeZone");
  return ["Asia/Kolkata", ...zones.filter((zone) => zone !== "Asia/Kolkata" && zone !== "Asia/Calcutta")];
}
