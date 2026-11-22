import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { card, newBlankCV, newSampleCV, waitSaved } from "./helpers";

test("script-like input is rendered as text and unsafe links are never created", async ({ page }) => {
  let dialogFired = false;
  page.on("dialog", (d) => {
    dialogFired = true;
    d.dismiss();
  });
  await newBlankCV(page);
  const p = card(page, "Personal details");
  await p.getByLabel("Full name").fill('<img src=x onerror="alert(1)">');
  await p.getByLabel("Website").fill("javascript:alert(1)");
  await p.getByLabel("LinkedIn").fill("data:text/html,<script>alert(1)</script>");
  await p.getByLabel("Email").fill('x@y.z"><script>alert(1)</script>');
  await expect(p.getByText("Not a valid web address. It will be shown as plain text.").first()).toBeVisible();
  await waitSaved(page);
  await page.reload();

  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(preview.locator(".cv-name")).toHaveText('<img src=x onerror="alert(1)">');
  expect(await page.locator(".cv-page img").count()).toBe(0);
  const hrefs = await page.locator(".cv-page a").evaluateAll((as) => as.map((a) => a.getAttribute("href")));
  for (const h of hrefs) expect(h).toMatch(/^(https?:|mailto:)/);
  expect(hrefs.some((h) => h?.startsWith("javascript"))).toBe(false);
  expect(dialogFired).toBe(false);
});

test("tampered localStorage settings cannot inject CSS or templates", async ({ page }) => {
  await newSampleCV(page);
  const id = page.url().split("/").pop()!;
  await page.evaluate((id) => {
    const key = `cvweb:v1:cv:${id}`;
    const cv = JSON.parse(localStorage.getItem(key)!);
    cv.settings = { template: "../../x", accentColor: "red;background:url(https://evil.example)", pageSize: "A0" };
    cv.experience = "not an array";
    localStorage.setItem(key, JSON.stringify(cv));
  }, id);
  await page.reload();
  const doc = page.getByRole("region", { name: "Live preview" }).locator(".cv-page");
  await expect(doc).toHaveClass(/cv-classic/);
  await expect(doc).toHaveClass(/cv-size-A4/);
  expect(await doc.getAttribute("style")).not.toContain("evil");
});

test("security headers are set", async ({ request }) => {
  const res = await request.get("/");
  const h = res.headers();
  expect(h["x-content-type-options"]).toBe("nosniff");
  expect(h["x-frame-options"]).toBe("DENY");
  expect(h["referrer-policy"]).toBe("no-referrer");
  expect(h["x-powered-by"]).toBeUndefined();
});

test("no network requests carry CV data", async ({ page }) => {
  const bodies: string[] = [];
  page.on("request", (r) => {
    bodies.push(r.url() + " " + (r.postData() ?? ""));
  });
  await newBlankCV(page);
  await card(page, "Personal details").getByLabel("Full name").fill("Secret Person Zyx");
  await waitSaved(page);
  await page.reload();
  expect(bodies.filter((b) => b.includes("Zyx"))).toEqual([]);
  expect(bodies.filter((b) => !b.startsWith("http://localhost:3123"))).toEqual([]);
});

for (const [name, setup] of [
  ["dashboard (empty)", async (page: import("@playwright/test").Page) => page.goto("/")],
  ["dashboard (with CV)", async (page: import("@playwright/test").Page) => { await newSampleCV(page); await page.goto("/"); }],
  ["editor", newSampleCV],
] as const) {
  test(`axe: ${name} has no WCAG A/AA violations`, async ({ page }) => {
    await setup(page);
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.help} (${v.nodes.length}) ${v.nodes[0]?.target}`)).toEqual([]);
  });
}

test("keyboard: skip link, template selection and dialog", async ({ page }) => {
  await newSampleCV(page);
  await page.reload(); // start from a fresh document load, as a keyboard user arriving on the page would
  await page.keyboard.press("Tab");
  await expect(page.getByRole("link", { name: "Skip to content" })).toBeFocused();
  await page.keyboard.press("Enter");
  // Template radios are reachable and switchable with arrow keys.
  await page.getByRole("radio", { name: "Executive", exact: true }).focus();
  await page.keyboard.press("ArrowRight");
  await expect(page.getByRole("radio", { name: "Corporate", exact: true })).toBeChecked();
  await expect(page.getByRole("region", { name: "Live preview" }).locator(".cv-page")).toHaveClass(/cv-corporate/);

  await page.goto("/");
  await page.getByRole("button", { name: "Delete Sample CV" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.keyboard.press("Tab");
  await expect(page.getByRole("button", { name: "Delete", exact: true })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
});

test("no invalid interactive nesting (link inside link/label/button) on dashboard or editor", async ({ page }) => {
  await newSampleCV(page);
  const bad = () => page.locator("a a, label a, button a, a button").count();
  expect(await bad(), "editor").toBe(0);
  await page.goto("/");
  await expect(page.getByRole("link", { name: "Sample CV", exact: true })).toBeVisible();
  expect(await bad(), "dashboard").toBe(0);
  // The real preview keeps its clickable links.
  await page.getByRole("link", { name: "Sample CV", exact: true }).click();
  await expect(page.getByRole("region", { name: "Live preview" }).locator('a[href^="mailto:"]')).toHaveCount(1);
});
