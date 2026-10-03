import { expect, test } from "@playwright/test";

test("client connects to the server over WebSocket", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Backroom Games" })).toBeVisible();
  await expect(page.getByTestId("connection")).toHaveText("Connected");
});
