import Link from "next/link";

import { Button } from "@/components/ui/button";

import { jobsHref, PAGE_SIZE, type JobFilters } from "../schemas";
import { searchStrings as s } from "../strings";

type Props = { filters: JobFilters; page: number; total: number };

// Previous / next links that keep the current filters.
export function SearchPagination({ filters, page, total }: Props) {
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  if (pages <= 1) return null;

  return (
    <nav aria-label={s.pagination} className="flex items-center justify-between gap-3 pt-2">
      {page > 1 ? (
        <Button asChild variant="outline" className="h-11">
          <Link href={jobsHref(filters, page - 1)} rel="prev">
            {s.previous}
          </Link>
        </Button>
      ) : (
        <span aria-hidden="true" />
      )}
      <p className="text-sm text-muted-foreground">{s.pageOf(Math.min(page, pages), pages)}</p>
      {page < pages ? (
        <Button asChild variant="outline" className="h-11">
          <Link href={jobsHref(filters, page + 1)} rel="next">
            {s.next}
          </Link>
        </Button>
      ) : (
        <span aria-hidden="true" />
      )}
    </nav>
  );
}
