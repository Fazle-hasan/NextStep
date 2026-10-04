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
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { respondToSession } from "../actions";
import { mentorStrings } from "../strings";

const s = mentorStrings.respond;

type Mode = "accept" | "decline" | null;

// Accept (with an https meeting link) or decline (with an optional reason) a session request.
export function RespondButtons({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>(null);
  const [meetingUrl, setMeetingUrl] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const urlId = `meeting-url-${sessionId}`;
  const reasonId = `decline-reason-${sessionId}`;

  function open(next: Mode) {
    setError(null);
    setMode(next);
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const accept = mode === "accept";
    setError(null);
    startTransition(async () => {
      const result = await respondToSession({ sessionId, accept, meetingUrl, reason });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      toast.success(accept ? s.accepted : s.declined);
      setMode(null);
      router.refresh();
    });
  }

  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button className="h-11" onClick={() => open("accept")}>
          {s.accept}
        </Button>
        <Button variant="outline" className="h-11" onClick={() => open("decline")}>
          {s.decline}
        </Button>
      </div>

      <Dialog open={mode !== null} onOpenChange={(isOpen) => !isOpen && setMode(null)}>
        <DialogContent>
          <form onSubmit={submit} className="space-y-4" noValidate>
            <DialogHeader>
              <DialogTitle>{mode === "accept" ? s.acceptTitle : s.declineTitle}</DialogTitle>
              <DialogDescription>{mode === "accept" ? s.acceptBody : s.declineBody}</DialogDescription>
            </DialogHeader>
            {mode === "accept" ? (
              <div className="space-y-2">
                <Label htmlFor={urlId}>{s.urlLabel}</Label>
                <Input
                  id={urlId}
                  type="url"
                  inputMode="url"
                  autoComplete="off"
                  maxLength={500}
                  placeholder={s.urlPlaceholder}
                  className="h-11 text-base"
                  value={meetingUrl}
                  onChange={(event) => setMeetingUrl(event.target.value)}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor={reasonId}>{s.reasonLabel}</Label>
                <Textarea
                  id={reasonId}
                  rows={3}
                  maxLength={500}
                  className="text-base"
                  value={reason}
                  onChange={(event) => setReason(event.target.value)}
                />
              </div>
            )}
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" className="h-11" onClick={() => setMode(null)} disabled={pending}>
                {s.cancel}
              </Button>
              <Button type="submit" className="h-11" variant={mode === "decline" ? "destructive" : "default"} disabled={pending}>
                {pending ? s.working : mode === "accept" ? s.confirm : s.confirmDecline}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
