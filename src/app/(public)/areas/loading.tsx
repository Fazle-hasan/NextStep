import { Skeleton } from "@/components/ui/skeleton";
import { areaStrings as s } from "@/features/places/areas/strings";

export default function AreasLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 md:px-8" aria-busy="true" aria-label={s.index.loading}>
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-4 sm:grid-cols-2">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-64 w-full rounded-xl" />
        ))}
      </div>
    </div>
  );
}
