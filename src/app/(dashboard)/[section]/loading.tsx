import { Skeleton } from "@/components/ui/skeleton";

export default function SectionLoading() {
  return (
    <div className="mx-auto max-w-3xl space-y-6" aria-busy="true">
      <Skeleton className="h-28 rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} className="h-16 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
