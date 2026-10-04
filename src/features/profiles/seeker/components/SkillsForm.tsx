"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { SkillPicker } from "@/features/jobs/components/SkillPicker";
import type { SkillOption } from "@/features/jobs/types";

import { saveSkills } from "../actions";
import { MAX_SKILLS } from "../schemas";
import { seekerStrings as s } from "../strings";

type Props = { skills: SkillOption[]; selectedIds: string[] };

export function SkillsForm({ skills, selectedIds }: Props) {
  const [value, setValue] = useState(selectedIds);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSkills({ skillIds: value });
      if (result.ok) toast.success(s.saved);
      else setError(result.error);
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="skill-picker">{s.skills.label}</Label>
        <SkillPicker
          id="skill-picker"
          skills={skills}
          value={value}
          onChange={setValue}
          max={MAX_SKILLS}
          aria-describedby="skill-picker-hint"
        />
        <p id="skill-picker-hint" className="text-sm text-muted-foreground">
          {s.skills.hint}
        </p>
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" className="h-11 w-full sm:w-auto sm:px-8" disabled={pending}>
        {pending ? s.saving : s.save}
      </Button>
    </form>
  );
}
