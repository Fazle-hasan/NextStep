"use client";

import { Check, Copy } from "lucide-react";
import { useId, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { referralsStrings as s } from "../strings";

// Read-only link field with a copy button. The field stays selectable if the clipboard is unavailable.
export function CopyLinkButton({ url }: { url: string }) {
  const id = useId();
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
      setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("failed");
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{s.linkLabel}</Label>
      <div className="flex gap-2">
        <Input id={id} readOnly value={url} className="h-11 min-w-0 flex-1 text-sm" onFocus={(e) => e.target.select()} />
        <Button type="button" variant="outline" className="h-11 shrink-0" onClick={copy}>
          {state === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
          {state === "copied" ? s.copied : s.copy}
        </Button>
      </div>
      <p aria-live="polite" className="text-sm text-muted-foreground">
        {state === "failed" ? s.copyFailed : ""}
      </p>
    </div>
  );
}
