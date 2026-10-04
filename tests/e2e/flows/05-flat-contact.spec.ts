import { expect, test } from "@playwright/test";

import { cityId, createMember, insert, rpc, select } from "../support/api";
import { signIn } from "../support/app";

const ADDRESS = "Flat 4B, E2E Residency, 12 Test Road";

test.describe("flow 5: flat contact request", () => {
  test("the exact address stays hidden until the lister accepts the contact request", async ({ page }) => {
    // A lister publishes a flat through the same table and RPCs the listing screens use.
    const lister = await createMember({ prefix: "lister", name: "E2E Lister Zaidi", city: "hyderabad", intents: ["list_flat"] });
    const [listing] = await insert<{ id: string }[]>(lister.token, "flat_listings", {
      lister_id: lister.id,
      listing_type: "private_room",
      city_id: await cityId("hyderabad"),
      title: "E2E room near the station",
      description: "Bright room in a quiet building.",
      rent: 1_200_000,
      available_from: new Date().toISOString().slice(0, 10),
      tenant_gender_pref: "any",
    });
    await rpc(lister.token, "save_listing_address", {
      p_listing_id: listing!.id,
      p_address_line: ADDRESS,
      p_landmark: "Opposite the E2E bakery",
      p_lat: 17.385,
      p_lng: 78.4867,
    });
    await rpc(lister.token, "set_listing_status", { p_listing_id: listing!.id, p_status: "active" });

    // A member finds the listing: only the approximate area is shown.
    const seeker = await createMember({ prefix: "flatseeker", name: "E2E Flat Seeker", city: "hyderabad", intents: ["relocate"] });
    await signIn(page, seeker, `/flats/${listing!.id}`);
    await expect(page.getByRole("heading", { level: 1, name: "E2E room near the station" })).toBeVisible();
    await expect(page.getByText(ADDRESS)).toHaveCount(0);

    await page.getByLabel("Introduce yourself").fill("Assalamu alaikum, I start a job nearby next month.");
    await page.getByRole("button", { name: "Send request" }).click();
    await expect(page.getByText("Your request is waiting for the lister's reply.")).toBeVisible();
    // A pending request still reveals nothing.
    await page.reload();
    await expect(page.getByText("Your request is waiting for the lister's reply.")).toBeVisible();
    await expect(page.getByText(ADDRESS)).toHaveCount(0);

    // The lister accepts.
    const [contact] = await select<{ id: string }[]>(
      lister.token,
      "flat_contact_requests",
      `select=id&listing_id=eq.${listing!.id}&status=eq.pending`,
    );
    expect(contact, "the lister sees the contact request").toBeTruthy();
    await rpc(lister.token, "respond_contact_request", { p_request_id: contact!.id, p_accept: true });

    // Now the exact address is visible to this member.
    await page.reload();
    await expect(page.getByText("The lister accepted your request.")).toBeVisible();
    await expect(page.getByText(ADDRESS)).toBeVisible();
    await expect(page.getByText("Opposite the E2E bakery")).toBeVisible();
  });
});
