"use client";

import { useRouter } from "next/navigation";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { offerHelp } from "../actions";
import { buddyStrings } from "../strings";

const s = buddyStrings.requests;

export function OfferHelpDialog({ requestId, requesterName }: { requestId: string; requesterName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const messageId = `offer-message-${requestId}`;

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await offerHelp({ requestId, message });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(s.sent);
      setOpen(false);
      setMessage("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="h-11">{s.offer}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{s.offerTitle(requesterName)}</DialogTitle>
          <DialogDescription>{s.offerBody}</DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label htmlFor={messageId}>{s.message}</Label>
          <Textarea id={messageId} rows={4} maxLength={1000} className="text-base" value={message} onChange={(event) => setMessage(event.target.value)} />
          <p className="text-sm text-muted-foreground">{s.messageHint}</p>
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button variant="outline" className="h-11" onClick={() => setOpen(false)} disabled={pending}>
            {s.cancel}
          </Button>
          <Button className="h-11" onClick={submit} disabled={pending}>
            {pending ? s.sending : s.send}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
