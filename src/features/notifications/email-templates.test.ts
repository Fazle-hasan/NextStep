import { describe, expect, it } from "vitest";

import {
  absoluteLink,
  escapeHtml,
  isDeliverableAddress,
  renderNotificationEmail,
} from "../../../supabase/functions/_shared/templates";

// The email templates live with the Edge Functions but are pure, so they are tested here.

describe("renderNotificationEmail", () => {
  const base = { title: "Application update", body: "Your application is now: shortlisted.", siteUrl: "https://nextstep.example/" };

  it("builds subject, text and html with an absolute link", () => {
    const email = renderNotificationEmail({ ...base, link: "/applications/1" });
    expect(email.subject).toBe("Application update");
    expect(email.text).toContain("Open in NextStep: https://nextstep.example/applications/1");
    expect(email.text).toContain("https://nextstep.example/settings/notifications");
    expect(email.html).toContain('href="https://nextstep.example/applications/1"');
  });

  it("escapes HTML in user-influenced text", () => {
    const email = renderNotificationEmail({ ...base, title: 'Job <b>"x"</b>', body: "<script>alert(1)</script>", link: null });
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("&lt;script&gt;");
    expect(email.html).toContain("Job &lt;b&gt;&quot;x&quot;&lt;/b&gt;");
  });

  it("leaves out the button when there is no link or body", () => {
    const email = renderNotificationEmail({ ...base, body: null, link: null });
    expect(email.html).not.toContain("Open in NextStep");
    expect(email.text.startsWith("Application update\n\nNextStep")).toBe(true);
  });
});

describe("absoluteLink", () => {
  it("only accepts in-app paths", () => {
    expect(absoluteLink("https://a.example", "/jobs")).toBe("https://a.example/jobs");
    expect(absoluteLink("https://a.example", "https://evil.example")).toBeNull();
    expect(absoluteLink("https://a.example", "//evil.example")).toBeNull();
    expect(absoluteLink("https://a.example", null)).toBeNull();
  });
});

describe("isDeliverableAddress", () => {
  it("skips sample, test and malformed addresses", () => {
    expect(isDeliverableAddress("person@gmail.com")).toBe(true);
    expect(isDeliverableAddress("sample.member1@example.test")).toBe(false);
    expect(isDeliverableAddress("u1@test.local")).toBe(false);
    expect(isDeliverableAddress("not-an-email")).toBe(false);
    expect(isDeliverableAddress(null)).toBe(false);
  });
});

describe("escapeHtml", () => {
  it("escapes the five special characters", () => {
    expect(escapeHtml(`&<>"'`)).toBe("&amp;&lt;&gt;&quot;&#39;");
  });
});
