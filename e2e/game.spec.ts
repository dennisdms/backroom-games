import { expect, type Page, test } from "@playwright/test";
import { createRoom, seats, square } from "./helpers";

// Separate browser contexts share no storage, like two players on two devices.
test("two players join by code and take turns placing pieces", async ({ browser }) => {
  const hostContext = await browser.newContext();
  const guestContext = await browser.newContext();
  const host = await hostContext.newPage();
  const guest = await guestContext.newPage();

  const code = await createRoom(host, "Ada");
  await expect(host.getByTestId("room-code")).toHaveText(code);

  await guest.goto("/");
  await guest.getByLabel("Room code").fill(code);
  await guest.getByRole("button", { name: "Join room" }).click();
  await expect(guest).toHaveURL(`/r/${code}`);
  await guest.getByLabel("Your name").fill("Grace");
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  for (const page of [host, guest]) {
    await expect(seats(page)).toHaveCount(2);
  }
  await expect(seats(guest).nth(1)).toContainText(/Grace\s*\(you\)/);
  await host.getByRole("button", { name: "Start" }).click();

  for (const page of [host, guest]) {
    await expect(page.getByTestId("game")).toBeVisible();
  }
  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");
  await expect(guest.getByTestId("turn")).toHaveText("Ada's turn (blue)");
  // Only the colors in play get a starting corner dot, and nothing else is marked.
  await expect(host.locator("circle.start")).toHaveCount(2);
  await expect(host.locator(".corners-board .candidates")).toHaveCount(0);
  // Off turn, pieces can be picked but not played.
  await guest.getByRole("button", { name: "I2", exact: true }).click();
  await square(guest, 19, 0).click();
  await expect(guest.getByTestId("turn")).toHaveText("Ada's turn (blue)");
  await expect(square(guest, 19, 0)).toHaveAttribute("fill", "var(--board-empty)");

  // An illegal click does nothing: the first piece has to cover the corner.
  await host.getByRole("button", { name: "I1", exact: true }).click();
  await square(host, 5, 5).click();
  await expect(host.getByText("Your first piece has to cover your corner.")).toBeVisible();
  await expect(square(host, 5, 5)).toHaveAttribute("fill", "var(--board-empty)");
  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");

  // Blue's monomino on its corner, top left, with one click.
  await square(host, 0, 0).click();
  for (const page of [host, guest]) {
    await expect(square(page, 0, 0)).toHaveAttribute("fill", "var(--color-blue)");
  }
  await expect(guest.getByTestId("turn")).toHaveText("Your turn (yellow)");
  // Blue's dot is gone once its corner is covered; yellow's is still there.
  await expect(guest.locator("circle.start")).toHaveCount(1);
  await expect(guest.locator('circle.start[data-color="yellow"]')).toHaveCount(1);
  await expect(host.getByTestId("turn")).toHaveText("Grace's turn (yellow)");
  const scores = guest.getByTestId("scores").getByRole("listitem");
  await expect(scores.nth(0)).toContainText("Ada");
  await expect(scores.nth(0)).toContainText("-88");
  await expect(scores.nth(1)).toContainText("-89");

  // Clicking a name shows that player's remaining pieces in place of the tray.
  const player = (page: Page, name: string) =>
    page.getByTestId("scores").getByRole("button", { name: new RegExp(name) });
  await player(guest, "Ada").click();
  await expect(player(guest, "Ada")).toHaveAttribute("aria-pressed", "true");
  const adaHand = guest.getByTestId("hand");
  await expect(adaHand).toContainText("Ada's pieces (20)");
  await expect(adaHand.locator(".tray-piece")).toHaveCount(20);
  await expect(adaHand.locator('[data-piece="I1"]')).toHaveCount(0);
  await expect(guest.getByRole("button", { name: "I2", exact: true })).toHaveCount(0);
  await guest.getByRole("button", { name: "Back to your pieces" }).click();
  await expect(guest.getByTestId("hand")).toHaveCount(0);
  await expect(player(guest, "Grace")).toHaveAttribute("aria-pressed", "true");
  await expect(guest.getByRole("button", { name: "I2", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  // The host looks at Grace's pieces while she plays.
  await player(host, "Grace").click();
  await expect(host.getByTestId("hand").locator('[data-piece="I2"]')).toHaveCount(1);

  // Yellow's domino, picked while waiting, on its corner, top right.
  await square(guest, 19, 0).click();
  for (const page of [host, guest]) {
    for (const x of [18, 19]) {
      await expect(square(page, x, 0)).toHaveAttribute("fill", "var(--color-yellow)");
    }
  }
  // With one color each, it's back to Ada's blue.
  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");
  await expect(guest.getByTestId("turn")).toHaveText("Ada's turn (blue)");
  // On their turn, the host's own tray comes back.
  await expect(host.getByTestId("hand")).toHaveCount(0);
  await expect(host.getByRole("button", { name: "I1", exact: true })).toHaveCount(0);
  await expect(host.getByRole("button", { name: "I2", exact: true })).toBeVisible();
  // Both corners are covered, so no dots are left.
  await expect(host.locator("circle.start")).toHaveCount(0);

  await hostContext.close();
  await guestContext.close();
});

test("on touch, the first tap previews a piece and a second tap plays it", async ({ browser }) => {
  const context = await browser.newContext({ hasTouch: true });
  const host = await context.newPage();
  const code = await createRoom(host, "Ada");
  const guest = await context.newPage();
  await guest.goto(`/r/${code}?player=2`);
  await guest.getByLabel("Your name").fill("Grace");
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await host.getByRole("button", { name: "Start" }).click();

  await host.getByRole("button", { name: "I1", exact: true }).tap();
  await square(host, 3, 3).tap();
  await expect(host.getByText("Your first piece has to cover your corner.")).toBeVisible();
  await square(host, 0, 0).tap();
  await expect(host.getByText("Tap again to play it.")).toBeVisible();
  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");
  await square(host, 0, 0).tap();
  await expect(square(host, 0, 0)).toHaveAttribute("fill", "var(--color-blue)");
  await expect(host.getByTestId("turn")).toHaveText("Grace's turn (yellow)");

  await context.close();
});
