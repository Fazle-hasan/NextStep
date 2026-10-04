"use client";

import { useState } from "react";

import { authStrings } from "../strings";

import { EmailSentPanel } from "./EmailSentPanel";
import { OtpRequestForm } from "./OtpRequestForm";
import { OtpVerifyForm } from "./OtpVerifyForm";

// Passwordless log-in: Supabase emails a link. Some email templates also include a 6-digit code,
// so the code box is offered as a fallback, not as the main path.
export function EmailLinkForm({ next }: { next?: string }) {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [showCode, setShowCode] = useState(false);

  if (!sentTo) return <OtpRequestForm method="email" next={next} onSent={setSentTo} />;

  return (
    <EmailSentPanel title={authStrings.linkSentTitle} body={authStrings.linkSent(sentTo)}>
      {showCode ? (
        <OtpVerifyForm method="email" sentTo={sentTo} next={next} onChangeContact={() => setSentTo(null)} />
      ) : (
        <button
          type="button"
          onClick={() => setShowCode(true)}
          className="text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          {authStrings.haveCode}
        </button>
      )}
    </EmailSentPanel>
  );
}
