"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils/dates";
import type { Tables } from "@/types/database";

import { deleteExperience } from "../actions";
import type { ExperienceInput } from "../schemas";
import { seekerStrings as s } from "../strings";

import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { ExperienceForm } from "./ExperienceForm";

type Experience = Tables<"experiences">;

const EMPTY: ExperienceInput = { title: "", companyName: "", startDate: "", endDate: "", isCurrent: false, description: "" };

function toInput(row: Experience): ExperienceInput {
  return {
    id: row.id,
    title: row.title,
    companyName: row.company_name,
    startDate: row.start_date,
    endDate: row.end_date ?? "",
    isCurrent: row.is_current,
    description: row.description ?? "",
  };
}

export function ExperienceSection({ experiences }: { experiences: Experience[] }) {
  // null = closed; otherwise the values the dialog form starts with.
  const [editing, setEditing] = useState<ExperienceInput | null>(null);

  return (
    <div className="space-y-4">
      {experiences.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.experience.empty}</p>
      ) : (
        <ul className="divide-y">
          {experiences.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-2 py-3 first:pt-0">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">{row.title}</p>
                <p className="text-sm text-muted-foreground">{row.company_name}</p>
                <p className="text-sm text-muted-foreground">
                  {formatDate(row.start_date)} – {row.end_date ? formatDate(row.end_date) : s.experience.present}
                </p>
                {row.description && <p className="text-sm whitespace-pre-line">{row.description}</p>}
              </div>
              <div className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`${s.edit}: ${row.title}`}
                  onClick={() => setEditing(toInput(row))}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <ConfirmDeleteButton
                  label={`${s.delete}: ${row.title}, ${row.company_name}`}
                  question={s.experience.confirmDelete}
                  onConfirm={() => deleteExperience(row.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(EMPTY)}>
        <Plus aria-hidden="true" />
        {s.experience.add}
      </Button>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? s.experience.editTitle : s.experience.add}</DialogTitle>
            <DialogDescription className="sr-only">{s.experience.title}</DialogDescription>
          </DialogHeader>
          {editing && <ExperienceForm defaults={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
