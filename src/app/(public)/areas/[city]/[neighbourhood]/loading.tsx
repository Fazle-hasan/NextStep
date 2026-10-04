import { Skeleton } from "@/components/ui/skeleton";
import { areaStrings as s } from "@/features/places/areas/strings";

export default function AreaGuideLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 md:px-8" aria-busy="true" aria-label={s.guide.loading}>
      <Skeleton className="h-4 w-32" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-11 w-full sm:w-72" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-64 w-full rounded-xl" />
      <Skeleton className="h-40 w-full rounded-xl" />
    </div>
  );
}
