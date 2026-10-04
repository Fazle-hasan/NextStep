import { Skeleton } from "@/components/ui/skeleton";

export default function JobsLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 pt-6 md:px-8" aria-busy="true" aria-label="Loading jobs">
      <Skeleton className="h-8 w-40" />
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <Skeleton className="h-11 w-full md:h-96" />
        <div className="space-y-3">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-36 w-full rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}
