// Notification types raised by the database (see supabase/migrations/*_notifications.sql and *_cron_jobs.sql),
// grouped for the email preferences page.

export const NOTIFICATION_TYPES = [
  "application_received",
  "application_withdrawn",
  "application_status",
  "interview_slot",
  "interview_slot_picked",
  "job_reviewed",
  "job_alert",
  "session_requested",
  "session_update",
  "relocation_offer",
  "offer_accepted",
  "contact_request",
  "contact_decided",
  "flatmate_request",
  "flatmate_accepted",
  "new_message",
  "verification_decided",
  "suggestion_decided",
  "moderation_warning",
] as const;

export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
  application_received: "Someone applies to my job",
  application_withdrawn: "An applicant withdraws",
  application_status: "My application status changes",
  interview_slot: "An employer proposes interview times",
  interview_slot_picked: "An applicant picks an interview time",
  job_reviewed: "My job post is reviewed",
  job_alert: "Daily job alerts for my saved searches",
  session_requested: "A mentee requests a session",
  session_update: "A session is confirmed, declined or cancelled",
  relocation_offer: "A buddy offers to help with my move",
  offer_accepted: "My offer to help is accepted",
  contact_request: "Someone asks about my flat listing",
  contact_decided: "A lister answers my contact request",
  flatmate_request: "Someone sends me a flatmate request",
  flatmate_accepted: "My flatmate request is accepted",
  new_message: "I get a new chat message",
  verification_decided: "My verification request is decided",
  suggestion_decided: "My place suggestion is reviewed",
  moderation_warning: "Messages from the NextStep team",
};

export type NotificationGroup = { id: string; title: string; types: NotificationType[] };

export const NOTIFICATION_GROUPS: NotificationGroup[] = [
  {
    id: "jobs",
    title: "Jobs and applications",
    types: ["application_status", "interview_slot", "application_received", "application_withdrawn", "interview_slot_picked", "job_reviewed"],
  },
  { id: "alerts", title: "Job alerts", types: ["job_alert"] },
  { id: "mentorship", title: "Mentorship", types: ["session_requested", "session_update"] },
  {
    id: "settle-in",
    title: "Settle In",
    types: ["relocation_offer", "offer_accepted", "contact_request", "contact_decided", "flatmate_request", "flatmate_accepted"],
  },
  { id: "chat", title: "Chat messages", types: ["new_message"] },
  { id: "account", title: "Account and moderation", types: ["verification_decided", "suggestion_decided", "moderation_warning"] },
];
