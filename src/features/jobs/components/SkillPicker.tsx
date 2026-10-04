"use client";

import { X } from "lucide-react";
import { useId, useMemo, useState, useTransition } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { addSkill } from "../actions";
import type { SkillOption } from "../types";

type Props = {
  id?: string;
  skills: SkillOption[];
  value: string[];
  onChange: (skillIds: string[]) => void;
  max?: number;
  "aria-describedby"?: string;
};

// Type to search the shared skill list; pick a suggestion or add a new skill.
export function SkillPicker({ id, skills, value, onChange, max = 15, ...aria }: Props) {
  const listId = useId();
  const [known, setKnown] = useState(skills);
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => known.filter((s) => value.includes(s.id)), [known, value]);
  const text = query.trim().toLowerCase();
  const suggestions = useMemo(
    () => (text ? known.filter((s) => !value.includes(s.id) && s.name.toLowerCase().includes(text)).slice(0, 8) : []),
    [known, value, text],
  );
  const exact = known.find((s) => s.name.toLowerCase() === text);
  const full = value.length >= max;

  function add(skill: SkillOption) {
    if (!value.includes(skill.id) && !full) onChange([...value, skill.id]);
    setQuery("");
    setError(null);
  }

  function addNew() {
    if (!text || full) return;
    if (exact) {
      add(exact);
      return;
    }
    startTransition(async () => {
      const result = await addSkill(query);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setKnown((list) => (list.some((s) => s.id === result.data.id) ? list : [...list, result.data]));
      add(result.data);
    });
  }

  return (
    <div className="space-y-2">
      {selected.length > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="Selected skills">
          {selected.map((skill) => (
            <li key={skill.id}>
              <Badge variant="secondary" className="h-8 gap-1 pr-1 text-sm">
                {skill.name}
                <button
                  type="button"
                  className="rounded-full p-1 hover:bg-foreground/10"
                  aria-label={`Remove ${skill.name}`}
                  onClick={() => onChange(value.filter((v) => v !== skill.id))}
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input
          id={id}
          role="combobox"
          aria-expanded={suggestions.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          autoComplete="off"
          className="h-11 text-base"
          placeholder={full ? `Up to ${max} skills` : "Type a skill, e.g. Excel"}
          value={query}
          disabled={full || pending}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (suggestions[0] && !exact) add(suggestions[0]);
              else addNew();
            }
          }}
          {...aria}
        />
        <Button type="button" variant="outline" className="h-11" disabled={!text || full || pending} onClick={addNew}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      <ul id={listId} role="listbox" aria-label="Skill suggestions" className="flex flex-wrap gap-2">
        {suggestions.map((skill) => (
          <li key={skill.id} role="option" aria-selected="false">
            <Button type="button" variant="outline" size="sm" className="h-9" onClick={() => add(skill)}>
              + {skill.name}
            </Button>
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
