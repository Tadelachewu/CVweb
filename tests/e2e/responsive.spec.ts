import { expect, test } from "@playwright/test";
import { card, newSampleCV } from "./helpers";

async function noHorizontalScroll(page: import("@playwright/test").Page) {
  const { sw, cw } = await page.evaluate(() => ({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth }));
  expect(sw, "page scrolls horizontally").toBeLessThanOrEqual(cw);
}

test("dashboard and editor fit the screen without horizontal scrolling", async ({ page }, info) => {
  await newSampleCV(page);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-editor.png`, fullPage: false });
  await page.goto("/");
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-dashboard.png`, fullPage: true });
});

test("edit/preview switcher works on small screens", async ({ page }, info) => {
  await newSampleCV(page);
  const vw = page.viewportSize()!.width;
  const preview = page.getByRole("region", { name: "Live preview" });
  if (vw >= 1024) test.skip(true, "side-by-side layout");
  await expect(preview).toBeHidden();
  await page.getByRole("button", { name: "Preview" }).click();
  await expect(preview).toBeVisible();
  await expect(preview.locator(".cv-name")).toHaveText("Tadele Mesfin");
  // The scaled page must fit inside the viewport width.
  const box = await preview.locator(".cv-page").boundingBox();
  expect(box!.x + box!.width).toBeLessThanOrEqual(vw + 1);
  await noHorizontalScroll(page);
  await page.screenshot({ path: `test-results/screens/${info.project.name}-preview.png` });
  await page.getByRole("button", { name: "Edit" }).click();
  await expect(card(page, "Personal details")).toBeVisible();
});

test("tap targets in the editor toolbar are at least 24px", async ({ page }) => {
  await newSampleCV(page);
  for (const name of ["Download PDF"]) {
    const b = await page.getByRole("button", { name }).boundingBox();
    expect(b!.height).toBeGreaterThanOrEqual(24);
  }
});
