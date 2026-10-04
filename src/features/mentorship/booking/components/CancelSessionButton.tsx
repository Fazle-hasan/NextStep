"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { cancelSession } from "../actions";
import { cancelSessionSchema, type CancelSessionInput, type CancelSessionValues } from "../schemas";
import { bookingStrings as s } from "../strings";

// Confirms before cancelling a requested or confirmed session, with an optional reason for the mentor.
export function CancelSessionButton({ sessionId }: { sessionId: string }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    getValues,
    handleSubmit,
    formState: { errors },
  } = useForm<CancelSessionInput, unknown, CancelSessionValues>({
    resolver: zodResolver(cancelSessionSchema),
    defaultValues: { sessionId, reason: "" },
  });
  const c = s.cancelDialog;

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await cancelSession(getValues());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      toast.success(c.done);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" className="h-11 w-full sm:w-auto">
          {c.button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{c.title}</DialogTitle>
            <DialogDescription>{c.body}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="cancel-reason">{c.reason}</Label>
            <Textarea
              id="cancel-reason"
              rows={3}
              maxLength={500}
              className="text-base"
              aria-invalid={Boolean(errors.reason)}
              {...register("reason")}
            />
            {errors.reason && (
              <p role="alert" className="text-sm text-destructive">
                {errors.reason.message}
              </p>
            )}
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" className="h-11" onClick={() => setOpen(false)}>
              {c.keep}
            </Button>
            <Button type="submit" variant="destructive" className="h-11" disabled={pending}>
              {pending ? c.cancelling : c.confirm}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
