import { expect, type Page } from "@playwright/test";

/** Creates a room from the landing page as `name` and returns its code. */
export const createRoom = async (page: Page, name: string) => {
  await page.goto("/");
  await page.getByRole("link", { name: /^Corners/ }).click();
  await page.getByLabel("Your name").fill(name);
  await page.getByRole("button", { name: "Create room" }).click();
  await expect(page).toHaveURL(/\/r\/[A-Z0-9]{5}$/);
  return new URL(page.url()).pathname.split("/").pop() ?? "";
};

/** Joins the room `code` from the landing page as `name`. */
export const joinRoom = async (page: Page, code: string, name: string) => {
  await page.goto("/");
  await page.getByLabel("Your name").fill(name);
  await page.getByLabel("Room code").fill(code);
  await page.getByRole("button", { name: "Join", exact: true }).click();
  await expect(page).toHaveURL(`/r/${code}`);
};

export const seats = (page: Page) => page.getByTestId("seats").getByRole("listitem");

export const square = (page: Page, x: number, y: number) =>
  page.locator(`.corners-board rect.square[data-x="${x}"][data-y="${y}"]`);

/** Places a piece through the tray: pick it, click a board square. */
export const place = async (page: Page, pieceId: string, x: number, y: number) => {
  await page.getByRole("button", { name: pieceId, exact: true }).click();
  await square(page, x, y).click();
};
