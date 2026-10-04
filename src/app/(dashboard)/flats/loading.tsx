import { Skeleton } from "@/components/ui/skeleton";
import { flatsStrings } from "@/features/settle-in/flats/strings";

export default function FlatsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6" aria-busy="true" aria-label={flatsStrings.search.loading}>
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <Skeleton className="h-11 w-full md:h-96" />
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
