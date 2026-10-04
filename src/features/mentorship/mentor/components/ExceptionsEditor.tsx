"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { addAvailabilityException, deleteAvailabilityException } from "../actions";
import { EXCEPTION_MODES, exceptionSchema, type ExceptionMode } from "../schemas";
import { mentorStrings } from "../strings";
import type { AvailabilityException } from "../types";

import { shortTime } from "./RulesEditor";

const s = mentorStrings.availability;

// "2026-11-01" -> "Sun, 1 Nov 2026" (a calendar date, so no time zone conversion).
function formatDay(value: string): string {
  return new Intl.DateTimeFormat("en-IN", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(
    new Date(`${value}T00:00:00Z`),
  );
}

function describe(exception: AvailabilityException): string {
  if (exception.kind === "extra") return s.kinds.extra;
  return exception.startTime ? s.kinds.unavailable_range : s.kinds.unavailable_day;
}

// One-off changes on a single date: a blocked day, blocked hours, or extra hours.
export function ExceptionsEditor({ exceptions }: { exceptions: AvailabilityException[] }) {
  const router = useRouter();
  const [onDate, setOnDate] = useState("");
  const [mode, setMode] = useState<ExceptionMode>("unavailable_day");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const needsTimes = mode !== "unavailable_day";

  function add(event: React.FormEvent) {
    event.preventDefault();
    const values = { onDate, mode, startTime: needsTimes ? startTime : "", endTime: needsTimes ? endTime : "" };
    const parsed = exceptionSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? mentorStrings.errors.invalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addAvailabilityException(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.added);
      setOnDate("");
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAvailabilityException({ id });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.removed);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {exceptions.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.exceptionsEmpty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {exceptions.map((exception) => (
            <li key={exception.id} className="flex min-h-12 items-center justify-between gap-3 px-3 py-2">
              <span className="text-sm">
                <span className="font-medium">{formatDay(exception.onDate)}</span>
                <span className="block text-muted-foreground">
                  {describe(exception)}
                  {exception.startTime && exception.endTime
                    ? `: ${shortTime(exception.startTime)} – ${shortTime(exception.endTime)}`
                    : ""}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10"
                disabled={pending}
                aria-label={`${s.remove}: ${formatDay(exception.onDate)}`}
                onClick={() => remove(exception.id)}
              >
                {s.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="grid grid-cols-2 items-end gap-3" noValidate>
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <Label htmlFor="exception-date">{s.date}</Label>
          <Input id="exception-date" type="date" className="h-11 text-base" value={onDate} onChange={(event) => setOnDate(event.target.value)} />
        </div>
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <Label htmlFor="exception-kind">{s.kind}</Label>
          <NativeSelect id="exception-kind" value={mode} onChange={(event) => setMode(event.target.value as ExceptionMode)}>
            {EXCEPTION_MODES.map((value) => (
              <option key={value} value={value}>
                {s.kinds[value]}
              </option>
            ))}
          </NativeSelect>
        </div>
        {needsTimes && (
          <>
            <div className="space-y-2">
              <Label htmlFor="exception-start">{s.start}</Label>
              <Input
                id="exception-start"
                type="time"
                className="h-11 text-base"
                value={startTime}
                onChange={(event) => setStartTime(event.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exception-end">{s.end}</Label>
              <Input id="exception-end" type="time" className="h-11 text-base" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
            </div>
          </>
        )}
        <Button type="submit" className="col-span-2 h-11 sm:w-fit sm:px-6" disabled={pending}>
          {pending ? s.saving : s.addException}
        </Button>
      </form>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
