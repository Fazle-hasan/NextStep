import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { adminStrings } from "@/features/admin/strings";
import { getAdminAreas } from "@/features/places/admin/queries";
import { placesAdminStrings as s } from "@/features/places/admin/strings";
import type { GuideStatus } from "@/features/places/admin/types";

export const metadata: Metadata = { title: s.areas.title };

function StatusBadge({ status }: { status: GuideStatus }) {
  if (status === "published") return <Badge>{s.areas.published}</Badge>;
  if (status === "draft") return <Badge variant="secondary">{s.areas.draft}</Badge>;
  return <Badge variant="outline">{s.areas.none}</Badge>;
}

export default async function AdminAreasPage() {
  const cities = await getAdminAreas();
  const hasAreas = cities.some((city) => city.areas.length > 0);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {adminStrings.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.areas.title}</h1>
        <p className="text-muted-foreground">{s.areas.description}</p>
      </div>

      {!hasAreas ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.areas.empty}</p>
      ) : (
        <div className="space-y-4">
          {cities
            .filter((city) => city.areas.length > 0)
            .map((city) => (
              <Card key={city.id}>
                <CardHeader>
                  <CardTitle className="text-lg">
                    <h2>{city.name}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="divide-y">
                    {city.areas.map((area) => (
                      <li key={area.id}>
                        <Link
                          href={`/admin/areas/${area.id}`}
                          className="flex min-h-11 items-center justify-between gap-3 py-2 hover:underline"
                        >
                          <span className="font-medium">{area.name}</span>
                          <span className="flex shrink-0 items-center gap-2">
                            <span className="text-sm text-muted-foreground">{s.areas.tips(area.tipCount)}</span>
                            <StatusBadge status={area.status} />
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}
