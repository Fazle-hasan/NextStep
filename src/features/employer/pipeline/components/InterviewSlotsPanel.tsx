"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/utils/dates";

import { cancelInterviewSlot, proposeInterviewSlot } from "../actions";
import type { ApplicantDetail } from "../queries";
import { SLOT_DURATIONS } from "../schemas";
import { pipelineStrings as s } from "../strings";

type Props = { applicationId: string; slots: ApplicantDetail["slots"]; closed: boolean };

// Propose interview times; the applicant picks one from their side.
export function InterviewSlotsPanel({ applicationId, slots, closed }: Props) {
  const router = useRouter();
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [duration, setDuration] = useState<number>(45);
  const [location, setLocation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    // The date and time are in the employer's local time zone; send an absolute UTC timestamp.
    const local = new Date(`${date}T${time}`);
    if (!date || !time || Number.isNaN(local.getTime())) {
      setError(s.errors.slotDateTime);
      return;
    }
    if (local.getTime() <= Date.now()) {
      setError(s.errors.slot_in_past);
      return;
    }
    startTransition(async () => {
      const result = await proposeInterviewSlot({
        applicationId,
        startsAt: local.toISOString(),
        durationMinutes: duration,
        locationOrLink: location,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setDate("");
      setTime("");
      setLocation("");
      toast.success(s.slotProposed);
      router.refresh();
    });
  }

  function onCancel(slotId: string) {
    startTransition(async () => {
      const result = await cancelInterviewSlot({ slotId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(s.slotCancelled);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {!closed && (
        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          <p className="text-sm text-muted-foreground">{s.slotsHint}</p>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="slot-date">{s.slotDate}</Label>
              <Input id="slot-date" type="date" className="h-11 text-base" value={date} onChange={(e) => setDate(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-time">{s.slotTime}</Label>
              <Input id="slot-time" type="time" className="h-11 text-base" value={time} onChange={(e) => setTime(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="slot-duration">{s.slotDuration}</Label>
              <Select value={String(duration)} onValueChange={(v) => setDuration(Number(v))}>
                <SelectTrigger id="slot-duration" className="h-11 w-full text-base">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SLOT_DURATIONS.map((n) => (
                    <SelectItem key={n} value={String(n)}>
                      {s.minutes(n)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="slot-location">{s.slotLocation}</Label>
            <Input
              id="slot-location"
              className="h-11 text-base"
              maxLength={300}
              placeholder={s.slotLocationPlaceholder}
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <Button type="submit" className="h-11" disabled={pending}>
            {pending ? s.proposing : s.proposeSlot}
          </Button>
        </form>
      )}

      {slots.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.noSlots}</p>
      ) : (
        <ul className="space-y-3">
          {slots.map((slot) => (
            <li key={slot.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
              <div className="min-w-0 space-y-1">
                <p className="text-sm font-medium">{formatDateTime(slot.starts_at)}</p>
                {slot.location_or_link && <p className="text-sm break-all text-muted-foreground">{slot.location_or_link}</p>}
                <Badge variant={slot.status === "selected" ? "default" : "secondary"}>{s.slotStatus[slot.status]}</Badge>
              </div>
              {slot.status !== "cancelled" && (
                <Button type="button" variant="outline" className="h-11" disabled={pending} onClick={() => onCancel(slot.id)}>
                  {s.cancelSlot}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
