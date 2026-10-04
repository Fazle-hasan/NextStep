import type { Metadata } from "next";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reviewVerification } from "@/features/admin/actions";
import { ReviewButtons } from "@/features/admin/components/ReviewButtons";
import { getPendingVerifications } from "@/features/admin/queries";
import { adminStrings as s } from "@/features/admin/strings";
import { SESSION_TYPE_LABELS } from "@/features/mentorship/labels";
import { formatDate } from "@/lib/utils/dates";

export const metadata: Metadata = { title: s.verification.title };

export default async function AdminVerificationPage() {
  const requests = await getPendingVerifications();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="space-y-1">
        <Link href="/admin" className="text-sm text-primary hover:underline">
          ← {s.title}
        </Link>
        <h1 className="text-2xl font-semibold tracking-tight">{s.verification.title}</h1>
        <p className="text-muted-foreground">{s.verification.description}</p>
      </div>

      {requests.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-muted-foreground">{s.verification.empty}</p>
      ) : (
        <ul className="space-y-4">
          {requests.map((request) => (
            <li key={request.id}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
                    {request.company?.name ?? request.requesterName}
                    <Badge variant="secondary">{s.verification.kind[request.kind]}</Badge>
                  </CardTitle>
                  <CardDescription>
                    {s.verification.requestedBy} {request.requesterName} · {formatDate(request.createdAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {request.company && (
                    <div className="space-y-1 text-sm">
                      {request.company.industry && <p>{request.company.industry}</p>}
                      {request.company.website && <p className="break-all text-muted-foreground">{request.company.website}</p>}
                      {request.company.description && (
                        <p className="whitespace-pre-line text-muted-foreground">{request.company.description}</p>
                      )}
                    </div>
                  )}
                  {request.kind === "mentor" && (
                    <div className="space-y-1 text-sm">
                      <p className="font-medium">{s.verification.mentorProfile}</p>
                      {request.mentor ? (
                        <>
                          <p>{request.mentor.headline}</p>
                          <p className="text-muted-foreground">{s.verification.mentorYears(request.mentor.yearsExperience)}</p>
                          {request.mentor.industries.length > 0 && (
                            <p className="text-muted-foreground">
                              {s.verification.mentorIndustries}: {request.mentor.industries.join(", ")}
                            </p>
                          )}
                          <p className="text-muted-foreground">
                            {s.verification.mentorSessionTypes}:{" "}
                            {request.mentor.sessionTypes.map((type) => SESSION_TYPE_LABELS[type]).join(", ")}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground">{s.verification.noMentorProfile}</p>
                      )}
                    </div>
                  )}
                  <div className="text-sm">
                    <p className="font-medium">{s.verification.note}</p>
                    <p className="whitespace-pre-line text-muted-foreground">{request.applicantNote ?? s.verification.noNote}</p>
                  </div>
                  <ReviewButtons
                    id={request.id}
                    subject={request.company?.name ?? request.requesterName}
                    action={reviewVerification}
                  />
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
