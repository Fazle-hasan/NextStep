// WhatsApp sender interface (D-011). The MVP ships a log-only implementation; real delivery through the
// WhatsApp Business API is post-MVP and only needs another implementation of this interface.

export type WhatsAppMessage = { toUserId: string; type: string; title: string };

export interface WhatsAppSender {
  send(message: WhatsAppMessage): Promise<{ ok: true } | { ok: false; error: string }>;
}

class LogOnlyWhatsAppSender implements WhatsAppSender {
  send(message: WhatsAppMessage): Promise<{ ok: true }> {
    // No phone number and no message text in logs: only that a message would have been sent.
    console.log(JSON.stringify({ whatsapp_stub: true, user: message.toUserId, type: message.type }));
    return Promise.resolve({ ok: true });
  }
}

export function getWhatsAppSender(): WhatsAppSender {
  return new LogOnlyWhatsAppSender();
}

// Events the spec lists for WhatsApp (PRODUCT_SPEC §9).
export const WHATSAPP_TYPES = new Set(["application_status", "session_update", "contact_decided", "job_alert"]);
