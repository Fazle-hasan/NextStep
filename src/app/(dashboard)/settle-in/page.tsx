import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { requireViewer } from "@/features/auth/queries";
import { RequestStatusBadge } from "@/features/settle-in/relocation/components/RequestStatusBadge";
import { NEED_LABELS } from "@/features/settle-in/relocation/labels";
import { getMyRequests } from "@/features/settle-in/relocation/queries";
import { relocationStrings } from "@/features/settle-in/relocation/strings";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: "Settle In" };

const s = relocationStrings.hub;

export default async function SettleInPage() {
  const viewer = await requireViewer("/settle-in");
  const requests = await getMyRequests(viewer.id);

  return (
    <div className="mx-auto w-full max-w-2xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{s.title}</h1>
        <p className="text-muted-foreground">{s.intro}</p>
        <Button asChild className="h-11">
          <Link href="/settle-in/new">{s.newRequest}</Link>
        </Button>
      </div>

      <section className="space-y-3" aria-labelledby="my-requests">
        <h2 id="my-requests" className="text-lg font-semibold">
          {s.myRequests}
        </h2>
        {requests.length === 0 ? (
          <Card>
            <CardContent className="space-y-2 text-center">
              <h3 className="text-base font-semibold">{s.emptyTitle}</h3>
              <p className="text-sm text-muted-foreground">{s.emptyBody}</p>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {requests.map((request) => (
              <li key={request.id}>
                <Card>
                  <CardContent className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-base leading-snug font-semibold">
                        <Link href={`/settle-in/${request.id}`} className="hover:underline focus-visible:underline">
                          {relocationStrings.detail.title(request.cityName)}
                        </Link>
                      </h3>
                      <RequestStatusBadge status={request.status} />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {request.moveTo
                        ? s.movingRange(formatDate(request.moveFrom), formatDate(request.moveTo))
                        : s.moving(formatDate(request.moveFrom))}
                    </p>
                    <p className="text-sm text-muted-foreground">{request.needs.map((need) => NEED_LABELS[need]).join(" · ")}</p>
                    {request.pendingOffers > 0 && (
                      <Link
                        href={`/settle-in/${request.id}`}
                        className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline-offset-4 hover:underline"
                      >
                        {s.offersWaiting(request.pendingOffers)} →
                      </Link>
                    )}
                    {request.acceptedOffers > 0 && <p className="text-sm font-medium">{s.buddiesHelping(request.acceptedOffers)}</p>}
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3" aria-labelledby="more-links">
        <h2 id="more-links" className="text-lg font-semibold">
          {s.more}
        </h2>
        <ul className="grid gap-3 sm:grid-cols-3">
          {s.links.map((link) => (
            <li key={link.href}>
              <Link href={link.href} className="block h-full rounded-xl focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none">
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader>
                    <CardTitle className="text-base">{link.title}</CardTitle>
                    <CardDescription>{link.body}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
