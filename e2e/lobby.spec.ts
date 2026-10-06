import { expect, test } from "@playwright/test";
import { createRoom, seats } from "./helpers";

test("the host starts once a second player joins", async ({ context }) => {
  const host = await context.newPage();
  const code = await createRoom(host, "Ada");
  await expect(host.getByTestId("room-code")).toHaveText(code);
  await expect(seats(host)).toHaveCount(1);
  await expect(host.getByRole("button", { name: "Start" })).toBeDisabled();
  await expect(host.getByTestId("start-blocker")).toHaveText(
    "The game needs 2, 3 or 4 players to start; there is 1 player.",
  );

  const guest = await context.newPage();
  await guest.goto(`/r/${code}?player=2`);
  await guest.getByLabel("Your name").fill("Grace");
  await guest.getByRole("button", { name: "Join", exact: true }).click();

  for (const page of [host, guest]) {
    await expect(seats(page)).toHaveCount(2);
    await expect(seats(page).nth(0)).toContainText("Ada");
    await expect(seats(page).nth(1)).toContainText("Grace");
    await expect(seats(page).nth(1)).not.toContainText("offline");
  }
  await expect(seats(host).nth(0).locator(".swatch")).toHaveCount(1);

  await expect(guest.getByRole("button", { name: "Start" })).toHaveCount(0);
  await expect(guest.getByText("Waiting for the host")).toBeVisible();
  await expect(host.getByTestId("start-blocker")).toBeHidden();

  await host.getByRole("button", { name: "Start" }).click();
  for (const page of [host, guest]) {
    await expect(page.getByTestId("game")).toBeVisible();
  }
});

test("copies the room link", async ({ context, page }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  const code = await createRoom(page, "Ada");
  await page.getByRole("button", { name: "Copy link" }).click();
  await expect(page.getByRole("status")).toHaveText("Copied");
  // A string, since e2e code is typechecked without the DOM types.
  const copied = String(await page.evaluate("navigator.clipboard.readText()"));
  expect(copied).toMatch(new RegExp(`/r/${code}$`));
});
