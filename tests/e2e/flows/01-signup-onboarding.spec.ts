import { expect, test } from "@playwright/test";

import { latestEmailCode, uniqueEmail, uniquePhoneDigits } from "../support/api";
import { chooseOption } from "../support/app";

test.describe("flow 1: sign up and onboarding", () => {
  test("a new member signs up with an email code and completes onboarding", async ({ page }) => {
    const email = uniqueEmail("signup");

    await page.goto("/sign-in");
    // The card title is not a heading element, so match its text.
    await expect(page.getByText("Sign in to NextStep", { exact: true })).toBeVisible();
    await page.getByRole("tab", { name: "Email" }).click();
    await page.getByLabel("Email address").fill(email);
    await page.getByRole("button", { name: "Send code" }).click();
    await expect(page.getByText(`Code sent to ${email}`)).toBeVisible();

    const code = await latestEmailCode(email);
    // The code field submits on its own once all six digits are in.
    await page.getByLabel("Enter the 6-digit code").fill(code);

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
