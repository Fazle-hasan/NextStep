import type { Metadata } from "next";
import Link from "next/link";

import { ReportCard } from "@/features/admin/moderation/components/ReportCard";
import { getReports } from "@/features/admin/moderation/queries";
import { moderationTabSchema } from "@/features/admin/moderation/schemas";
import { moderationStrings as s } from "@/features/admin/moderation/strings";
import { adminStrings } from "@/features/admin/strings";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: s.title };

const TABS = ["open", "resolved"] as const;

export default async function AdminModerationPage({ searchParams }: PageProps<"/admin/moderation">) {
  const params = await searchParams;
  const tab = moderationTabSchema.parse(Array.isArray(params.tab) ? params.tab[0] : params.tab);
  const reports = await getReports(tab);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {adminStrings.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.description}</p>
      </div>

      <nav aria-label={s.title} className="flex gap-2">
        {TABS.map((item) => (
          <Link
            key={item}
            href={item === "open" ? "/admin/moderation" : "/admin/moderation?tab=resolved"}
            aria-current={item === tab ? "page" : undefined}
            className={cn(
              "flex h-11 items-center rounded-lg border px-4 text-sm font-medium",
              item === tab ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            {s.tabs[item]}
          </Link>
        ))}
      </nav>

      {reports.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">
          {tab === "open" ? s.emptyOpen : s.emptyResolved}
        </p>
      ) : (
        <ul className="space-y-4">
          {reports.map((report) => (
            <li key={report.id}>
              <ReportCard report={report} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
