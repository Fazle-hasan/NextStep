import { expect, test } from "@playwright/test";

import { createMember, latestEmailLink } from "../support/api";
import { signIn } from "../support/app";

// Passwords below are typed only into the test browser and never logged.
test.describe("flow 7: log in, email link and forgotten password", () => {
  test("a member sets a password in Settings and logs in with it", async ({ page }) => {
    const member = await createMember({ prefix: "password", name: "E2E Hasan" });
    const password = `Pw-${crypto.randomUUID()}`;

    // Before a password is set, the pair is refused without saying which part is wrong.
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "Log in to NextStep" })).toBeVisible();
    await page.getByLabel("Email address").fill(member.email);
    await page.locator("input#password-input").fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page.locator("#password-error")).toContainText("don't match");

    await signIn(page, member, "/settings/password");
    await page.getByLabel("New password").fill("short");
    await page.getByLabel("Repeat the password").fill("short");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.locator("#new-password-error")).toContainText("at least 8");
    await page.getByLabel("New password").fill(password);
    await page.getByLabel("Repeat the password").fill(password);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Password saved")).toBeVisible();

    await page.context().clearCookies();
    await page.goto("/sign-in?next=%2Fhome");
    await page.getByLabel("Email address").fill(member.email);
    await page.locator("input#password-input").fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
  });

  test("a member logs in with a link emailed to them", async ({ page }) => {
    const member = await createMember({ prefix: "emaillink", name: "E2E Zainab", gender: "female" });

    await page.goto("/sign-in");
    await page.getByRole("button", { name: "Email me a sign-in link instead" }).click();
    await page.getByLabel("Email address").fill(member.email);
    await page.getByRole("button", { name: "Email me a link" }).click();
    await expect(page.getByRole("status")).toContainText(`We sent a sign-in link to ${member.email}`);

    await page.goto(await latestEmailLink(member.email));
    await expect(page).toHaveURL(/\/home$/);
  });

  test("a member who forgot their password sets a new one from the emailed link", async ({ page }) => {
    const member = await createMember({ prefix: "forgot", name: "E2E Abbas" });
    const password = `Pw-${crypto.randomUUID()}`;

    await page.goto("/sign-in");
    await page.getByRole("link", { name: "Forgot password?" }).click();
    await expect(page.getByRole("heading", { level: 1, name: "Reset your password" })).toBeVisible();
    await page.getByLabel("Email address").fill(member.email);
    await page.getByRole("button", { name: "Send reset link" }).click();
    await expect(page.getByRole("status")).toContainText("we sent a link to set a new password");

    await page.goto(await latestEmailLink(member.email));
    await expect(page).toHaveURL(/\/reset-password$/);
    await page.getByLabel("New password").fill(password);
    await page.getByLabel("Repeat the password").fill(password);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page).toHaveURL(/\/home$/);

    await page.context().clearCookies();
    await page.goto("/sign-in");
    await page.getByLabel("Email address").fill(member.email);
    await page.locator("input#password-input").fill(password);
    await page.getByRole("button", { name: "Log in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
  });
});
