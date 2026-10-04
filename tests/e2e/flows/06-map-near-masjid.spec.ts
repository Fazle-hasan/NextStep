import { expect, test } from "@playwright/test";

import { createMember } from "../support/api";
import { signIn } from "../support/app";

// Sample data (supabase/sample-data/02 and 03): a men's room in Kurla sits a few hundred metres from the
// sample imambargah there; the map itself shows a notice because no Mapbox token is set in tests.
const KURLA_FLAT = "Sample: private room in a 2BHK, Kurla";

test.describe("flow 6: map search near a masjid", () => {
  test("filtering flats within 1 km of a masjid or imambargah lists matches with the distance", async ({ page }) => {
    const member = await createMember({ prefix: "mapper", name: "E2E Mapper", gender: "male", city: "mumbai", intents: ["relocate"] });
    await signIn(page, member, "/map");

    await expect(page.getByRole("heading", { level: 1, name: "Map" })).toBeVisible();
    await expect(
      page.getByText("Flat locations are approximate; the exact address is shared after the lister accepts your request."),
    ).toBeVisible();
    await expect(page.getByText("The map is not available right now. You can still use the list.")).toBeVisible();

    // Filters are behind a toggle on phones.
    const panel = page.getByLabel("Near a masjid or imambargah");
    if (!(await panel.isVisible())) await page.getByRole("button", { name: /^Filters/ }).click();
    await page.getByLabel("City").selectOption({ label: "Mumbai" });
    await page.getByLabel("Near a masjid or imambargah").selectOption({ label: "Within 1 km" });
    await page.getByRole("button", { name: "Apply filters" }).click();

    await expect(page).toHaveURL(/masjidKm=1/);
    const card = page.getByRole("listitem").filter({ has: page.getByRole("link", { name: KURLA_FLAT }) });
    await expect(card).toBeVisible();
    await expect(card.getByText(/^\d+ m from Sample (Imambargah|Shia Masjid), /)).toBeVisible();
    await expect(card.getByRole("link", { name: KURLA_FLAT })).toHaveAttribute("href", /^\/flats\//);
  });
});
