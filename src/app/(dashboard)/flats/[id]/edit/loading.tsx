import { Skeleton } from "@/components/ui/skeleton";
import { flatsStrings } from "@/features/settle-in/flats/strings";

export default function EditFlatLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-4" aria-busy="true" aria-label={flatsStrings.form.editTitle}>
      <Skeleton className="h-5 w-32" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-32 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
      <Skeleton className="h-56 w-full rounded-xl" />
    </div>
  );
}
