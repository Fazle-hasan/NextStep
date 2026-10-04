"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { rateBuddy } from "../actions";
import { relocationStrings } from "../strings";

const s = relocationStrings.detail;
const RATINGS = [5, 4, 3, 2, 1];

export function RateBuddyForm({ requestId, buddyId }: { requestId: string; buddyId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState("5");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const ratingId = `rating-${buddyId}`;
  const commentId = `comment-${buddyId}`;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await rateBuddy({ requestId, buddyId, rating, comment });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.rated);
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-3">
      <h4 className="text-sm font-semibold">{s.rateTitle}</h4>
      <div className="space-y-2">
        <Label htmlFor={ratingId}>{s.ratingLabel}</Label>
        <NativeSelect id={ratingId} value={rating} onChange={(event) => setRating(event.target.value)}>
          {RATINGS.map((n) => (
            <option key={n} value={n}>
              {s.ratingOption(n)}
            </option>
          ))}
        </NativeSelect>
      </div>
      <div className="space-y-2">
        <Label htmlFor={commentId}>{s.comment}</Label>
        <Textarea id={commentId} rows={3} maxLength={1000} className="text-base" value={comment} onChange={(event) => setComment(event.target.value)} />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11" disabled={pending}>
        {pending ? s.working : s.submitRating}
      </Button>
    </form>
  );
}
