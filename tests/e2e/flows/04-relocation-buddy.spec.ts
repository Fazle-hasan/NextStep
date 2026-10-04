import { expect, test } from "@playwright/test";

import { cityId, createAdmin, createMember, insert, rpc, select } from "../support/api";
import { chooseOption, signIn } from "../support/app";

function isoDate(daysFromNow: number): string {
  const d = new Date(Date.now() + daysFromNow * 86_400_000);
  return d.toISOString().slice(0, 10);
}

test.describe("flow 4: relocation request and buddy offer", () => {
  test("a newcomer posts a request, a verified buddy offers help, and accepting opens a chat", async ({ page }) => {
    // A Settle-In Buddy in Lucknow, verified by an admin (the real verification RPC).
    const buddy = await createMember({ prefix: "buddy", name: "E2E Buddy Abbas", city: "lucknow", intents: ["help_newcomers"] });
    await insert(buddy.token, "buddy_profiles", {
      user_id: buddy.id,
      city_id: await cityId("lucknow"),
      bio: "I have lived in Lucknow all my life.",
      help_types: ["flat", "area_guidance"],
    });
    const admin = await createAdmin("admin-buddy");
    const [request] = await select<{ id: string }[]>(
      admin.token,
      "verification_requests",
      `select=id&user_id=eq.${buddy.id}&kind=eq.buddy&status=eq.pending`,
    );
    expect(request, "the buddy has a pending verification request").toBeTruthy();
    await rpc(admin.token, "admin_review_verification", { p_request_id: request!.id, p_approve: true });

    // The newcomer posts a relocation request through the app.
    const newcomer = await createMember({ prefix: "newcomer", name: "E2E Newcomer", city: "mumbai", intents: ["relocate"] });
    await signIn(page, newcomer, "/settle-in/new");
    await expect(page.getByRole("heading", { level: 1, name: "Ask for help settling in" })).toBeVisible();
    await chooseOption(page, "Which city are you moving to?", "Lucknow");
    await page.getByLabel("Move date", { exact: true }).fill(isoDate(20));
    await chooseOption(page, "Who is moving?", "Moving alone");
    await page.getByRole("checkbox", { name: "Finding a flat", exact: true }).click();
    await page.getByRole("checkbox", { name: "Nearby masjid / imambargah" }).click();
    await page.getByLabel("Short note (optional)").fill("Starting a new job in Gomti Nagar.");
    await page.getByRole("button", { name: "Post request" }).click();

    await expect(page).toHaveURL(/\/settle-in\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1, name: "Moving to Lucknow" })).toBeVisible();
    await expect(page.getByText("No offers yet")).toBeVisible();
    const requestId = new URL(page.url()).pathname.split("/").pop()!;

    // The verified buddy in Lucknow can see the request and offers help.
    const visible = await select<{ id: string }[]>(buddy.token, "relocation_requests", `select=id&id=eq.${requestId}`);
    expect(visible, "a verified buddy in the city can see the request").toHaveLength(1);
    await rpc(buddy.token, "offer_help", { p_request_id: requestId, p_message: "Happy to show you around Gomti Nagar." });

    // The newcomer sees the offer and accepts it, which opens a chat.
    await page.reload();
    await expect(page.getByRole("heading", { name: "E2E Buddy Abbas" })).toBeVisible();
    await expect(page.getByText("Happy to show you around Gomti Nagar.")).toBeVisible();
    await page.getByRole("button", { name: "Accept" }).click();
    await expect(page.getByText("Offer accepted. You can chat now.")).toBeVisible();
    await expect(page).toHaveURL(/\/messages\/[0-9a-f-]{36}$/);
    await expect(page.getByText("E2E Buddy Abbas").first()).toBeVisible();

    // The two can now message each other.
    await page.getByLabel("Message", { exact: true }).fill("Salaam, thank you for the offer!");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByText("Salaam, thank you for the offer!")).toBeVisible();
  });
});
