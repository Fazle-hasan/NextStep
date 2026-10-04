import { Skeleton } from "@/components/ui/skeleton";
import { flatsStrings } from "@/features/settle-in/flats/strings";

export default function FlatLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6" aria-busy="true" aria-label={flatsStrings.search.loading}>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
