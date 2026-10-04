import { Skeleton } from "@/components/ui/skeleton";
import { chatStrings as s } from "@/features/settle-in/chat/strings";

export default function ConversationLoading() {
  return (
    <div
      className="mx-auto flex h-[calc(100dvh-11rem)] w-full max-w-2xl flex-col gap-3 md:h-[calc(100dvh-7.5rem)]"
      aria-busy="true"
      aria-label={s.loadingChat}
    >
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="min-h-0 w-full flex-1" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}
