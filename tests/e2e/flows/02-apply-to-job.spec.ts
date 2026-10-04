import { expect, test } from "@playwright/test";

import { createMember, select } from "../support/api";
import { signIn, tinyPdf } from "../support/app";

test.describe("flow 2: apply to a job", () => {
  test("a seeker uploads a CV and applies to a published job", async ({ page }) => {
    // A sample job (supabase/sample-data) without required screening questions.
    const jobs = await select<{ id: string; title: string; job_screening_questions: { is_required: boolean }[] }[]>(
      null,
      "jobs",
      "select=id,title,job_screening_questions(is_required)&status=eq.published&order=published_at.desc&limit=20",
    );
    const job = jobs.find((j) => !j.job_screening_questions.some((q) => q.is_required));
    test.skip(!job, "No sample job without required questions; load supabase/sample-data first.");
    if (!job) return;

    const seeker = await createMember({ prefix: "seeker", name: "E2E Seeker", intents: ["find_job"] });
    await signIn(page, seeker, "/profile");

    // Upload a CV on the job profile.
    await expect(page.getByRole("heading", { level: 1, name: "My job profile & CV" })).toBeVisible();
    await page.locator('input[type="file"][accept*="pdf"]').setInputFiles({
      name: "e2e-cv.pdf",
      mimeType: "application/pdf",
      buffer: tinyPdf(),
    });
    await expect(page.getByText("CV uploaded")).toBeVisible();
    await expect(page.getByText("e2e-cv.pdf")).toBeVisible();

    // Open the job and apply.
    await page.goto(`/jobs/${job.id}`);
    await expect(page.getByRole("heading", { level: 1, name: job.title })).toBeVisible();
    await page.getByRole("link", { name: "Apply now" }).first().click();
    await expect(page.getByRole("heading", { name: `Apply for ${job.title}` })).toBeVisible();
    await page.getByLabel("Cover note (optional)").fill("I have five years of relevant experience.");
    await page.getByRole("button", { name: "Send application" }).click();

    // The application page shows the job and its status.
    await expect(page).toHaveURL(/\/applications\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: job.title })).toBeVisible();
    await expect(page.getByText("Applied", { exact: true }).first()).toBeVisible();

    // And it is listed under My applications.
    await page.goto("/applications");
    await expect(page.getByRole("link", { name: job.title }).first()).toBeVisible();
  });
});
