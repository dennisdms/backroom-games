import { expect, test } from "@playwright/test";
import { createRoom, place, seats, square } from "./helpers";

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
  for (const page of [host, guest]) {
    for (const x of [18, 19]) {
      await expect(square(page, x, 0)).toHaveAttribute("fill", "var(--color-yellow)");
    }
  }
  // Ada plays red next, the second of her colors.
  await expect(host.getByTestId("turn")).toHaveText("Your turn (red)");
  await expect(guest.getByTestId("turn")).toHaveText("Ada's turn (red)");

  await hostContext.close();
  await guestContext.close();
});
