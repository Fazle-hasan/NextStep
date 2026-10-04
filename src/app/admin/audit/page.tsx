import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { AuditEntryItem } from "@/features/admin/audit/components/AuditEntryItem";
import { AuditFiltersForm } from "@/features/admin/audit/components/AuditFiltersForm";
import { getAuditEntries, getAuditFilterOptions } from "@/features/admin/audit/queries";
import { auditFiltersSchema, auditHref } from "@/features/admin/audit/schemas";
import { auditStrings as s } from "@/features/admin/audit/strings";
import { adminStrings } from "@/features/admin/strings";

export const metadata: Metadata = { title: s.title };

export default async function AdminAuditPage({ searchParams }: PageProps<"/admin/audit">) {
  const filters = auditFiltersSchema.parse(await searchParams);
  const [{ entries, hasMore }, options] = await Promise.all([getAuditEntries(filters), getAuditFilterOptions()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {adminStrings.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.description}</p>
      </div>

      <AuditFiltersForm filters={filters} actions={options.actions} admins={options.admins} />

      {entries.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.empty}</p>
      ) : (
        <ul className="space-y-3">
          {entries.map((entry) => (
            <AuditEntryItem key={entry.id} entry={entry} />
          ))}
        </ul>
      )}

      {(filters.page > 1 || hasMore) && (
        <nav aria-label={s.page(filters.page)} className="flex items-center justify-between gap-3">
          {filters.page > 1 ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={auditHref(filters, filters.page - 1)}>← {s.newer}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-sm text-muted-foreground">{s.page(filters.page)}</span>
          {hasMore ? (
            <Button asChild variant="outline" className="h-11">
              <Link href={auditHref(filters, filters.page + 1)}>{s.older} →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  );
}
