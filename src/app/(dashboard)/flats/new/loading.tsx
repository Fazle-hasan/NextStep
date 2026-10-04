import { Skeleton } from "@/components/ui/skeleton";
import { flatsStrings } from "@/features/settle-in/flats/strings";

export default function NewFlatLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label={flatsStrings.form.newTitle}>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-1/2" />
      {Array.from({ length: 6 }, (_, i) => (
        <Skeleton key={i} className="h-11 w-full" />
      ))}
    </div>
  );
}
