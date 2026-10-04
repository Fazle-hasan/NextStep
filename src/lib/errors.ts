type DbErrorLike = { message?: string; code?: string } | null | undefined;

// Database functions raise short codes as the message (e.g. 'already_applied').
// Map them to user-facing text; never show raw database errors (CLAUDE.md §6).
export function dbErrorMessage(error: DbErrorLike, messages: Record<string, string>, fallback: string): string {
  const key = error?.message?.trim();
  if (key && Object.hasOwn(messages, key)) return messages[key]!;
  if (key === "rate_limit_exceeded") return "You're doing that too often. Please try again later.";
  return fallback;
}
