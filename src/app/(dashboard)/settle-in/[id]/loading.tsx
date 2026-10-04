import { Skeleton } from "@/components/ui/skeleton";

export default function RelocationRequestLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading the request">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-6 w-40" />
      <Skeleton className="h-36 w-full" />
    </div>
  );
}
