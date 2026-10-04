import { expect, test } from "@playwright/test";

import { createMember } from "../support/api";
import { signIn } from "../support/app";

test.describe("flow 7: password sign-in", () => {
  test("a member sets a password in Settings and signs in with email and password", async ({ page }) => {
    const member = await createMember({ prefix: "password", name: "E2E Hasan" });
    // Typed only into the test browser; never logged.
    const password = `Pw-${crypto.randomUUID()}`;

    // A wrong password is refused before one is set.
    await page.goto("/sign-in");
    await expect(page.getByRole("heading", { level: 1, name: "Sign in to NextStep" })).toBeVisible();
    await expect(page.getByRole("tab", { name: "Email code" })).toHaveAttribute("aria-selected", "true");
    await page.getByRole("tab", { name: "Password" }).click();
    await page.getByLabel("Email address").fill(member.email);
    await page.locator("input#password-input").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page.locator("#password-error")).toContainText("don't match");

    // Set the password.
    await signIn(page, member, "/settings/password");
    await page.getByLabel("New password").fill("short");
    await page.getByLabel("Repeat the password").fill("short");
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.locator("#new-password-error")).toContainText("at least 8");
    await page.getByLabel("New password").fill(password);
    await page.getByLabel("Repeat the password").fill(password);
    await page.getByRole("button", { name: "Save password" }).click();
    await expect(page.getByText("Password saved")).toBeVisible();

    // Sign out, then sign in with email and password.
    await page.context().clearCookies();
    await page.goto("/sign-in?next=%2Fhome");
    await page.getByRole("tab", { name: "Password" }).click();
    await page.getByLabel("Email address").fill(member.email);
    await page.locator("input#password-input").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1 })).toContainText("E2E");
  });
});
