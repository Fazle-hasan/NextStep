import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { Card, CardContent } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { CloseRequestButtons } from "@/features/settle-in/relocation/components/CloseRequestButtons";
import { OfferCard } from "@/features/settle-in/relocation/components/OfferCard";
import { RequestForm } from "@/features/settle-in/relocation/components/RequestForm";
import { RequestStatusBadge } from "@/features/settle-in/relocation/components/RequestStatusBadge";
import { requestToForm } from "@/features/settle-in/relocation/defaults";
import { HOUSEHOLD_LABELS, NEED_LABELS } from "@/features/settle-in/relocation/labels";
import { getCities, getMyRequest, getNeighbourhoods } from "@/features/settle-in/relocation/queries";
import { relocationStrings } from "@/features/settle-in/relocation/strings";
import { formatDate, timeAgo } from "@/lib/utils/dates";
import { formatMonthlyBudget } from "@/lib/utils/money";

export const metadata: Metadata = { title: "Relocation request" };

const s = relocationStrings.detail;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function RelocationRequestPage({ params }: PageProps<"/settle-in/[id]">) {
  const { id } = await params;
  if (!UUID_RE.test(id)) notFound();
  const viewer = await requireViewer(`/settle-in/${id}`);
  const [request, cities, neighbourhoods] = await Promise.all([getMyRequest(id, viewer.id), getCities(), getNeighbourhoods()]);
  if (!request) notFound();

  const areaNames = neighbourhoods.filter((n) => request.neighbourhoodIds.includes(n.id)).map((n) => n.name);
  const budget = formatMonthlyBudget(request.budgetMin, request.budgetMax);
  const facts: { label: string; value: string }[] = [
    { label: s.household, value: HOUSEHOLD_LABELS[request.household] },
    { label: s.needs, value: request.needs.map((need) => NEED_LABELS[need]).join(", ") },
    ...(budget ? [{ label: s.budget, value: budget }] : []),
    ...(areaNames.length > 0 ? [{ label: s.areas, value: areaNames.join(", ") }] : []),
    ...(request.workplaceAddress ? [{ label: s.workplace, value: request.workplaceAddress }] : []),
    ...(request.note ? [{ label: s.note, value: request.note }] : []),
  ];
  const isOpen = request.status === "open";

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <Link href="/settle-in" className="inline-flex min-h-11 items-center text-sm text-muted-foreground hover:underline">
        ← {relocationStrings.form.back}
      </Link>

      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{s.title(request.cityName)}</h1>
          <RequestStatusBadge status={request.status} />
        </div>
        <p className="text-sm text-muted-foreground">
          {request.moveTo
            ? relocationStrings.hub.movingRange(formatDate(request.moveFrom), formatDate(request.moveTo))
            : relocationStrings.hub.moving(formatDate(request.moveFrom))}
          {" · "}
          {s.posted(timeAgo(request.createdAt))}
        </p>
      </div>

      <Card>
        <CardContent>
          <dl className="space-y-3 text-sm">
            {facts.map((fact) => (
              <div key={fact.label}>
                <dt className="font-medium">{fact.label}</dt>
                <dd className="whitespace-pre-line text-muted-foreground">{fact.value}</dd>
              </div>
            ))}
          </dl>
          {request.sameGenderOnly && <p className="mt-3 text-sm text-muted-foreground">{s.sameGender}</p>}
        </CardContent>
      </Card>

      <section className="space-y-3" aria-labelledby="offers-heading">
        <h2 id="offers-heading" className="text-lg font-semibold">
          {s.offersTitle}
        </h2>
        {request.offers.length === 0 ? (
          <Card>
            <CardContent className="space-y-1 text-center">
              {isOpen ? (
                <>
                  <h3 className="text-base font-semibold">{s.noOffersTitle}</h3>
                  <p className="text-sm text-muted-foreground">{s.noOffersBody}</p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">{s.noOffersClosed}</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {request.offers.map((offer) => (
              <li key={offer.id}>
                <OfferCard requestId={request.id} requestStatus={request.status} offer={offer} />
              </li>
            ))}
          </ul>
        )}
      </section>

      {isOpen && (
        <>
          <section className="space-y-3" aria-labelledby="close-heading">
            <h2 id="close-heading" className="text-lg font-semibold">
              {s.closeTitle}
            </h2>
            <p className="text-sm text-muted-foreground">{s.closeBody}</p>
            <CloseRequestButtons requestId={request.id} />
          </section>

          <details className="rounded-xl border p-4">
            <summary className="min-h-11 cursor-pointer content-center text-base font-semibold">
              {relocationStrings.form.editTitle}
            </summary>
            <div className="pt-4">
              <RequestForm requestId={request.id} defaults={requestToForm(request)} cities={cities} neighbourhoods={neighbourhoods} />
            </div>
          </details>
        </>
      )}
    </div>
  );
}
