import type { Enums } from "@/types/database";

import type { SessionStatus, SessionType } from "../labels";

export type MentorProfile = {
  headline: string;
  bio: string | null;
  industries: string[];
  yearsExperience: number;
  languages: string[];
  cityId: string | null;
  timezone: string;
  sessionTypes: SessionType[];
  defaultDurationMin: number;
  isAccepting: boolean;
  verificationStatus: Enums<"verification_status">;
  rejectionReason: string | null;
  ratingAvg: number | null;
  ratingCount: number;
  skillIds: string[];
};

export type AvailabilityRule = { id: string; weekday: number; startTime: string; endTime: string };

export type AvailabilityException = {
  id: string;
  onDate: string;
  kind: Enums<"availability_exception_kind">;
  startTime: string | null;
  endTime: string | null;
};

// A session as its mentor sees it. Never includes the mentee's phone or email.
export type MentorSession = {
  id: string;
  menteeId: string;
  menteeName: string;
  sessionType: SessionType;
  startsAt: string;
  endsAt: string;
  status: SessionStatus;
  goalNote: string | null;
  meetingUrl: string | null;
};

export type MentorSessionGroups = {
  requests: MentorSession[];
  upcoming: MentorSession[];
  past: MentorSession[];
};

export type SessionFeedback = { rating: number | null; comment: string | null; nextSteps: string | null };

export type PrivateNote = { id: string; body: string; createdAt: string };

export type MentorSessionDetail = MentorSession & {
  declineReason: string | null;
  cancelReason: string | null;
  cancelledByMe: boolean;
  // Still waiting for an answer and not started yet.
  canRespond: boolean;
  canCancel: boolean;
  hasEnded: boolean;
  canGiveFeedback: boolean;
  myFeedback: SessionFeedback | null;
  menteeFeedback: SessionFeedback | null;
  notes: PrivateNote[];
};
