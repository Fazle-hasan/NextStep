import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getAdminCounts } from "@/features/admin/queries";
import { adminStrings as s } from "@/features/admin/strings";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  const counts = await getAdminCounts();
  const queues = [
    { href: "/admin/verification", ...s.verification, count: counts.verifications },
    { href: "/admin/jobs", ...s.jobs, count: counts.jobs },
  ];

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
      </div>
      <ul className="space-y-3">
        {queues.map((queue) => (
          <li key={queue.href}>
            <Link href={queue.href} className="block rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
              <Card className="transition-colors hover:bg-muted/50">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between gap-2 text-lg">
                    {queue.title}
                    <Badge variant={queue.count > 0 ? "default" : "secondary"}>{s.waiting(queue.count)}</Badge>
                  </CardTitle>
                  <CardDescription>{queue.description}</CardDescription>
                </CardHeader>
              </Card>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
