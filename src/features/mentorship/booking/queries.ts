import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/types/database";

import { SLOT_WINDOW_DAYS } from "./schemas";
import { slotWindow } from "./slots";
import type {
  FeedbackEntry,
  MentorDetail,
  MentorFilters,
  MentorSummary,
  MySessions,
  Option,
  SessionDetail,
  Slot,
} from "./types";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type MentorRow = Pick<
  Tables<"mentor_profiles">,
  "user_id" | "headline" | "years_experience" | "city_id" | "industries" | "session_types" | "rating_avg" | "rating_count"
>;

const MENTOR_COLUMNS = "user_id, headline, years_experience, city_id, industries, session_types, rating_avg, rating_count";
const MAX_MENTORS = 60;

async function getNames(supabase: Supabase, ids: string[]): Promise<Map<string, string | null>> {
  if (ids.length === 0) return new Map();
  const { data, error } = await supabase.from("profiles").select("id, full_name").in("id", ids);
  if (error) throw new Error("Could not load names");
  return new Map(data.map((row) => [row.id, row.full_name]));
}

async function getCityNames(supabase: Supabase): Promise<Map<string, string>> {
  const { data, error } = await supabase.from("cities").select("id, name");
  if (error) throw new Error("Could not load cities");
  return new Map(data.map((row) => [row.id, row.name]));
}

function toSummary(row: MentorRow, names: Map<string, string | null>, cities: Map<string, string>): MentorSummary {
  return {
    id: row.user_id,
    name: names.get(row.user_id) ?? null,
    headline: row.headline,
    yearsExperience: row.years_experience,
    cityName: row.city_id ? (cities.get(row.city_id) ?? null) : null,
    industries: row.industries,
    sessionTypes: row.session_types,
    ratingAvg: row.rating_avg,
    ratingCount: row.rating_count,
  };
}

// Cities and skills to filter by. Skills are limited to the ones listed mentors actually have.
export async function getMentorFilterOptions(): Promise<{ cities: Option[]; skills: Option[] }> {
  const supabase = await createClient();
  const [cities, mentorSkills] = await Promise.all([
    supabase.from("cities").select("id, name").eq("is_active", true).order("name"),
    supabase.from("mentor_skills").select("skill_id, skills(name)"),
  ]);
  if (cities.error || mentorSkills.error) throw new Error("Could not load filters");

  const skills = new Map<string, string>();
  for (const row of mentorSkills.data) {
    if (row.skills) skills.set(row.skill_id, row.skills.name);
  }
  return {
    cities: cities.data,
    skills: [...skills.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
  };
}

// Verified mentors who are taking bookings, best rated first. RLS already hides blocked and unverified mentors.
export async function getMentors(viewerId: string, filters: MentorFilters): Promise<MentorSummary[]> {
  const supabase = await createClient();

  let query = supabase
    .from("mentor_profiles")
    .select(MENTOR_COLUMNS)
    .eq("verification_status", "approved")
    .eq("is_accepting", true)
    .neq("user_id", viewerId);

  if (filters.cityId) query = query.eq("city_id", filters.cityId);
  if (filters.sessionType) query = query.contains("session_types", [filters.sessionType]);
  if (filters.skillId) {
    const { data: withSkill, error: skillError } = await supabase
      .from("mentor_skills")
      .select("mentor_id")
      .eq("skill_id", filters.skillId);
    if (skillError) throw new Error("Could not load mentors");
    if (withSkill.length === 0) return [];
    query = query.in(
      "user_id",
      withSkill.map((row) => row.mentor_id),
    );
  }

  const { data, error } = await query
    .order("rating_avg", { ascending: false, nullsFirst: false })
    .order("rating_count", { ascending: false })
    .order("years_experience", { ascending: false })
    .limit(MAX_MENTORS);
  if (error) throw new Error("Could not load mentors");

  const [names, cities] = await Promise.all([
    getNames(
      supabase,
      data.map((row) => row.user_id),
    ),
    getCityNames(supabase),
  ]);
  // A mentor whose profile is hidden from the viewer (blocked or suspended) has no readable name: leave them out.
  return data.filter((row) => names.has(row.user_id)).map((row) => toSummary(row, names, cities));
}

export async function getMentor(mentorId: string): Promise<MentorDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("mentor_profiles").select("*").eq("user_id", mentorId).maybeSingle();
  if (error) throw new Error("Could not load the mentor");
  if (!row) return null;

  const [names, cities, skills] = await Promise.all([
    getNames(supabase, [mentorId]),
    getCityNames(supabase),
    supabase.from("mentor_skills").select("skills(name)").eq("mentor_id", mentorId),
  ]);
  if (skills.error) throw new Error("Could not load the mentor");

  return {
    ...toSummary(row, names, cities),
    bio: row.bio,
    languages: row.languages,
    skills: skills.data
      .map((item) => item.skills?.name)
      .filter((name): name is string => Boolean(name))
      .sort((a, b) => a.localeCompare(b)),
    timezone: row.timezone,
    durationMin: row.default_duration_min,
    isBookable: row.verification_status === "approved" && row.is_accepting,
  };
}

// Free times for one page of the slot picker (14 days a page, up to 30 days ahead).
export async function getMentorSlots(mentorId: string, page: number): Promise<Slot[]> {
  const supabase = await createClient();
  const { from, to } = slotWindow(page, SLOT_WINDOW_DAYS);
  const { data, error } = await supabase.rpc("get_mentor_slots", { p_mentor_id: mentorId, p_from: from, p_to: to });
  if (error) throw new Error("Could not load free times");
  return data.map((row) => ({ startsAt: row.starts_at, endsAt: row.ends_at }));
}

// How many requested or confirmed sessions the viewer has ahead of them (the database allows 2).
export async function getUpcomingSessionCount(viewerId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("mentorship_sessions")
    .select("id", { count: "exact", head: true })
    .eq("mentee_id", viewerId)
    .in("status", ["requested", "confirmed"])
    .gt("starts_at", new Date().toISOString());
  if (error) throw new Error("Could not load your sessions");
  return count ?? 0;
}

// Sessions the viewer booked as a mentee: what is still ahead (soonest first) and everything else (newest first).
export async function getMySessions(viewerId: string): Promise<MySessions> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("mentorship_sessions")
    .select("id, mentor_id, session_type, starts_at, ends_at, status")
    .eq("mentee_id", viewerId)
    .order("starts_at", { ascending: false })
    .limit(100);
  if (error) throw new Error("Could not load your sessions");

  const names = await getNames(supabase, [...new Set(data.map((row) => row.mentor_id))]);
  const sessions = data.map((row) => ({
    id: row.id,
    mentorId: row.mentor_id,
    mentorName: names.get(row.mentor_id) ?? null,
    sessionType: row.session_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
  }));

  const now = Date.now();
  const isUpcoming = (session: (typeof sessions)[number]) =>
    (session.status === "requested" || session.status === "confirmed") && new Date(session.startsAt).getTime() > now;
  return {
    upcoming: sessions.filter(isUpcoming).reverse(),
    past: sessions.filter((session) => !isUpcoming(session)),
  };
}

function toFeedback(row: Pick<Tables<"session_feedback">, "rating" | "comment" | "next_steps"> | undefined): FeedbackEntry | null {
  return row ? { rating: row.rating, comment: row.comment, nextSteps: row.next_steps } : null;
}

// One session with both sides' feedback. RLS returns it only to its mentor and mentee.
export async function getSession(sessionId: string): Promise<SessionDetail | null> {
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("mentorship_sessions").select("*").eq("id", sessionId).maybeSingle();
  if (error) throw new Error("Could not load the session");
  if (!row) return null;

  const [names, feedback] = await Promise.all([
    getNames(supabase, [row.mentor_id]),
    supabase.from("session_feedback").select("author_side, rating, comment, next_steps").eq("session_id", sessionId),
  ]);
  if (feedback.error) throw new Error("Could not load the session");

  const now = Date.now();
  return {
    id: row.id,
    mentorId: row.mentor_id,
    menteeId: row.mentee_id,
    mentorName: names.get(row.mentor_id) ?? null,
    sessionType: row.session_type,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    status: row.status,
    goalNote: row.goal_note,
    meetingUrl: row.meeting_url,
    declineReason: row.decline_reason,
    cancelReason: row.cancel_reason,
    cancelledBy: row.cancelled_by,
    myFeedback: toFeedback(feedback.data.find((item) => item.author_side === "mentee")),
    mentorFeedback: toFeedback(feedback.data.find((item) => item.author_side === "mentor")),
    hasStarted: new Date(row.starts_at).getTime() <= now,
    hasEnded: new Date(row.ends_at).getTime() <= now,
  };
}
