import { Skeleton } from "@/components/ui/skeleton";
import { flatsStrings } from "@/features/settle-in/flats/strings";

export default function MyListingsLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label={flatsStrings.manage.title}>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-48" />
      {Array.from({ length: 3 }, (_, i) => (
        <Skeleton key={i} className="h-48 w-full rounded-xl" />
      ))}
    </div>
  );
}
