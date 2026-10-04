import type { Enums } from "@/types/database";

// User-facing strings for report and block (kept in one place for later Urdu/Hindi translation).
export const safetyStrings = {
  report: "Report",
  reportTitle: "Report this",
  reportDescription: "Our team reviews every report. The person you report is not told who reported them.",
  reason: "Reason",
  details: "Details (optional)",
  detailsHint: "Up to 2000 characters.",
  submitReport: "Send report",
  sending: "Sending…",
  cancel: "Cancel",
  reportSent: "Thanks. Our team will review your report.",
  block: "Block",
  unblock: "Unblock",
  blockTitle: "Block this person?",
  blockDescription: "You won't see each other's profiles, listings or messages. They are not notified.",
  confirmBlock: "Block",
  blocking: "Blocking…",
  blocked: "User blocked.",
  unblocked: "User unblocked.",
  errors: {
    invalid: "Please check the form and try again.",
    rateLimited: "You've sent a lot of reports. Please try again later.",
    duplicate: "You already reported this. Our team is reviewing it.",
    self: "You can't report yourself.",
    blockSelf: "You can't block yourself.",
    signedOut: "Please sign in first.",
    generic: "Something went wrong. Please try again.",
  },
} as const;

export const reportReasonLabels: Record<Enums<"report_reason">, string> = {
  spam: "Spam or scam",
  harassment: "Harassment or abuse",
  inappropriate: "Inappropriate content",
  fraud: "Fraud or fake listing",
  fake_profile: "Fake profile",
  safety: "Safety concern",
  other: "Something else",
};
