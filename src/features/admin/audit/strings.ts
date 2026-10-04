// User-facing strings for the admin audit log.
export const auditStrings = {
  title: "Audit log",
  description: "Every admin action, newest first.",
  action: "Action",
  actor: "Admin",
  allActions: "All actions",
  allActors: "All admins",
  apply: "Filter",
  clear: "Clear",
  empty: "No admin actions match.",
  unknownActor: "Unknown",
  system: "System",
  target: "Target",
  details: "Details",
  noDetails: "No details",
  newer: "Newer",
  older: "Older",
  page: (page: number) => `Page ${page}`,
  // Readable names for the actions the database records. Unknown ones fall back to the raw text.
  actions: {
    verification_approved: "Verification approved",
    verification_rejected: "Verification rejected",
    job_approved: "Job approved",
    job_rejected: "Job sent back",
    report_dismiss: "Report dismissed",
    report_hide: "Reported content hidden",
    report_warn: "User warned",
    report_suspend: "User suspended from a report",
    user_suspended: "User suspended",
    user_unsuspended: "Suspension lifted",
    content_hidden: "Content hidden",
    content_restored: "Content restored",
    place_suggestion_approved: "Place suggestion approved",
    place_suggestion_rejected: "Place suggestion rejected",
    enrollment_approved: "Enrollment approved",
    enrollment_rejected: "Enrollment rejected",
    enrollment_completed: "Enrollment completed",
    insert: "Created",
    update: "Edited",
    delete: "Deleted",
  } as Record<string, string>,
} as const;

export function actionLabel(action: string): string {
  const known = auditStrings.actions[action];
  if (known) return known;
  const text = action.replaceAll("_", " ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}
