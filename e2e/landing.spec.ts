import { expect, test } from "@playwright/test";
import { createRoom, seats } from "./helpers";

test("lists the games with their player range", async ({ page }) => {
  await page.goto("/");
  const corners = page.getByRole("link", { name: /^Corners/ });
  await expect(corners).toHaveAccessibleName("Corners 2 to 4 players");
  await expect(corners).toContainText("2–4");
});

test("picks a game, creates a room and lands in it", async ({ page }) => {
  await page.goto("/?player=3");
  await page.getByRole("link", { name: /^Corners/ }).click();
  await expect(page).toHaveURL("/new/corners?player=3");
  await expect(page.getByRole("heading", { name: "New Corners room" })).toBeVisible();

  // Back to the list and in again, as a fresh page load.
  await page.getByRole("link", { name: "All games" }).click();
  await expect(page).toHaveURL("/?player=3");
  await page.goto("/new/corners?player=3");

  await page.getByLabel("Your name").fill("   ");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page.getByRole("alert")).toContainText("Enter your name");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/r\/[A-Z0-9]{5}\?player=3$/);
  await expect(page.getByRole("heading", { name: "Corners", exact: true })).toBeVisible();
  await expect(page.getByTestId("seats")).toContainText(/Ada\s*\(you\)\s*host/);
});

test("shows an error for an unknown code", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("Ada");
  await page.getByLabel("Room code").fill("zzzzz");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("no room with that code");
  await expect(page).toHaveURL(/\/$/);
});

test("asks for a name before joining", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill("   ");
  await page.getByLabel("Room code").fill("zzzzz");
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page.getByRole("alert")).toContainText("Enter your name");
});

test("a second ?player joins the same room from the landing page", async ({ page }) => {
  const code = await createRoom(page, "Ada");

  await page.goto("/?player=2");
  // The name last used is remembered per player, so player 2 starts blank.
  await expect(page.getByLabel("Your name")).toHaveValue("");
  await page.getByLabel("Your name").fill("Grace");
  await page.getByLabel("Room code").fill(` ${code.toLowerCase()} `);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page).toHaveURL(`/r/${code}?player=2`);
  // The name came from the landing page, so the room doesn't ask again.
  await expect(page.getByLabel("Your name")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Corners", exact: true })).toBeVisible();
  await expect(seats(page)).toHaveCount(2);
  await expect(seats(page).nth(0)).toContainText(/Ada.*offline/s);
  await expect(seats(page).nth(1)).toContainText(/Grace\s*\(you\)/);

  // Player 2 got its own token from the server, apart from player 1's.
  const stored = await page.evaluate(() => ({ ...localStorage }));
  expect(stored).toMatchObject({
    [`backroom:${code}:token`]: expect.any(String),
    [`backroom:p2:${code}:name`]: "Grace",
    [`backroom:p2:${code}:token`]: expect.any(String),
  });
  expect(stored[`backroom:p2:${code}:token`]).not.toBe(stored[`backroom:${code}:token`]);

  // Back on the landing page, the name is filled in.
  await page.goto("/?player=2");
  await expect(page.getByLabel("Your name")).toHaveValue("Grace");
});
