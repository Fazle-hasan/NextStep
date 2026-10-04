import { Card, CardContent } from "@/components/ui/card";
import { BlockButton } from "@/features/safety/components/BlockButton";
import { ReportDialog } from "@/features/safety/components/ReportDialog";
import { formatDate, timeAgo } from "@/lib/utils/dates";
import { formatMonthlyBudget } from "@/lib/utils/money";

import { HOUSEHOLD_LABELS, NEED_LABELS } from "../../relocation/labels";
import { relocationStrings } from "../../relocation/strings";
import { buddyStrings } from "../strings";
import type { OpenRequest } from "../types";

import { OfferHelpDialog } from "./OfferHelpDialog";

const s = buddyStrings.requests;
const d = relocationStrings.detail;

// A newcomer's open request as a buddy sees it. First name only; no phone or email.
export function OpenRequestCard({ request }: { request: OpenRequest }) {
  const budget = formatMonthlyBudget(request.budgetMin, request.budgetMax);

  return (
    <Card>
      <CardContent className="space-y-3">
        <div>
          <h3 className="text-base font-semibold">{request.requesterFirstName}</h3>
          <p className="text-sm text-muted-foreground">
            {request.moveTo
              ? s.movingRange(formatDate(request.moveFrom), formatDate(request.moveTo))
              : s.moving(formatDate(request.moveFrom))}
            {" · "}
            {d.posted(timeAgo(request.createdAt))}
          </p>
        </div>
        <dl className="space-y-2 text-sm">
          <div>
            <dt className="font-medium">{d.household}</dt>
            <dd className="text-muted-foreground">{HOUSEHOLD_LABELS[request.household]}</dd>
          </div>
          <div>
            <dt className="font-medium">{d.needs}</dt>
            <dd className="text-muted-foreground">{request.needs.map((need) => NEED_LABELS[need]).join(", ")}</dd>
          </div>
          {budget && (
            <div>
              <dt className="font-medium">{d.budget}</dt>
              <dd className="text-muted-foreground">{budget}</dd>
            </div>
          )}
          {request.areaNames.length > 0 && (
            <div>
              <dt className="font-medium">{d.areas}</dt>
              <dd className="text-muted-foreground">{request.areaNames.join(", ")}</dd>
            </div>
          )}
          {request.workplaceAddress && (
            <div>
              <dt className="font-medium">{d.workplace}</dt>
              <dd className="text-muted-foreground">{request.workplaceAddress}</dd>
            </div>
          )}
          {request.note && (
            <div>
              <dt className="font-medium">{d.note}</dt>
              <dd className="whitespace-pre-line text-muted-foreground">{request.note}</dd>
            </div>
          )}
        </dl>
        <OfferHelpDialog requestId={request.id} requesterName={request.requesterFirstName} />
        <div className="flex flex-wrap gap-1 border-t pt-2">
          <ReportDialog targetType="relocation_request" targetId={request.id} triggerLabel={s.reportLabel} />
          <BlockButton userId={request.requesterId} />
        </div>
      </CardContent>
    </Card>
  );
}
