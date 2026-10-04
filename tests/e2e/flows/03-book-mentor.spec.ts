import { expect, test } from "@playwright/test";

import { createMember } from "../support/api";
import { signIn } from "../support/app";

// A verified sample mentor with weekly availability (supabase/sample-data/04_sample_mentors.sql).
const SAMPLE_MENTOR_ID = "00000000-0000-4000-a000-000000000021";
const SAMPLE_MENTOR_NAME = "Sample Mentor Raza";

test.describe("flow 3: book a mentor", () => {
  test("a member finds a mentor, requests a session and can cancel it", async ({ page }) => {
    const mentee = await createMember({ prefix: "mentee", name: "E2E Mentee", intents: ["find_job"] });
    await signIn(page, mentee, "/mentors");

    await expect(page.getByRole("heading", { level: 1, name: "Find a mentor" })).toBeVisible();
    await expect(page.getByText(SAMPLE_MENTOR_NAME).first()).toBeVisible();
    await page.goto(`/mentors/${SAMPLE_MENTOR_ID}`);
    await expect(page.getByRole("heading", { level: 1, name: SAMPLE_MENTOR_NAME })).toBeVisible();

    // 1. session type, 2. a free slot, 3. a goal note.
    await expect(page.getByRole("heading", { name: "Book a session" })).toBeVisible();
    await page.getByRole("radio", { name: "Career guidance" }).check();
    const firstSlot = page.getByRole("group", { name: /^Free times on / }).first().getByRole("button").first();
    await expect(firstSlot).toBeVisible();
    await firstSlot.click();
    await expect(firstSlot).toHaveAttribute("aria-pressed", "true");
    await page.getByLabel("3. Your goal for the session (optional)").fill("I want to plan my next career move.");
    await page.getByRole("button", { name: "Request session" }).click();

    // The session page shows the request waiting for the mentor.
    await expect(page).toHaveURL(/\/sessions\/[0-9a-f-]{36}$/);
    await expect(page.getByText("Request sent. The mentor will accept or decline.")).toBeVisible();
    await expect(page.getByText("Waiting for the mentor").first()).toBeVisible();
    await expect(page.getByText("I want to plan my next career move.")).toBeVisible();

    // It appears under My sessions as upcoming.
    const sessionUrl = page.url();
    await page.goto("/sessions");
    await expect(page.getByRole("heading", { name: "Upcoming" })).toBeVisible();
    await expect(page.getByText(`With ${SAMPLE_MENTOR_NAME}`).first()).toBeVisible();

    // Cancel it again so repeated runs do not use up the sample mentor's slots.
    await page.goto(sessionUrl);
    await page.getByRole("button", { name: "Cancel session" }).click();
    await page.getByRole("button", { name: "Yes, cancel session" }).click();
    await expect(page.getByText("Session cancelled.")).toBeVisible();
    await expect(page.getByText("You cancelled this session.")).toBeVisible();
  });
});
