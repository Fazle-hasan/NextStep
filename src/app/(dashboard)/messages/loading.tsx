import { Skeleton } from "@/components/ui/skeleton";
import { chatStrings as s } from "@/features/settle-in/chat/strings";

export default function MessagesLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label={s.loadingList}>
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
