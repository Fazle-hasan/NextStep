import type { Enums } from "@/types/database";

// Labels and error messages shared by the mentee and mentor sides of mentorship.

export type SessionType = Enums<"session_type">;
export type SessionStatus = Enums<"session_status">;

export const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  career_guidance: "Career guidance",
  cv_review: "CV review",
  mock_interview: "Mock interview",
  skill_roadmap: "Skill roadmap",
  industry_qa: "Industry Q&A",
};

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  requested: "Waiting for the mentor",
  confirmed: "Confirmed",
  declined: "Declined",
  cancelled: "Cancelled",
  completed: "Completed",
};

// A request the mentor never answered before its start time.
export const SESSION_EXPIRED_LABEL = "Expired";

export function isExpiredRequest(session: { status: SessionStatus; starts_at: string }, now: Date = new Date()): boolean {
  return session.status === "requested" && new Date(session.starts_at).getTime() <= now.getTime();
}

export function sessionStatusLabel(session: { status: SessionStatus; starts_at: string }, now: Date = new Date()): string {
  return isExpiredRequest(session, now) ? SESSION_EXPIRED_LABEL : SESSION_STATUS_LABELS[session.status];
}

// Codes raised by the mentorship database functions (see supabase/migrations/*_mentorship.sql).
export const MENTORSHIP_ERRORS: Record<string, string> = {
  not_authenticated: "Please sign in first.",
  onboarding_required: "Finish setting up your profile first.",
  cannot_book_self: "You can't book a session with yourself.",
  mentor_not_available: "This mentor isn't taking bookings right now.",
  goal_note_too_long: "Your note is too long (1000 characters at most).",
  session_type_not_offered: "This mentor doesn't offer that kind of session.",
  slot_not_available: "That time was just taken. Please pick another slot.",
  session_limit_reached: "You already have 2 upcoming sessions. Finish or cancel one before booking another.",
  session_not_found: "That session no longer exists.",
  session_not_pending: "This request was already answered or its time has passed.",
  invalid_meeting_url: "Add a meeting link that starts with https://.",
  reason_too_long: "The reason is too long (500 characters at most).",
  session_not_cancellable: "This session can no longer be cancelled.",
  session_not_finished: "Feedback opens once the session has ended.",
  rating_required: "Please choose a rating from 1 to 5.",
  next_steps_mentor_only: "Only the mentor can add next steps.",
  feedback_too_long: "Your feedback is too long.",
  feedback_already_given: "You have already left feedback for this session.",
  not_rejected: "A new review can only be requested after a rejection.",
  note_too_long: "Your note is too long (1000 characters at most).",
  invalid_timezone: "Choose a valid time zone.",
};

export const MENTORSHIP_GENERIC_ERROR = "Something went wrong. Please try again.";
