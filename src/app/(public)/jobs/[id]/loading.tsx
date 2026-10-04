import { Skeleton } from "@/components/ui/skeleton";

export default function JobLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 md:px-8" aria-busy="true" aria-label="Loading job">
      <Skeleton className="h-5 w-32" />
      <div className="flex gap-4">
        <Skeleton className="size-14 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-3/4" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-11 w-40" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
