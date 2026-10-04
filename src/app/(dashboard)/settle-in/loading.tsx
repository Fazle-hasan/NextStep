import { Skeleton } from "@/components/ui/skeleton";

export default function SettleInLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading Settle In">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-11 w-56" />
      <Skeleton className="h-28 w-full" />
      <Skeleton className="h-28 w-full" />
    </div>
  );
}
