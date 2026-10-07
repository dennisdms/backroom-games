import { type Browser, expect, test } from "@playwright/test";
import { createRoom, joinRoom } from "./helpers";

/** Ada creates a room with `settings` in one browser, Grace joins in another. */
const twoPlayers = async (browser: Browser, settings: Record<string, string>) => {
  const host = await (await browser.newContext()).newPage();
  const guest = await (await browser.newContext()).newPage();
  const code = await createRoom(host, "Ada", settings);
  await joinRoom(guest, code, "Grace");
  return { host, guest };
};

test("the create form defaults to a one-minute timer and no hints", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Corners/ }).click();
  await expect(page.getByLabel("Turn timer").locator("option:checked")).toHaveText("1 minute");
  await expect(page.getByLabel("Hints").locator("option:checked")).toHaveText("Off");
});

test("the host picks a turn timer and hints, and the game uses them", async ({ browser }) => {
  const { host, guest } = await twoPlayers(browser, { "Turn timer": "30 seconds", Hints: "On" });
  for (const page of [host, guest]) {
    await expect(page.getByTestId("settings")).toHaveText("Turn timer: 30 seconds · Hints: on");
  }
  await host.getByRole("button", { name: "Start" }).click();

  // Both see the clock, which starts at 30 seconds and counts down.
  for (const page of [host, guest]) {
    await expect(page.getByTestId("countdown")).toHaveText(/^0:(30|29|28)$/);
  }
  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");
  await expect(host.getByTestId("countdown")).toHaveText(/^0:2\d$/, { timeout: 3000 });

  // On your turn, hints mark where your piece could go: every empty corner at first.
  await expect(host.locator(".corners-board .candidates rect")).toHaveCount(4);
  await expect(host.locator("circle.start")).toHaveCount(0);
  await expect(guest.locator(".corners-board .candidates")).toHaveCount(0);
});

test("a room without a timer shows no countdown", async ({ browser }) => {
  const { host } = await twoPlayers(browser, { "Turn timer": "Off" });
  await expect(host.getByTestId("settings")).toHaveText("Turn timer: off · Hints: off");
  await host.getByRole("button", { name: "Start" }).click();
  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");
  await expect(host.getByTestId("countdown")).toHaveCount(0);
});
