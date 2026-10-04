import { Skeleton } from "@/components/ui/skeleton";

// Loading placeholder for the company and job form pages.
export function FormSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-4" aria-busy="true">
      <Skeleton className="h-6 w-56" />
      <Skeleton className="h-[32rem] w-full rounded-xl" />
    </div>
  );
}
