import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-5 w-48" />
      <Skeleton className="h-8 w-2/3" />
      <div className="flex flex-col gap-4 md:flex-row">
        {Array.from({ length: 3 }, (_, i) => (
          <Skeleton key={i} className="h-40 w-full md:w-72" />
        ))}
      </div>
    </div>
  );
}
