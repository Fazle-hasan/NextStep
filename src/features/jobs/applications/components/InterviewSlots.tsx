"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { pickInterviewSlot } from "../actions";
import { isHttpUrl } from "../schemas";
import { applicationsStrings as s } from "../strings";

export type SlotView = {
  id: string;
  when: string; // already formatted on the server
  location: string | null;
  status: "proposed" | "selected";
};

type Props = { slots: SlotView[]; canPick: boolean };

// Proposed interview times with a "pick" button, or the confirmed time.
export function InterviewSlots({ slots, canPick }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = slots.find((slot) => slot.status === "selected");
  const shown = selected ? [selected] : slots;

  function pick(slotId: string) {
    setError(null);
    setPendingId(slotId);
    startTransition(async () => {
      const result = await pickInterviewSlot({ slotId });
      setPendingId(null);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.slotPicked);
      router.refresh();
    });
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">{selected ? s.interviewConfirmed : s.interviewPickHint}</p>
      <ul className="space-y-3">
        {shown.map((slot) => (
          <li
            key={slot.id}
            className={`space-y-2 rounded-lg border p-3 ${slot.status === "selected" ? "border-primary bg-primary/5" : ""}`}
          >
            <p className="font-medium">{slot.when}</p>
            {slot.location && (
              <p className="text-sm break-words text-muted-foreground">
                {s.where}:{" "}
                {isHttpUrl(slot.location) ? (
                  <a
                    href={slot.location.trim()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline underline-offset-4"
                  >
                    {slot.location.trim()}
                  </a>
                ) : (
                  slot.location
                )}
              </p>
            )}
            {slot.status === "proposed" && canPick && (
              <Button type="button" className="h-11 w-full sm:w-auto" disabled={pending} onClick={() => pick(slot.id)}>
                {pendingId === slot.id ? s.picking : s.pickSlot}
              </Button>
            )}
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
