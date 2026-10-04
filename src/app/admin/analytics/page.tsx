import type { Metadata } from "next";
import Link from "next/link";

import { AnalyticsFiltersForm } from "@/features/admin/analytics/components/AnalyticsFiltersForm";
import { CityTable } from "@/features/admin/analytics/components/CityTable";
import { RoleBreakdown } from "@/features/admin/analytics/components/RoleBreakdown";
import { StatGrid } from "@/features/admin/analytics/components/StatGrid";
import { getAnalytics, getCities } from "@/features/admin/analytics/queries";
import { analyticsFiltersSchema, isoDaysAgo } from "@/features/admin/analytics/schemas";
import { analyticsStrings as s } from "@/features/admin/analytics/strings";
import { adminStrings } from "@/features/admin/strings";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: s.title };

export default async function AdminAnalyticsPage({ searchParams }: PageProps<"/admin/analytics">) {
  const filters = analyticsFiltersSchema.parse(await searchParams);
  const [result, cities] = await Promise.all([getAnalytics(filters), getCities()]);
  const from = result.ok ? result.data.from : (filters.from ?? isoDaysAgo(29));
  const to = result.ok ? result.data.to : (filters.to ?? isoDaysAgo(0));

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {adminStrings.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.description}</p>
      </div>

      <AnalyticsFiltersForm filters={filters} from={from} to={to} cities={cities} />

      {result.ok ? (
        <>
          <p className="text-sm text-muted-foreground">{s.range(formatDate(from), formatDate(to))}</p>
          <StatGrid data={result.data} />
          <RoleBreakdown byRole={result.data.signups_by_role} />
          <CityTable rows={result.data.by_city} />
        </>
      ) : (
        <p role="alert" className="rounded-xl border border-destructive/50 p-4 text-sm text-destructive">
          {result.error}
        </p>
      )}
    </div>
  );
}
