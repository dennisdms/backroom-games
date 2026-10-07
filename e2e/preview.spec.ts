import { expect, test } from "@playwright/test";
import { createRoom, square } from "./helpers";

test("the preview is in the player's color when legal and gray when not", async ({ browser }) => {
  const context = await browser.newContext();
  const host = await context.newPage();
  const code = await createRoom(host, "Ada");
  const guest = await context.newPage();
  await guest.goto(`/r/${code}?player=2`);
  await guest.getByLabel("Your name").fill("Grace");
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await host.getByRole("button", { name: "Start" }).click();

  const overlay = host.locator(".corners-board .overlay");
  await host.getByRole("button", { name: "I1", exact: true }).click();
  await square(host, 5, 5).hover();
  await expect(overlay).toHaveClass(/invalid/);
  await expect(overlay).toHaveAttribute("fill", "var(--ghost-illegal)");
  await expect(host.getByText("Your first piece has to cover a corner.")).toBeVisible();

  await square(host, 0, 0).hover();
  await expect(overlay).not.toHaveClass(/invalid/);
  await expect(overlay).toHaveAttribute("fill", "var(--color-blue)");

  await context.close();
});
