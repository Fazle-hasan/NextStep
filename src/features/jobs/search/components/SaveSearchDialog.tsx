"use client";

import { BellPlus } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { saveSearch } from "../actions";
import type { JobFilters } from "../schemas";
import { searchStrings as s } from "../strings";

type Props = { filters: JobFilters; suggestedName: string };

// Saves the current filters under a name, optionally with a daily alert.
export function SaveSearchDialog({ filters, suggestedName }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(suggestedName);
  const [daily, setDaily] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await saveSearch({ name, daily, filters });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.saveSearch.done);
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11">
          <BellPlus aria-hidden="true" />
          {s.saveSearch.open}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.saveSearch.title}</DialogTitle>
          <DialogDescription>{s.saveSearch.description}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-5" noValidate>
          <div className="space-y-2">
            <Label htmlFor="saved-search-name">{s.saveSearch.nameLabel}</Label>
            <Input
              id="saved-search-name"
              value={name}
              maxLength={80}
              placeholder={s.saveSearch.namePlaceholder}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "saved-search-error" : undefined}
              className="h-11 text-base"
              required
            />
          </div>
          <div className="space-y-1">
            <div className="flex min-h-11 items-center justify-between gap-3">
              <Label htmlFor="saved-search-alert">{s.saveSearch.alertLabel}</Label>
              <Switch
                id="saved-search-alert"
                checked={daily}
                onCheckedChange={setDaily}
                aria-describedby="saved-search-alert-hint"
              />
            </div>
            <p id="saved-search-alert-hint" className="text-sm text-muted-foreground">
              {s.saveSearch.alertHint}
            </p>
          </div>
          {error && (
            <p id="saved-search-error" role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
              {s.saveSearch.cancel}
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? s.saveSearch.saving : s.saveSearch.submit}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
