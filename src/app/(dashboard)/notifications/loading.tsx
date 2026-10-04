import { Skeleton } from "@/components/ui/skeleton";
import { notificationStrings as s } from "@/features/notifications/strings";

export default function NotificationsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label={s.loading}>
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
      <Skeleton className="h-20 w-full" />
    </div>
  );
}
