import { getUnreadConversationCount } from "@/features/settle-in/chat/queries";

// Unread chat messages on the Inbox tab. Server component, rendered inside <Suspense> by the shell.
export async function InboxCount() {
  const count = await getUnreadConversationCount();
  if (count <= 0) return null;
  return (
    <span className="absolute -top-1 right-1 min-w-4 rounded-full bg-destructive px-1 text-center text-[0.625rem] leading-4 font-semibold text-destructive-foreground">
      {count > 99 ? "99+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}
