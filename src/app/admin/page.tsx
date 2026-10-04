import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCounts } from "@/features/admin/queries";
import { adminStrings as s } from "@/features/admin/strings";

export const metadata: Metadata = { title: "Admin" };

type AdminCard = { href: string; title: string; description: string; count?: number };

export default async function AdminPage() {
  const counts = await getAdminCounts();
  const cards: AdminCard[] = [
    { href: "/admin/verification", ...s.verification, count: counts.verifications },
    { href: "/admin/jobs", ...s.jobs, count: counts.jobs },
    { href: "/admin/moderation", ...s.home.moderation, count: counts.reports },
    { href: "/admin/users", ...s.home.users },
    { href: "/admin/places", ...s.home.places, count: counts.placeSuggestions },
    { href: "/admin/areas", ...s.home.areas },
    { href: "/admin/analytics", ...s.home.analytics },
    { href: "/admin/audit", ...s.home.audit },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className="block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <Card className="h-full transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-lg">
                    {card.title}
                    {card.count !== undefined && (
                      <Badge variant={card.count > 0 ? "default" : "secondary"}>{s.waiting(card.count)}</Badge>
                    )}
                  </CardTitle>
                  <CardDescription>{card.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
