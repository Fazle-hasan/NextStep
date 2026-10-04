import { Skeleton } from "@/components/ui/skeleton";
import { notificationStrings } from "@/features/notifications/strings";

export default function NotificationSettingsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label={notificationStrings.settings.loading}>
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-64 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
