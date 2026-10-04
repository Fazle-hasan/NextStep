import { expect, type Page } from "@playwright/test";

import { signInPath, type Member } from "./api";

// Signs a prepared member in through the app's own sign-in link handler and waits for the destination.
export async function signIn(page: Page, member: Member, next = "/home"): Promise<void> {
  await page.goto(await signInPath(member.email, next));
  await expect(page).toHaveURL((url) => url.pathname === next.split("?")[0]);
}

// Picks an option in a Radix select by the select's label.
export async function chooseOption(page: Page, label: string | RegExp, option: string | RegExp): Promise<void> {
  await page.getByLabel(label).click();
  await page.getByRole("option", { name: option }).click();
}

// A minimal valid one-page PDF, for the CV upload.
export function tinyPdf(): Buffer {
  return Buffer.from(
    "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n" +
      "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 200]>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n",
  );
}
