import { expect, test } from "@playwright/test";
import { card, newBlankCV, newSampleCV, waitSaved } from "./helpers";

test("empty dashboard shows an empty state", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "No CVs yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Import JSON|Back up all/ })).toHaveCount(0);
  await expect(page.locator('input[type="file"]')).toHaveCount(0);
});

test("create, edit, autosave, reload and reopen a CV", async ({ page }) => {
  await newBlankCV(page);
  const url = page.url();
  await expect(page.getByRole("button", { name: /Export JSON/ })).toHaveCount(0);

  await page.getByLabel("CV name").fill("My Engineering CV");
  const personal = card(page, "Personal details");
  await personal.getByLabel("Full name").fill("Jane Doe");
  await personal.getByLabel("Job title").fill("Backend Engineer");
  await personal.getByLabel("Email").fill("jane@example.com");
  await card(page, "Profile summary").getByLabel("Summary").fill("I build reliable systems.");

  const exp = card(page, "Experience");
  await exp.getByRole("button", { name: "+ Add position" }).click();
  // New item's first field receives focus.
  await expect(exp.getByLabel("Job title")).toBeFocused();
  await exp.getByLabel("Job title").fill("Engineer");
  await exp.getByLabel("Company").fill("Acme");
  await exp.getByLabel("Start date").fill("2021");
  await exp.getByLabel("I currently work here").check();
  await expect(exp.getByLabel("End date")).toBeDisabled();
  await exp.getByLabel("Responsibilities and achievements").fill("Built APIs\nReduced latency by 40%");

  // Live preview reflects edits.
  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(preview.locator(".cv-name")).toHaveText("Jane Doe");
  await expect(preview.getByText("2021 – Present")).toBeVisible();
  await expect(preview.locator(".cv-bullets li")).toHaveText(["Built APIs", "Reduced latency by 40%"]);

  await waitSaved(page);
  await page.reload();
  await expect(page.getByLabel("CV name")).toHaveValue("My Engineering CV");
  await expect(card(page, "Personal details").getByLabel("Full name")).toHaveValue("Jane Doe");
  await expect(card(page, "Experience").getByLabel("Company")).toHaveValue("Acme");
  await expect(card(page, "Experience").getByLabel("I currently work here")).toBeChecked();

  await page.getByRole("link", { name: "← My CVs" }).click();
  await expect(page.getByRole("link", { name: "My Engineering CV", exact: true })).toBeVisible();
  await page.getByRole("link", { name: "My Engineering CV", exact: true }).click();
  await expect(page).toHaveURL(url);
});

test("changes made right before leaving are not lost", async ({ page }) => {
  await newBlankCV(page);
  await card(page, "Personal details").getByLabel("Full name").fill("Quick Typist");
  // Navigate immediately, before the debounce fires.
  await page.getByRole("link", { name: "← My CVs" }).click();
  await page.getByRole("link", { name: /^Edit/ }).first().click();
  await expect(card(page, "Personal details").getByLabel("Full name")).toHaveValue("Quick Typist");
});

test("template, colour and paper size switching persists", async ({ page }) => {
  await newSampleCV(page);
  const doc = page.getByRole("region", { name: "Live preview" }).locator(".cv-page");
  await expect(doc).toHaveClass(/cv-executive/);
  for (const t of ["Corporate", "Bold", "Slate", "Studio", "Vivid", "Heritage", "Pillbox", "Onyx", "Coral", "Evergreen", "Horizon", "Sage", "Banner", "Summit", "Professional", "Classic", "Minimal", "Modern"]) {
    await page.getByRole("radio", { name: t, exact: true }).check({ force: true });
    await expect(doc).toHaveClass(new RegExp(`cv-${t.toLowerCase()}`));
    // Content must survive template switches.
    // Layouts place the company in a heading, a date column or a reference; it must appear somewhere.
    await expect(doc.getByText(/Entoto Digital Labs/).first()).toBeVisible();
    await expect(doc.getByText("Addis Ababa University").first()).toBeVisible();
  }
  await page.getByRole("radio", { name: "Colour #6d28d9" }).check({ force: true });
  await page.getByLabel("Paper size").selectOption("Letter");
  await waitSaved(page);
  await page.reload();
  await expect(doc).toHaveClass(/cv-modern/);
  await expect(doc).toHaveClass(/cv-size-Letter/);
  await expect(doc).toHaveAttribute("style", /#6d28d9/);
});

test("reorder and remove list items", async ({ page }) => {
  await newSampleCV(page);
  const exp = card(page, "Experience");
  // Classic shows "Role · Company" for experience, which makes order easy to read back.
  await page.getByRole("radio", { name: "Classic", exact: true }).check({ force: true });
  const preview = page.getByRole("region", { name: "Live preview" }).locator(".cv-section").filter({ hasText: "Experience" });
  await expect(preview.locator(".cv-org")).toHaveText(["Entoto Digital Labs", "Blue Nile Systems"]);
  await exp.getByRole("button", { name: /Move Software Engineer at Blue Nile Systems up/ }).click();
  await expect(preview.locator(".cv-org")).toHaveText(["Blue Nile Systems", "Entoto Digital Labs"]);
  // Focus follows the moved item's button (which is now disabled at the top, so check the item order instead).
  await exp.getByRole("button", { name: /Remove Software Engineer at Blue Nile Systems/ }).click();
  await expect(preview.locator(".cv-org")).toHaveText(["Entoto Digital Labs"]);
  await waitSaved(page);
  await page.reload();
  await expect(preview.locator(".cv-org")).toHaveText(["Entoto Digital Labs"]);
});

test("duplicate and delete with confirmation", async ({ page }) => {
  await newSampleCV(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Duplicate Sample CV" }).click();
  await expect(page.getByRole("link", { name: "Sample CV (copy)", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete Sample CV (copy)" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete this CV?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(page.getByRole("link", { name: "Sample CV (copy)", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Delete Sample CV (copy)" }).click();
  await dialog.getByRole("button", { name: "Delete" }).click();
  await expect(page.getByRole("link", { name: "Sample CV (copy)", exact: true })).toHaveCount(0);
  await expect(page.getByText("Deleted “Sample CV (copy)”.")).toBeVisible();
  await page.reload();
  await expect(page.getByRole("link", { name: "Sample CV (copy)", exact: true })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Sample CV", exact: true })).toBeVisible();
});

test("unknown CV id shows a helpful not-found page", async ({ page }) => {
  await page.goto("/cv/does-not-exist");
  await expect(page.getByRole("heading", { name: "CV not found" })).toBeVisible();
  await page.getByRole("link", { name: "Back to my CVs" }).click();
  await expect(page).toHaveURL(/\/$/);
});

test("unknown route shows 404 page", async ({ page }) => {
  const res = await page.goto("/nope/nope");
  expect(res?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
});

test("blocked localStorage is reported instead of crashing", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("denied", "SecurityError");
      },
    });
  });
  await page.goto("/");
  await expect(page.getByText(/blocking local storage/)).toBeVisible();
  await expect(page.getByRole("button", { name: "+ New blank CV" })).toBeDisabled();
});

test("corrupt stored CV is reported and others still load", async ({ page }) => {
  await newSampleCV(page);
  await page.evaluate(() => localStorage.setItem("cvweb:v1:cv:broken", "{not json"));
  await page.goto("/");
  await expect(page.getByText(/1 saved CV is damaged/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Sample CV", exact: true })).toBeVisible();
});

test("photo upload is resized, saved, shown, removable; SVG is rejected", async ({ page }) => {
  const { createCanvas } = await import("@napi-rs/canvas");
  const c = createCanvas(1600, 2000); // large on purpose: must be downscaled
  const g = c.getContext("2d");
  g.fillStyle = "#3b6ea5";
  g.fillRect(0, 0, 1600, 2000);
  const png = c.toBuffer("image/png");

  await newSampleCV(page);
  const personal = card(page, "Personal details");
  await page.getByTestId("photo-input").setInputFiles({ name: "me.png", mimeType: "image/png", buffer: png });
  await expect(personal.getByRole("button", { name: "Change photo" })).toBeVisible();
  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(preview.locator(".cv-photo img")).toBeVisible();
  await waitSaved(page);

  const stored = await page.evaluate(() => {
    const id = location.pathname.split("/").pop();
    return JSON.parse(localStorage.getItem(`cvweb:v1:cv:${id}`)!).personal.photo as string;
  });
  expect(stored).toMatch(/^data:image\/jpeg;base64,/);
  expect(stored.length).toBeLessThan(350_000);
  const dims = await page.evaluate(
    (src) => new Promise<[number, number]>((r) => { const i = new Image(); i.onload = () => r([i.width, i.height]); i.src = src; }),
    stored,
  );
  expect(Math.max(...dims)).toBeLessThanOrEqual(520);

  await page.reload();
  await expect(preview.locator(".cv-photo img")).toBeVisible();

  await page.getByTestId("photo-input").setInputFiles({ name: "x.svg", mimeType: "image/svg+xml", buffer: Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'/>") });
  await expect(personal.getByText("Please choose a JPG, PNG or WebP image.")).toBeVisible();

  await personal.getByRole("button", { name: "Remove photo" }).click();
  await expect(preview.locator(".cv-photo img")).toHaveCount(0);
  await expect(preview.locator(".cv-photo-initials")).toHaveText("TM");
});

test("example CV uses the bundled sample photo when present, initials when not", async ({ page }) => {
  // Without the file: initials, and no broken logo image.
  await page.route("**/brand/sample-photo.jpg", (r) => r.fulfill({ status: 404 }));
  await page.route("**/brand/logo.jpg", (r) => r.fulfill({ status: 404 }));
  await newSampleCV(page);
  const preview = page.getByRole("region", { name: "Live preview" });
  await expect(preview.locator(".cv-photo-initials")).toHaveText("TM");
  const broken = await page.locator("img").evaluateAll((imgs) =>
    imgs.filter((i) => (i as HTMLImageElement).complete && (i as HTMLImageElement).naturalWidth === 0 && getComputedStyle(i).display !== "none").length,
  );
  expect(broken).toBe(0);

  // With the file: the example gets that photo, resized and stored locally.
  const { createCanvas } = await import("@napi-rs/canvas");
  const c = createCanvas(900, 1200);
  const g = c.getContext("2d");
  g.fillStyle = "#88a"; g.fillRect(0, 0, 900, 1200);
  const jpg = c.toBuffer("image/jpeg");
  await page.unroute("**/brand/sample-photo.jpg");
  await page.route("**/brand/sample-photo.jpg", (r) => r.fulfill({ status: 200, contentType: "image/jpeg", body: jpg }));
  await newSampleCV(page);
  await expect(page.getByRole("region", { name: "Live preview" }).locator(".cv-photo img")).toBeVisible();
});

test("delete all CVs: confirm dialog, cancel keeps them, confirm removes them", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Delete all CVs" })).toHaveCount(0); // nothing to delete
  await newSampleCV(page);
  await page.goto("/");
  await page.getByRole("button", { name: "+ New blank CV" }).click();
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /Your CVs \(2\)/ })).toBeVisible();

  await page.getByRole("button", { name: "Delete all CVs" }).click();
  const dialog = page.getByRole("dialog", { name: "Delete all CVs?" });
  await expect(dialog).toContainText("All 2 saved CVs will be permanently removed");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByRole("heading", { name: /Your CVs \(2\)/ })).toBeVisible();

  await page.getByRole("button", { name: "Delete all CVs" }).click();
  await dialog.getByRole("button", { name: "Delete all 2" }).click();
  await expect(page.getByText("Deleted all saved CVs (2).")).toBeVisible();
  await expect(page.getByRole("heading", { name: "No CVs yet" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Delete all CVs" })).toHaveCount(0);
  await page.reload();
  await expect(page.getByRole("heading", { name: "No CVs yet" })).toBeVisible();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("cvweb:")))).toEqual([]);
});

test("font choice applies to the whole CV, survives template switches and reload", async ({ page }) => {
  await newSampleCV(page);
  const doc = page.getByRole("region", { name: "Live preview" }).locator(".cv-page");
  const fontOf = (sel: string) => doc.locator(sel).first().evaluate((el) => getComputedStyle(el).fontFamily);

  // Template default: Executive uses its own display font for the name.
  expect(await fontOf(".cv-name")).toMatch(/Montserrat/i);

  for (const [value, family] of [
    ["merriweather", /Merriweather/i],
    ["lato", /Lato/i],
    ["robotoslab", /Roboto Slab/i],
    ["opensans", /Open Sans/i],
  ] as const) {
    await page.getByLabel("Font").selectOption(value);
    expect(await fontOf(".cv-name")).toMatch(family); // headings
    expect(await fontOf(".cv-section-title")).toMatch(family);
    expect(await fontOf(".cv-desc, .cv-bullets li")).toMatch(family); // body text
    expect(await fontOf(".cv-name")).toMatch(/Ethiopic/i); // Amharic fallback kept
  }

  await page.getByRole("radio", { name: "Sage", exact: true }).check({ force: true }); // serif template
  expect(await fontOf(".cv-name")).toMatch(/Open Sans/i);
  await waitSaved(page);
  await page.reload();
  await expect(page.getByLabel("Font")).toHaveValue("opensans");
  expect(await fontOf(".cv-section-title")).toMatch(/Open Sans/i);

  await page.getByLabel("Font").selectOption("template");
  expect(await fontOf(".cv-name")).not.toMatch(/Open Sans/i);
});

test("site header and footer: copyright and social links", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("link", { name: /CV for Ethiopians/ })).toBeVisible();
  const footer = page.locator("footer");
  await expect(footer).toContainText(`© ${new Date().getFullYear()} Tadele Mesfin. All rights reserved.`);
  const expected: Record<string, string> = {
    LinkedIn: "https://www.linkedin.com/in/tadele-mesfin-belay",
    GitHub: "https://github.com/Tadelachewu",
    YouTube: "https://www.youtube.com/@EagleTube-ph6wh",
    Telegram: "https://t.me/TadeleMesfin",
    TikTok: "https://www.tiktok.com/@coming_to_hacker",
  };
  for (const [name, href] of Object.entries(expected)) {
    const link = footer.getByRole("link", { name: `${name} (opens in a new tab)` });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  }
  // Header "+ New CV" creates a CV.
  await page.getByRole("button", { name: "+ New CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[\w-]+$/, { timeout: 15_000 });
});

test("every font option applies to the CV", async ({ page }) => {
  const { FONTS } = await import("../../src/lib/types");
  await newSampleCV(page);
  const name = page.getByRole("region", { name: "Live preview" }).locator(".cv-name");
  for (const f of FONTS.filter((x) => x.id !== "template")) {
    await page.getByLabel("Font").selectOption(f.id);
    const family = await name.evaluate((el) => getComputedStyle(el).fontFamily);
    // Bundled fonts resolve to next/font family names; system fonts appear by name.
    const expectedName = f.group === "system" ? f.label : f.label.replace(/ (Serif|Display)$/, "");
    expect.soft(family, f.id).toContain(f.group === "system" ? expectedName : expectedName.split(" ")[0]);
    expect.soft(family, f.id + " keeps Ethiopic").toMatch(/Ethiopic/i);
  }
});
