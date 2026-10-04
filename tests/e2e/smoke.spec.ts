import { expect, test } from "@playwright/test";

test("landing page shows the brand and tagline", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("NextStep").first()).toBeVisible();
  await expect(page.getByText(/Learn\. Earn\. Grow\./).first()).toBeVisible();
});

test("log-in and sign-up pages switch with two buttons", async ({ page }) => {
  await page.goto("/sign-in");
  await expect(page.getByRole("heading", { level: 1, name: "Log in to NextStep" })).toBeVisible();
  await expect(page.locator("input#password-input")).toBeVisible();
  await expect(page.getByRole("link", { name: "Log in" }).last()).toHaveAttribute("aria-current", "page");
  await page.getByRole("navigation", { name: "Log in or sign up" }).getByRole("link", { name: "Sign up" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Create your NextStep account" })).toBeVisible();
});

test("private pages redirect signed-out visitors to sign-in", async ({ page }) => {
  await page.goto("/home");
  await expect(page).toHaveURL(/\/sign-in\?next=%2Fhome$/);
});

test("job search is public", async ({ page }) => {
  await page.goto("/jobs?q=engineer");
  await expect(page.getByRole("heading", { level: 1, name: "Find jobs" })).toBeVisible();
  await expect(page).toHaveURL(/\/jobs\?q=engineer$/);
});

test("member-only job pages redirect signed-out visitors to sign-in", async ({ page }) => {
  for (const path of ["/profile", "/applications", "/saved", "/employer", "/referrals"]) {
    await page.goto(path);
    await expect(page).toHaveURL((url) => url.pathname === "/sign-in" && url.searchParams.get("next") === path);
  }
});

test("the admin area is hidden from signed-out visitors", async ({ page }) => {
  await page.goto("/admin/verification");
  await expect(page).toHaveURL(/\/sign-in/);
});
