import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DeleteGuideButton } from "@/features/places/admin/components/DeleteGuideButton";
import { GuideForm } from "@/features/places/admin/components/GuideForm";
import { TipHideButton } from "@/features/places/admin/components/TipHideButton";
import { getAdminArea, getAdminTips } from "@/features/places/admin/queries";
import { LISTING_TYPES, type GuideFormInput } from "@/features/places/admin/schemas";
import { placesAdminStrings as s } from "@/features/places/admin/strings";
import type { AdminAreaDetail } from "@/features/places/admin/types";
import { formatDate } from "@/lib/utils/dates";
import { paiseToRupees } from "@/lib/utils/money";

async function loadArea(id: string): Promise<AdminAreaDetail | null> {
  if (!z.guid().safeParse(id).success) return null;
  return getAdminArea(id);
}

export async function generateMetadata({ params }: PageProps<"/admin/areas/[neighbourhoodId]">): Promise<Metadata> {
  const { neighbourhoodId } = await params;
  const area = await loadArea(neighbourhoodId);
  return { title: area ? s.guide.title(area.name) : s.pages.areaNotFoundTitle };
}

function toFormInput(area: AdminAreaDetail): GuideFormInput {
  const guide = area.guide;
  const rentRow = (type: (typeof LISTING_TYPES)[number]) => {
    const range = guide?.rentRanges[type];
    return range
      ? { min: String(Math.round(paiseToRupees(range.min))), max: String(Math.round(paiseToRupees(range.max))) }
      : { min: "", max: "" };
  };
  return {
    neighbourhoodId: area.id,
    summary: guide?.summary ?? "",
    rent: {
      entire_flat: rentRow("entire_flat"),
      private_room: rentRow("private_room"),
      shared_room: rentRow("shared_room"),
      pg_hostel: rentRow("pg_hostel"),
    },
    commuteNotes: guide?.commuteNotes ?? "",
    safetyNotes: guide?.safetyNotes ?? "",
    halalFoodNotes: guide?.halalFoodNotes ?? "",
    isPublished: guide?.isPublished ?? false,
  };
}

export default async function AdminAreaGuidePage({ params }: PageProps<"/admin/areas/[neighbourhoodId]">) {
  const { neighbourhoodId } = await params;
  const area = await loadArea(neighbourhoodId);
  if (!area) notFound();
  const tips = await getAdminTips(area.id);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-2">
        <Link href="/admin/areas" className="text-sm text-primary hover:underline">
          ← {s.pages.backToAreas}
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{s.guide.title(area.name)}</h1>
            <p className="text-muted-foreground">{area.cityName}</p>
          </div>
          <Button asChild variant="outline" className="h-11">
            <Link href={`/areas/${area.citySlug}/${area.slug}`}>{s.guide.viewPublic}</Link>
          </Button>
        </div>
      </div>

      <GuideForm initial={toFormInput(area)} />
      {area.guide && <DeleteGuideButton neighbourhoodId={area.id} />}

      <section aria-labelledby="tips-heading" className="space-y-3">
        <h2 id="tips-heading" className="text-lg font-semibold">
          {s.tips.title}
        </h2>
        {tips.length === 0 ? (
          <p className="rounded-xl border border-dashed p-6 text-center text-muted-foreground">{s.tips.empty}</p>
        ) : (
          <ul className="space-y-3">
            {tips.map((tip) => (
              <li key={tip.id}>
                <Card>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      <span className="font-medium text-foreground">{tip.authorName ?? s.tips.unknownAuthor}</span>
                      <span>{formatDate(tip.createdAt)}</span>
                      <span>{s.tips.upvotes(tip.upvoteCount)}</span>
                      {tip.isHidden && <Badge variant="destructive">{s.tips.hiddenBadge}</Badge>}
                      {tip.isDeleted && <Badge variant="outline">{s.tips.deletedBadge}</Badge>}
                    </div>
                    <p className="whitespace-pre-line">{tip.body}</p>
                    {!tip.isDeleted && <TipHideButton id={tip.id} neighbourhoodId={area.id} isHidden={tip.isHidden} />}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
