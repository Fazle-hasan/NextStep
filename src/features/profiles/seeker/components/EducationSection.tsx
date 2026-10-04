"use client";

import { Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Tables } from "@/types/database";

import { deleteEducation } from "../actions";
import type { EducationInput } from "../schemas";
import { seekerStrings as s } from "../strings";

import { ConfirmDeleteButton } from "./ConfirmDeleteButton";
import { EducationForm } from "./EducationForm";

type Education = Tables<"educations">;

const EMPTY: EducationInput = { institution: "", degree: "", field: "", startYear: "", endYear: "" };

function toInput(row: Education): EducationInput {
  return {
    id: row.id,
    institution: row.institution,
    degree: row.degree,
    field: row.field ?? "",
    startYear: row.start_year?.toString() ?? "",
    endYear: row.end_year?.toString() ?? "",
  };
}

function years(row: Education): string | null {
  if (row.start_year && row.end_year) return `${row.start_year} – ${row.end_year}`;
  return (row.end_year ?? row.start_year)?.toString() ?? null;
}

export function EducationSection({ educations }: { educations: Education[] }) {
  // null = closed; otherwise the values the dialog form starts with.
  const [editing, setEditing] = useState<EducationInput | null>(null);

  return (
    <div className="space-y-4">
      {educations.length === 0 ? (
        <p className="text-sm text-muted-foreground">{s.education.empty}</p>
      ) : (
        <ul className="divide-y">
          {educations.map((row) => (
            <li key={row.id} className="flex items-start justify-between gap-2 py-3 first:pt-0">
              <div className="min-w-0 space-y-1">
                <p className="font-medium">
                  {row.degree}
                  {row.field ? `, ${row.field}` : ""}
                </p>
                <p className="text-sm text-muted-foreground">{row.institution}</p>
                {years(row) && <p className="text-sm text-muted-foreground">{years(row)}</p>}
              </div>
              <div className="flex shrink-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-11"
                  aria-label={`${s.edit}: ${row.degree}`}
                  onClick={() => setEditing(toInput(row))}
                >
                  <Pencil aria-hidden="true" />
                </Button>
                <ConfirmDeleteButton
                  label={`${s.delete}: ${row.degree}, ${row.institution}`}
                  question={s.education.confirmDelete}
                  onConfirm={() => deleteEducation(row.id)}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
      <Button type="button" variant="outline" className="h-11" onClick={() => setEditing(EMPTY)}>
        <Plus aria-hidden="true" />
        {s.education.add}
      </Button>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id ? s.education.editTitle : s.education.add}</DialogTitle>
            <DialogDescription className="sr-only">{s.education.title}</DialogDescription>
          </DialogHeader>
          {editing && <EducationForm defaults={editing} onDone={() => setEditing(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
