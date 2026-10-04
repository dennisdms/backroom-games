import { expect, test } from "@playwright/test";

test("creates a room and lands in it", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/r\/[A-Z0-9]{5}$/);
  await expect(page.getByRole("heading", { name: /^Room [A-Z0-9]{5}$/ })).toBeVisible();
});

test("shows an error for an unknown code", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Room code").fill("zzzzz");
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page.getByRole("alert")).toContainText("no room with that code");
  await expect(page).toHaveURL(/\/$/);
});

test("a second ?player joins the same room by name", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/r\/[A-Z0-9]{5}$/);
  const code = new URL(page.url()).pathname.split("/").pop() ?? "";

  await page.goto("/?player=2");
  await page.getByLabel("Room code").fill(` ${code.toLowerCase()} `);
  await page.getByRole("button", { name: "Join room" }).click();
  await expect(page).toHaveURL(`/r/${code}?player=2`);
  await page.getByLabel("Your name").fill("Grace");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByLabel("Your name")).toBeHidden();
  await expect(page.getByRole("heading", { name: `Room ${code}` })).toBeVisible();

  // Player 2's name was stored under its own key, apart from player 1's token.
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(stored).toMatchObject({
    [`backroom:${code}:token`]: expect.any(String),
    [`backroom:p2:${code}:name`]: "Grace",
  });
});
