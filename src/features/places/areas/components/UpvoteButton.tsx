"use client";

import { ThumbsUp } from "lucide-react";
import { useOptimistic, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { setTipUpvote } from "../actions";
import { areaStrings as s } from "../strings";

type Props = { tipId: string; count: number; upvoted: boolean };

// Toggles the viewer's "helpful" vote on a tip.
export function UpvoteButton({ tipId, count, upvoted }: Props) {
  const [pending, startTransition] = useTransition();
  const [state, setOptimistic] = useOptimistic({ count, upvoted }, (current, next: boolean) => ({
    upvoted: next,
    count: Math.max(0, current.count + (next === current.upvoted ? 0 : next ? 1 : -1)),
  }));

  function onClick() {
    const next = !state.upvoted;
    startTransition(async () => {
      setOptimistic(next);
      const result = await setTipUpvote({ tipId, upvote: next });
      if (!result.ok) toast.error(result.error);
    });
  }

  return (
    <Button
      type="button"
      variant={state.upvoted ? "default" : "outline"}
      size="sm"
      className="h-9"
      onClick={onClick}
      disabled={pending}
      aria-pressed={state.upvoted}
      aria-label={`${state.upvoted ? s.tips.upvoted : s.tips.upvote}. ${s.tips.upvoteCount(state.count)}`}
    >
      <ThumbsUp aria-hidden="true" />
      {state.upvoted ? s.tips.upvoted : s.tips.upvote}
      <span aria-hidden="true">· {state.count}</span>
    </Button>
  );
}
