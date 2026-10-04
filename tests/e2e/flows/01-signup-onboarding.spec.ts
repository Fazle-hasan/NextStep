import { expect, test } from "@playwright/test";

import { latestEmailLink, uniqueEmail, uniquePhoneDigits } from "../support/api";
import { chooseOption } from "../support/app";

test.describe("flow 1: sign up and onboarding", () => {
  test("a new member signs up with email and password, confirms the email and completes onboarding", async ({ page }) => {
    const email = uniqueEmail("signup");
    // Typed only into the test browser; never logged.
    const password = `Pw-${crypto.randomUUID()}`;

    await page.goto("/");
    await page.getByRole("link", { name: "Sign up" }).first().click();
    await expect(page).toHaveURL(/\/sign-up/);
    await expect(page.getByRole("heading", { level: 1, name: "Create your NextStep account" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign up" }).last()).toHaveAttribute("aria-current", "page");

    await page.getByLabel("Email address").fill(email);
    await page.locator("input#signup-password").fill(password);
    await page.getByLabel("Repeat the password").fill(`${password}x`);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.locator("#signup-confirm-error")).toContainText("don't match");

    await page.getByLabel("Repeat the password").fill(password);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByRole("status")).toContainText("We sent a confirmation link");

    // The confirmation link logs the new member in.
    await page.goto(await latestEmailLink(email));

    // A new account is sent to onboarding.
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText("Step 1 of 3")).toBeVisible();
    await page.getByLabel("Full name").fill("E2E Fatima");
    await page.getByLabel("Female").check();
    await chooseOption(page, "City you live in", "Mumbai");
    await page.getByLabel("Mobile number").fill(uniquePhoneDigits());
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Step 2 of 3")).toBeVisible();
    await page.getByRole("checkbox", { name: /Find a job or refer someone/ }).click();
    await page.getByRole("checkbox", { name: /Relocating to a new city/ }).click();
    await page.getByRole("button", { name: "Continue" }).click();

    await expect(page.getByText("Step 3 of 3")).toBeVisible();
    await page.getByRole("button", { name: "Finish" }).click();

    await expect(page).toHaveURL(/\/home$/);
    await expect(page.getByRole("heading", { level: 1, name: "Assalamu alaikum, E2E" })).toBeVisible();
  });
});
