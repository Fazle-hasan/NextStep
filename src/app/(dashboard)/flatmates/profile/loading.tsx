import { Skeleton } from "@/components/ui/skeleton";

export default function FlatmateProfileLoading() {
  return (
    <div className="mx-auto max-w-2xl space-y-6" aria-busy="true" aria-label="Loading your flatmate profile">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-5 w-72 max-w-full" />
      </div>
      <Skeleton className="h-[40rem] w-full rounded-xl" />
    </div>
  );
}
