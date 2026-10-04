"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Enums } from "@/types/database";

import { deleteJob, setJobStatus } from "../job-actions";
import { employerStrings } from "../strings";

const s = employerStrings.jobActions;

type Props = { jobId: string; status: Enums<"job_status"> };

// Message for the status the database settled on after a change.
export function jobStatusMessage(status: Enums<"job_status">): string {
  if (status === "pending_review") return s.sentForReview;
  if (status === "published") return s.published;
  if (status === "closed") return s.closed;
  return s.withdrawn;
}

export function JobRowActions({ jobId, status }: Props) {
  const router = useRouter();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  function change(target: "published" | "draft" | "closed") {
    startTransition(async () => {
      const result = await setJobStatus({ jobId, status: target });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(jobStatusMessage(result.data.status));
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteJob({ jobId });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setDeleteOpen(false);
      toast.success(s.deleted);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-wrap gap-2">
      {status !== "draft" && (
        <Button asChild variant="outline" className="h-11">
          <Link href={`/employer/jobs/${jobId}`}>{employerStrings.dashboard.viewApplicants}</Link>
        </Button>
      )}
      {status !== "expired" && (
        <Button asChild variant="outline" className="h-11">
          <Link href={`/employer/jobs/${jobId}/edit`}>{s.edit}</Link>
        </Button>
      )}
      {(status === "draft" || status === "closed") && (
        <Button className="h-11" disabled={pending} onClick={() => change("published")}>
          {pending ? s.working : status === "draft" ? s.publish : s.republish}
        </Button>
      )}
      {status === "pending_review" && (
        <Button variant="outline" className="h-11" disabled={pending} onClick={() => change("draft")}>
          {pending ? s.working : s.withdraw}
        </Button>
      )}
      {status === "published" && (
        <Button variant="outline" className="h-11" disabled={pending} onClick={() => change("closed")}>
          {pending ? s.working : s.close}
        </Button>
      )}
      {status === "draft" && (
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" className="h-11">
              {s.delete}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{s.deleteTitle}</DialogTitle>
              <DialogDescription>{s.deleteBody}</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline" className="h-11">
                  {s.cancel}
                </Button>
              </DialogClose>
              <Button variant="destructive" className="h-11" disabled={pending} onClick={remove}>
                {pending ? s.working : s.deleteConfirm}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
