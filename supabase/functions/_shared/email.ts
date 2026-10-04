// Transactional email behind one interface (D-010). Swap the provider by adding another EmailSender.

import { env } from "./env.ts";

export type EmailMessage = { to: string; subject: string; text: string; html: string };

export interface EmailSender {
  send(message: EmailMessage): Promise<{ ok: true } | { ok: false; error: string }>;
}

class ResendSender implements EmailSender {
  constructor(
    private readonly apiKey: string,
    private readonly from: string,
  ) {}

  async send(message: EmailMessage): Promise<{ ok: true } | { ok: false; error: string }> {
    try {
      const response = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${this.apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: this.from,
          to: [message.to],
          subject: message.subject,
          text: message.text,
          html: message.html,
        }),
      });
      if (response.ok) return { ok: true };
      // Keep the provider's status but never log the recipient or the key.
      return { ok: false, error: `resend_${response.status}` };
    } catch {
      return { ok: false, error: "resend_unreachable" };
    }
  }
}

// Null when email is not configured (RESEND_API_KEY and EMAIL_FROM function secrets).
export function getEmailSender(): EmailSender | null {
  const apiKey = env("RESEND_API_KEY");
  const from = env("EMAIL_FROM");
  return apiKey && from ? new ResendSender(apiKey, from) : null;
}
