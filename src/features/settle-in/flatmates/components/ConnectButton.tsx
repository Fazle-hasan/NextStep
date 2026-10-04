"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { sendFlatmateConnection } from "../actions";
import { connectSchema, type ConnectInput, type ConnectValues } from "../schemas";
import { flatmateStrings as s } from "../strings";

type Props = { recipientId: string; recipientName: string };

// Opens a dialog to send a connect request with an optional short note.
export function ConnectButton({ recipientId, recipientName }: Props) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const {
    register,
    getValues,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ConnectInput, unknown, ConnectValues>({
    resolver: zodResolver(connectSchema),
    defaultValues: { recipientId, message: "" },
  });
  const messageId = `connect-message-${recipientId}`;

  function onValid() {
    setError(null);
    startTransition(async () => {
      const result = await sendFlatmateConnection(getValues());
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setOpen(false);
      reset();
      toast.success(s.connect.sent);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="h-11 w-full sm:w-auto sm:px-6">
          {s.connect.button}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <form onSubmit={handleSubmit(onValid)} className="space-y-4" noValidate>
          <DialogHeader>
            <DialogTitle>{s.connect.title(recipientName)}</DialogTitle>
            <DialogDescription>{s.connect.body}</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor={messageId}>{s.connect.message}</Label>
            <Textarea
              id={messageId}
              rows={3}
              maxLength={500}
              className="text-base"
              aria-invalid={Boolean(errors.message)}
              {...register("message")}
            />
            {errors.message && (
              <p role="alert" className="text-sm text-destructive">
                {errors.message.message}
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
              {s.cancel}
            </Button>
            <Button type="submit" className="h-11" disabled={pending}>
              {pending ? s.connect.sending : s.connect.send}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
