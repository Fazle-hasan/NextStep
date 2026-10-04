import { ThumbsUp } from "lucide-react";

import { ReportDialog } from "@/features/safety/components/ReportDialog";
import { formatDate } from "@/lib/utils/dates";

import { areaStrings as s } from "../strings";
import type { AreaTip } from "../types";
import { DeleteTipButton } from "./DeleteTipButton";
import { UpvoteButton } from "./UpvoteButton";

type Props = { tip: AreaTip; signedIn: boolean };

// One community tip. Signed-out visitors see it read-only.
export function TipItem({ tip, signedIn }: Props) {
  const author = tip.isMine ? s.tips.you : (tip.authorName ?? s.tips.anonymousAuthor);

  return (
    <li className="space-y-3 rounded-xl border p-3">
      <p className="break-words whitespace-pre-line">{tip.body}</p>
      <p className="text-sm text-muted-foreground">
        {author} · {formatDate(tip.createdAt)}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {signedIn && !tip.isMine ? (
          <UpvoteButton tipId={tip.id} count={tip.upvoteCount} upvoted={tip.upvotedByMe} />
        ) : (
          <span className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            <ThumbsUp aria-hidden="true" className="size-4" />
            {s.tips.upvoteCount(tip.upvoteCount)}
          </span>
        )}
        {signedIn && tip.isMine && <DeleteTipButton tipId={tip.id} />}
        {signedIn && !tip.isMine && <ReportDialog targetType="area_tip" targetId={tip.id} triggerLabel={s.tips.report} />}
      </div>
    </li>
  );
}
