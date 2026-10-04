import { MailCheck } from "lucide-react";

// "Check your email" message shown after a sign-up, sign-in link or password-reset email is sent.
export function EmailSentPanel({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <div role="status" className="space-y-3 rounded-xl bg-brand-soft p-4">
      <div className="flex items-center gap-2 font-semibold">
        <MailCheck className="size-5 text-primary" aria-hidden="true" />
        {title}
      </div>
      <p className="text-sm text-pretty">{body}</p>
      {children}
    </div>
  );
}
