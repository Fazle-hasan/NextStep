"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/features/profiles/seeker/components/NativeSelect";

import { addAvailabilityRule, deleteAvailabilityRule } from "../actions";
import { ruleSchema } from "../schemas";
import { mentorStrings } from "../strings";
import type { AvailabilityRule } from "../types";

const s = mentorStrings.availability;
const WEEKDAYS = mentorStrings.weekdays;

// "09:00:00" -> "09:00"
export function shortTime(value: string): string {
  return value.slice(0, 5);
}

// Weekly recurring hours, in the mentor's own time zone.
export function RulesEditor({ rules }: { rules: AvailabilityRule[] }) {
  const router = useRouter();
  const [weekday, setWeekday] = useState("1");
  const [startTime, setStartTime] = useState("18:00");
  const [endTime, setEndTime] = useState("20:00");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function add(event: React.FormEvent) {
    event.preventDefault();
    const values = { weekday: Number(weekday), startTime, endTime };
    const parsed = ruleSchema.safeParse(values);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? mentorStrings.errors.invalid);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await addAvailabilityRule(values);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.added);
      router.refresh();
    });
  }

  function remove(id: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteAvailabilityRule({ id });
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
      {rules.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.weeklyEmpty}</p>
      ) : (
        <ul className="divide-y rounded-xl border">
          {rules.map((rule) => (
            <li key={rule.id} className="flex min-h-12 items-center justify-between gap-3 px-3 py-1">
              <span className="text-sm">
                <span className="font-medium">{WEEKDAYS[rule.weekday]}</span>{" "}
                <span className="text-muted-foreground">
                  {shortTime(rule.startTime)} – {shortTime(rule.endTime)}
                </span>
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-10"
                disabled={pending}
                aria-label={`${s.remove}: ${WEEKDAYS[rule.weekday]} ${shortTime(rule.startTime)}`}
                onClick={() => remove(rule.id)}
              >
                {s.remove}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} className="grid grid-cols-2 items-end gap-3 sm:grid-cols-4" noValidate>
        <div className="col-span-2 space-y-2 sm:col-span-1">
          <Label htmlFor="rule-weekday">{s.weekday}</Label>
          <NativeSelect id="rule-weekday" value={weekday} onChange={(event) => setWeekday(event.target.value)}>
            {WEEKDAYS.map((name, index) => (
              <option key={name} value={index}>
                {name}
              </option>
            ))}
          </NativeSelect>
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-start">{s.start}</Label>
          <Input id="rule-start" type="time" className="h-11 text-base" value={startTime} onChange={(event) => setStartTime(event.target.value)} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="rule-end">{s.end}</Label>
          <Input id="rule-end" type="time" className="h-11 text-base" value={endTime} onChange={(event) => setEndTime(event.target.value)} />
        </div>
        <Button type="submit" className="col-span-2 h-11 sm:col-span-1" disabled={pending}>
          {pending ? s.saving : s.addRule}
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
