import { expect, type Page, test } from "@playwright/test";

const square = (page: Page, x: number, y: number) =>
  page.locator(`.corners-board rect.square[data-x="${x}"][data-y="${y}"]`);

/** Places a piece through the tray: pick it, click a board square, confirm. */
const place = async (page: Page, pieceId: string, x: number, y: number) => {
  await page.getByRole("button", { name: pieceId, exact: true }).click();
  await square(page, x, y).click();
  await page.getByRole("button", { name: "Confirm" }).click();
};

test("two players take turns placing pieces", async ({ context }) => {
  const host = await context.newPage();
  await host.goto("/");
  await host.getByLabel("Your name").fill("Ada");
  await host.getByRole("button", { name: "Create room" }).click();
  await expect(host).toHaveURL(/\/r\/[A-Z0-9]{5}$/);
  const code = new URL(host.url()).pathname.split("/").pop() ?? "";

  const guest = await context.newPage();
  await guest.goto(`/r/${code}?player=2`);
  await guest.getByLabel("Your name").fill("Grace");
  await guest.getByRole("button", { name: "Join", exact: true }).click();
  await expect(host.getByTestId("seats").getByRole("listitem")).toHaveCount(2);
  await host.getByRole("button", { name: "Start" }).click();

  await expect(host.getByTestId("turn")).toHaveText("Your turn (blue)");
  await expect(guest.getByTestId("turn")).toHaveText("Ada's turn (blue)");
  // Off turn, pieces can be picked but not played.
  await guest.getByRole("button", { name: "I2", exact: true }).click();
  await expect(guest.getByRole("button", { name: "Confirm" })).toBeDisabled();

  // Blue's monomino on its corner, top left.
  await place(host, "I1", 0, 0);
  for (const page of [host, guest]) {
    await expect(square(page, 0, 0)).toHaveAttribute("fill", "var(--color-blue)");
  }
  await expect(guest.getByTestId("turn")).toHaveText("Your turn (yellow)");
  await expect(host.getByTestId("turn")).toHaveText("Grace's turn (yellow)");
  const scores = guest.getByTestId("scores").getByRole("listitem");
  await expect(scores.nth(0)).toContainText("Ada");
  await expect(scores.nth(0)).toContainText("-177");
  await expect(scores.nth(1)).toContainText("-178");

  // Yellow's domino, picked while waiting, on its corner, top right.
  await square(guest, 19, 0).click();
  await guest.getByRole("button", { name: "Confirm" }).click();
  for (const x of [18, 19]) {
    await expect(square(host, x, 0)).toHaveAttribute("fill", "var(--color-yellow)");
  }
  // Ada plays red next, the second of her colors.
  await expect(host.getByTestId("turn")).toHaveText("Your turn (red)");
});
