import type { Enums } from "@/types/database";

// User-facing strings for the moderation queue.
export const TARGET_TYPE_LABELS: Record<Enums<"report_target_type">, string> = {
  user: "User",
  company: "Company",
  job: "Job",
  flat_listing: "Flat listing",
  relocation_request: "Relocation request",
  review: "Buddy review",
  area_tip: "Area tip",
  message: "Chat message",
  place_suggestion: "Place suggestion",
};

export const REPORT_STATUS_LABELS: Record<Enums<"report_status">, string> = {
  open: "Open",
  dismissed: "Dismissed",
  actioned: "Action taken",
};

export const moderationStrings = {
  title: "Moderation",
  description: "Reports from members. Every action is written to the audit log.",
  tabs: { open: "Open", resolved: "Resolved" },
  emptyOpen: "No open reports.",
  emptyResolved: "No resolved reports yet.",
  reportedBy: "Reported by",
  reporterGone: "a deleted account",
  details: "Details from the reporter",
  noDetails: "No details given.",
  content: "Reported content",
  contentMissing: "This content no longer exists.",
  owner: "Posted by",
  ownerUnknown: "Unknown",
  suspended: "Suspended",
  hidden: "Hidden",
  photoOnly: "(photo only)",
  resolution: "Resolution",
  noNote: "No note.",
  actions: {
    dismiss: "Dismiss",
    hide: "Hide content",
    warn: "Warn user",
    suspend: "Suspend user",
  },
  dialog: {
    dismiss: { title: "Dismiss this report?", body: "Nothing happens to the content.", note: "Note (optional, kept in the audit log)" },
    hide: { title: "Hide this content?", body: "It will no longer be visible to other members.", note: "Note (optional, kept in the audit log)" },
    warn: { title: "Warn this user?", body: "They receive a notification with your note.", note: "Message to the user" },
    suspend: {
      title: "Suspend this user?",
      body: "They can no longer post, message or be seen. The reported content is hidden too.",
      note: "Reason (kept in the audit log)",
    },
  },
  noteRequired: "Write a note of at least 5 characters.",
  confirm: "Confirm",
  cancel: "Cancel",
  working: "Saving…",
  done: "Report resolved.",
  errors: {
    admin_only: "Only admins can do this.",
    invalid_action: "That action is not available.",
    note_too_long: "Keep the note under 1000 characters.",
    note_required: "A note is required for this action.",
    reason_required: "A reason is required to suspend a user.",
    report_not_found: "That report no longer exists.",
    report_already_resolved: "Someone already resolved this report.",
    cannot_hide_user: "A user cannot be hidden. Suspend the account instead.",
    user_not_found: "The user behind this content no longer exists.",
    cannot_suspend_self: "You cannot suspend your own account.",
    cannot_suspend_admin: "Admins cannot be suspended.",
    generic: "Could not save. Please try again.",
  },
} as const;
