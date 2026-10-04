import { StatusBadge } from "@/components/shared/StatusBadge";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { reportReasonLabels } from "@/features/safety/strings";
import { formatDate } from "@/lib/utils/dates";

import type { ModerationReport } from "../queries";
import { moderationStrings as s, REPORT_STATUS_LABELS, TARGET_TYPE_LABELS } from "../strings";
import { ReportActions } from "./ReportActions";

// One report with a plain-text preview of the reported content.
export function ReportCard({ report }: { report: ModerationReport }) {
  const { preview } = report;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex flex-wrap items-center gap-2 text-lg">
          {reportReasonLabels[report.reason]}
          <Badge variant="secondary">{TARGET_TYPE_LABELS[report.targetType]}</Badge>
          {report.status !== "open" && <StatusBadge status={report.status} label={REPORT_STATUS_LABELS[report.status]} />}
        </CardTitle>
        <CardDescription>
          {s.reportedBy} {report.reporterName ?? s.reporterGone} · {formatDate(report.createdAt)}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm">
          <p className="font-medium">{s.details}</p>
          <p className="break-words whitespace-pre-line text-muted-foreground">{report.details ?? s.noDetails}</p>
        </div>

        <div className="space-y-1 rounded-lg border bg-muted/40 p-3 text-sm">
          <p className="font-medium">{s.content}</p>
          {preview ? (
            <>
              <p className="break-words whitespace-pre-line">{preview.title}</p>
              {preview.lines.map((line) => (
                <p key={line} className="break-words text-muted-foreground">
                  {line}
                </p>
              ))}
              <p className="text-muted-foreground">
                {s.owner}: {report.ownerName ?? s.ownerUnknown}
              </p>
              {preview.flags.length > 0 && (
                <p className="flex flex-wrap gap-1 pt-1">
                  {preview.flags.map((flag) => (
                    <Badge key={flag} variant="outline">
                      {flag}
                    </Badge>
                  ))}
                </p>
              )}
            </>
          ) : (
            <p className="text-muted-foreground">{s.contentMissing}</p>
          )}
        </div>

        {report.status === "open" ? (
          <ReportActions
            reportId={report.id}
            canHide={report.targetType !== "user" && preview !== null}
            hasOwner={Boolean(preview?.ownerId)}
          />
        ) : (
          <div className="text-sm">
            <p className="font-medium">
              {s.resolution}
              {report.resolverName ? ` · ${report.resolverName}` : ""}
              {report.resolvedAt ? ` · ${formatDate(report.resolvedAt)}` : ""}
            </p>
            <p className="break-words whitespace-pre-line text-muted-foreground">{report.resolutionNote ?? s.noNote}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
