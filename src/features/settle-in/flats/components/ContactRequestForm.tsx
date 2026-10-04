"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/features/profiles/components/Field";

import { sendContactRequest } from "../actions";
import { contactRequestSchema, type ContactRequestInput } from "../schemas";
import { flatsStrings } from "../strings";

const s = flatsStrings.contact;

// Sends a contact request with a short introduction. Chat opens only if the lister accepts.
export function ContactRequestForm({ listingId }: { listingId: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const form = useForm<ContactRequestInput>({
    resolver: zodResolver(contactRequestSchema),
    defaultValues: { listingId, intro: "" },
  });

  function onSubmit(values: ContactRequestInput) {
    setSubmitError(null);
    startTransition(async () => {
      const result = await sendContactRequest(values);
      if (!result.ok) {
        setSubmitError(result.error);
        return;
      }
      toast.success(s.sent);
      router.refresh();
    });
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
      <Field id="intro" label={s.intro} hint={s.introHint} error={form.formState.errors.intro?.message}>
        <Textarea
          id="intro"
          rows={4}
          maxLength={1000}
          placeholder={s.introPlaceholder}
          className="text-base"
          aria-invalid={Boolean(form.formState.errors.intro)}
          {...form.register("intro")}
        />
      </Field>
      {submitError && (
        <p role="alert" className="text-sm text-destructive">
          {submitError}
        </p>
      )}
      <Button type="submit" className="h-11 w-full text-base sm:w-auto sm:px-6" disabled={pending}>
        {pending ? s.sending : s.send}
      </Button>
    </form>
  );
}
