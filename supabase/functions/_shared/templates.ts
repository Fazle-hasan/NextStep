// Email content for a notification. Pure functions (no Deno or network use), so they are unit-tested from Vitest.

export type NotificationEmailInput = {
  title: string;
  body: string | null;
  // In-app path such as /applications/123, or null.
  link: string | null;
  siteUrl: string;
};

export type RenderedEmail = { subject: string; text: string; html: string };

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

// Only in-app paths are linked, so a notification can never point an email at another site.
export function absoluteLink(siteUrl: string, link: string | null): string | null {
  if (!link || !link.startsWith("/") || link.startsWith("//")) return null;
  return `${siteUrl.replace(/\/+$/, "")}${link}`;
}

export function renderNotificationEmail(input: NotificationEmailInput): RenderedEmail {
  const url = absoluteLink(input.siteUrl, input.link);
  const settingsUrl = absoluteLink(input.siteUrl, "/settings/notifications");
  const body = input.body?.trim() ?? "";

  const lines = [input.title];
  if (body) lines.push(body);
  if (url) lines.push(`Open in NextStep: ${url}`);
  lines.push("", "NextStep: Learn. Earn. Grow.");
  if (settingsUrl) lines.push(`Change which emails you get: ${settingsUrl}`);
  const text = lines.join("\n");

  const html = [
    '<div style="font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;color:#111827;max-width:560px">',
    `<h1 style="font-size:20px;margin:0 0 12px">${escapeHtml(input.title)}</h1>`,
    body ? `<p style="margin:0 0 16px;white-space:pre-line">${escapeHtml(body)}</p>` : "",
    url
      ? `<p style="margin:0 0 24px"><a href="${escapeHtml(url)}" style="background:#111827;color:#ffffff;padding:10px 16px;border-radius:8px;text-decoration:none;display:inline-block">Open in NextStep</a></p>`
      : "",
    '<p style="font-size:13px;color:#6b7280;margin:0">NextStep: Learn. Earn. Grow.',
    settingsUrl ? ` · <a href="${escapeHtml(settingsUrl)}" style="color:#6b7280">Email settings</a>` : "",
    "</p></div>",
  ].join("");

  return { subject: input.title, text, html };
}

// Sample and test accounts use these domains; never send real email to them.
export function isDeliverableAddress(email: string | null | undefined): boolean {
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return false;
  const domain = email.slice(email.lastIndexOf("@") + 1).toLowerCase();
  return !(domain === "example.test" || domain.endsWith(".test") || domain.endsWith(".local") || domain.endsWith(".invalid"));
}
