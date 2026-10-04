"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { SESSION_TYPE_LABELS, type SessionType } from "../../labels";
import { bookSession, loadMentorSlots } from "../actions";
import { bookSessionSchema, type BookSessionInput, type BookSessionValues } from "../schemas";
import { formatSlotFull } from "../slots";
import { bookingStrings as s } from "../strings";
import type { Slot } from "../types";
import { useBrowserTimeZone } from "../useBrowserTimeZone";
import { SlotPicker } from "./SlotPicker";

type Props = {
  mentorId: string;
  sessionTypes: SessionType[];
  mentorTimeZone: string;
  initialSlots: Slot[];
};

// Session type -> slot -> goal note -> request. The database re-checks everything on submit.
export function BookingPanel({ mentorId, sessionTypes, mentorTimeZone, initialSlots }: Props) {
  const router = useRouter();
  const timeZone = useBrowserTimeZone();
  const [slots, setSlots] = useState(initialSlots);
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loadingSlots, startLoading] = useTransition();
  const [pending, startTransition] = useTransition();
  const b = s.booking;

  const {
    register,
    control,
    setValue,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<BookSessionInput, unknown, BookSessionValues>({
    resolver: zodResolver(bookSessionSchema),
    defaultValues: {
      mentorId,
      sessionType: sessionTypes.length === 1 ? sessionTypes[0] : undefined,
      startsAt: "",
      goalNote: "",
    },
  });
  const startsAt = useWatch({ control, name: "startsAt" });
  const selectedSlot = slots.find((slot) => slot.startsAt === startsAt);

  function loadPage(next: number) {
    startLoading(async () => {
      const result = await loadMentorSlots({ mentorId, page: next });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSlots(result.data);
      setPage(next);
      setValue("startsAt", "");
    });
  }

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await bookSession(getValues());
      if (!result.ok) {
        setError(result.error);
        // Someone else took the slot: show what is still free.
        if (result.error === s.errors.db.slot_not_available) loadPage(page);
        return;
      }
      toast.success(b.sent);
      router.push(`/sessions/${result.data.sessionId}`);
    });
  }

  return (
    <form onSubmit={handleSubmit(onValid)} className="space-y-6" noValidate>
      <fieldset className="space-y-3">
        <legend className="font-medium">{b.stepType}</legend>
        <div className="flex flex-wrap gap-2">
          {sessionTypes.map((type) => (
            <label
              key={type}
              className="flex min-h-11 cursor-pointer items-center gap-2 rounded-lg border px-3 text-sm has-checked:border-primary has-checked:bg-primary/10 has-focus-visible:ring-3 has-focus-visible:ring-ring/50"
            >
              <input type="radio" value={type} className="size-4 accent-primary" {...register("sessionType")} />
              {SESSION_TYPE_LABELS[type]}
            </label>
          ))}
        </div>
        {errors.sessionType && (
          <p role="alert" className="text-sm text-destructive">
            {b.chooseType}
          </p>
        )}
      </fieldset>

      <section aria-labelledby="slot-heading" className="space-y-3">
        <h3 id="slot-heading" className="font-medium">
          {b.stepSlot}
        </h3>
        <p className="text-sm text-muted-foreground">
          {timeZone ? b.timesIn(timeZone) : ""} {s.mentor.timezone(mentorTimeZone)}
        </p>
        <SlotPicker
          slots={slots}
          timeZone={timeZone}
          selected={startsAt}
          onSelect={(value) => setValue("startsAt", value, { shouldValidate: true })}
          page={page}
          onPage={loadPage}
          loading={loadingSlots}
        />
        {selectedSlot && timeZone && (
          <p role="status" className="text-sm font-medium">
            {b.selected(formatSlotFull(selectedSlot, timeZone))}
          </p>
        )}
        {errors.startsAt && (
          <p role="alert" className="text-sm text-destructive">
            {b.chooseSlot}
          </p>
        )}
      </section>

      <div className="space-y-2">
        <Label htmlFor="goal-note">{b.stepNote}</Label>
        <Textarea
          id="goal-note"
          rows={3}
          maxLength={1000}
          placeholder={b.notePlaceholder}
          className="text-base"
          aria-invalid={Boolean(errors.goalNote)}
          aria-describedby="goal-note-hint"
          {...register("goalNote")}
        />
        <p id="goal-note-hint" className="text-sm text-muted-foreground">
          {b.noteHint}
        </p>
        {errors.goalNote && (
          <p role="alert" className="text-sm text-destructive">
            {errors.goalNote.message}
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto sm:px-8" disabled={pending || loadingSlots}>
        {pending ? b.submitting : b.submit}
      </Button>
    </form>
  );
}
