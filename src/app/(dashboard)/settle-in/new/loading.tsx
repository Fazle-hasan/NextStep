import { Skeleton } from "@/components/ui/skeleton";

export default function NewRelocationRequestLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label="Loading the request form">
      <Skeleton className="h-8 w-64" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}
