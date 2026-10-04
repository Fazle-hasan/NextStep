import { Skeleton } from "@/components/ui/skeleton";
import { mapPageStrings } from "@/features/places/map/strings";

export default function MapLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl space-y-6" aria-busy="true" aria-label={mapPageStrings.results.loading}>
      <Skeleton className="h-8 w-32" />
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <Skeleton className="h-11 w-full md:h-96" />
        <div className="space-y-4">
          <Skeleton className="h-[45vh] w-full rounded-xl md:h-[60vh]" />
          <div className="grid gap-3 lg:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
