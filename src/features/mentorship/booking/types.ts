import type { SessionStatus, SessionType } from "../labels";

export type Option = { id: string; name: string };

export type MentorFilters = { cityId?: string; sessionType?: SessionType; skillId?: string };

export type MentorSummary = {
  id: string;
  name: string | null;
  headline: string;
  yearsExperience: number;
  cityName: string | null;
  industries: string[];
  sessionTypes: SessionType[];
  ratingAvg: number | null;
  ratingCount: number;
};

export type MentorDetail = MentorSummary & {
  bio: string | null;
  languages: string[];
  skills: string[];
  timezone: string;
  durationMin: number;
  // Approved and accepting bookings (a mentor you had a session with stays visible after pausing).
  isBookable: boolean;
};

// A free bookable time, as ISO timestamps (UTC).
export type Slot = { startsAt: string; endsAt: string };

export type SessionSummary = {
  id: string;
  mentorId: string;
  mentorName: string | null;
  sessionType: SessionType;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
};

export type FeedbackEntry = {
  rating: number | null;
  comment: string | null;
  nextSteps: string | null;
};

export type SessionDetail = SessionSummary & {
  menteeId: string;
  goalNote: string | null;
  meetingUrl: string | null;
  declineReason: string | null;
  cancelReason: string | null;
  cancelledBy: string | null;
  myFeedback: FeedbackEntry | null;
  mentorFeedback: FeedbackEntry | null;
  // Worked out when the session was loaded.
  hasStarted: boolean;
  hasEnded: boolean;
};

export type MySessions = { upcoming: SessionSummary[]; past: SessionSummary[] };
