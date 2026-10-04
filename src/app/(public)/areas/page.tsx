import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/features/jobs/search/components/EmptyState";
import { PageFrame } from "@/features/jobs/search/components/PageFrame";
import { getPublicPageViewer } from "@/features/jobs/search/viewer";
import { getAreasIndex } from "@/features/places/areas/queries";
import { areaStrings as s } from "@/features/places/areas/strings";

export const metadata: Metadata = { title: s.index.title };

// Public index of neighbourhoods per launch city.
export default async function AreasPage() {
  const [{ inShell }, cities] = await Promise.all([getPublicPageViewer(), getAreasIndex()]);

  return (
    <PageFrame inShell={inShell} className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{s.index.title}</h1>
        <p className="text-muted-foreground">{s.index.intro}</p>
      </div>

      {cities.length === 0 ? (
        <EmptyState title={s.index.emptyTitle} body={s.index.emptyBody} />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {cities.map((city) => (
            <Card key={city.id}>
              <CardHeader>
                <CardTitle className="text-lg">
                  <h2>{city.name}</h2>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {city.areas.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{s.index.noAreas}</p>
                ) : (
                  <ul className="divide-y">
                    {city.areas.map((area) => (
                      <li key={area.id}>
                        <Link
                          href={`/areas/${city.slug}/${area.slug}`}
                          className="flex min-h-11 items-center justify-between gap-2 py-2 hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
                        >
                          <span>{area.name}</span>
                          {area.hasGuide && <Badge variant="secondary">{s.index.hasGuide}</Badge>}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageFrame>
  );
}
