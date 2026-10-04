"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { FlagIcon } from "lucide-react";
import { useState, useTransition } from "react";
import { Controller, useForm } from "react-hook-form";
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
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import type { Enums } from "@/types/database";

import { reportContent } from "../actions";
import { REPORT_REASONS, reportSchema, type ReportInput, type ReportValues } from "../schemas";
import { reportReasonLabels, safetyStrings as s } from "../strings";

type Props = {
  targetType: Enums<"report_target_type">;
  targetId: string;
  triggerLabel?: string;
};

export function ReportDialog({ targetType, targetId, triggerLabel = s.report }: Props) {
  const [open, setOpen] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const form = useForm<ReportInput, unknown, ReportValues>({
    resolver: zodResolver(reportSchema),
    defaultValues: { targetType, targetId, reason: "spam", details: "" },
  });

  function onSubmit(values: ReportValues) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await reportContent(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(s.reportSent);
      form.reset();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <FlagIcon aria-hidden="true" />
          {triggerLabel}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.reportTitle}</DialogTitle>
          <DialogDescription>{s.reportDescription}</DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">{s.reason}</legend>
            <Controller
              control={form.control}
              name="reason"
              render={({ field }) => (
                <RadioGroup value={field.value} onValueChange={field.onChange} className="gap-3">
                  {REPORT_REASONS.map((reason) => (
                    <div key={reason} className="flex items-center gap-2">
                      <RadioGroupItem id={`reason-${reason}`} value={reason} />
                      <Label htmlFor={`reason-${reason}`} className="font-normal">
                        {reportReasonLabels[reason]}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
            />
          </fieldset>
          <div className="space-y-2">
            <Label htmlFor="report-details">{s.details}</Label>
            <Textarea
              id="report-details"
              rows={4}
              maxLength={2000}
              aria-describedby="report-details-hint"
              aria-invalid={Boolean(form.formState.errors.details)}
              {...form.register("details")}
            />
            <p id="report-details-hint" className="text-sm text-muted-foreground">
              {s.detailsHint}
            </p>
          </div>
          {submitError && (
            <p role="alert" className="text-sm text-destructive">
              {submitError}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              {s.cancel}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? s.sending : s.submitReport}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
