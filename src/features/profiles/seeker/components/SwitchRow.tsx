"use client";

import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

type Props = {
  id: string;
  label: string;
  hint?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
};

// A labelled on/off switch with a comfortable touch target.
export function SwitchRow({ id, label, hint, checked, onCheckedChange }: Props) {
  const hintId = hint ? `${id}-hint` : undefined;
  return (
    <div className="flex min-h-11 items-center justify-between gap-4">
      <div className="space-y-1">
        <Label htmlFor={id}>{label}</Label>
        {hint && (
          <p id={hintId} className="text-sm text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} aria-describedby={hintId} />
    </div>
  );
}
