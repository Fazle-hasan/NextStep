import { Skeleton } from "@/components/ui/skeleton";

export default function CompanyLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pt-6 md:px-8" aria-busy="true" aria-label="Loading company">
      <div className="flex gap-4">
        <Skeleton className="size-16 rounded-xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-5 w-1/3" />
        </div>
      </div>
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-36 w-full rounded-xl" />
    </div>
  );
}
