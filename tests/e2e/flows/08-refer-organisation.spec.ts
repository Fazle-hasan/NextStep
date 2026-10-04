import { expect, test } from "@playwright/test";

import { createMember } from "../support/api";
import { signIn } from "../support/app";

test.describe("flow 8: refer someone with an organisation that is not on NextStep", () => {
  test("a member adds their organisation by name and sees it waiting to join NextStep", async ({ page }) => {
    const member = await createMember({ prefix: "referrer", name: "E2E Raza" });
    const organisation = `E2E Trading ${Date.now()}`;

    await signIn(page, member, "/referrals");
    await expect(page.getByRole("heading", { level: 1, name: "Refer someone" })).toBeVisible();

    await page.getByRole("button", { name: "My organisation isn't listed" }).click();
    await page.getByLabel("Organisation name").fill(`  ${organisation} `);
    await page.getByRole("button", { name: "Add", exact: true }).click();

    const item = page.getByRole("listitem").filter({ hasText: organisation });
    await expect(item).toBeVisible();
    await expect(item.getByText("Not on NextStep yet")).toBeVisible();
    await expect(item.getByRole("link", { name: "register it on NextStep" })).toHaveAttribute("href", "/employer/company/new");

    // Adding the same name again is refused (the form stays on "type a name").
    await page.getByLabel("Organisation name").fill(organisation.toUpperCase());
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByText("You've already added that organisation.")).toBeVisible();

    // A sample company from the list still works as before and shows its jobs.
    await page.getByRole("button", { name: "Choose from the list instead" }).click();
    await page.getByLabel("Company on NextStep").click();
    await page.getByRole("option", { name: "Zainab Tech Labs (Sample)" }).click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Open jobs at Zainab Tech Labs (Sample)" })).toBeVisible();
  });
});
