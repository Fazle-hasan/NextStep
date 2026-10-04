import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="mx-auto w-full max-w-xl space-y-6" aria-busy="true">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-5 w-full" />
      <Skeleton className="h-64 w-full rounded-xl" />
    </div>
  );
}
