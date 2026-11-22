import { expect, test, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { exportPdf, newSampleCV, readPdf } from "./helpers";

const OUT = path.join(process.cwd(), "test-results", "pdfs");

async function selectTemplate(page: Page, label: string) {
  await page.getByRole("radio", { name: label, exact: true }).check({ force: true });
}

/** A long, awkward CV: many entries, long words, long URLs, unicode. */
async function seedLongCV(page: Page) {
  await newSampleCV(page);
  const id = page.url().split("/").pop()!;
  await page.evaluate((id) => {
    const key = `cvweb:v1:cv:${id}`;
    const cv = JSON.parse(localStorage.getItem(key)!);
    cv.personal.fullName = "Maximiliana Alexandrovna Konstantinopoulou-Øberg";
    cv.personal.title = "ከፍተኛ የሶፍትዌር መሐንዲስ / Senior Engineer";
    cv.personal.website = "https://www.extremely-long-domain-name-for-testing-overflow.example.com/portfolio/projects/2026";
    cv.summary = "Supercalifragilisticexpialidociouslylongwordwithoutanyspacesthatcouldoverflowthepage. " + "Experienced engineer. ".repeat(20);
    cv.experience = Array.from({ length: 14 }, (_, i) => ({
      id: `e${i}`,
      role: `Role number ${i + 1} with a fairly long title`,
      company: `Company ${i + 1} Incorporated`,
      location: "Zürich, Switzerland",
      startDate: `Jan ${2000 + i}`,
      endDate: `Dec ${2000 + i}`,
      current: false,
      description: `Achievement A for entry ${i + 1}\nAchievement B with more words to wrap onto another line in narrow columns\nMarker-END-${i + 1}`,
    }));
    cv.skills = Array.from({ length: 25 }, (_, i) => ({ id: `s${i}`, name: `Skill ${i + 1}`, detail: i % 3 ? "" : "Expert", level: (i % 5) + 1 }));
    cv.certifications = [{ id: "c1", name: "Final certification marker", detail: "2026", level: 0 }];
    cv.references = [
      { id: "r1", name: "Reference Person One", role: "CTO", company: "Entoto Digital Labs", phone: "+251 91 234 5678", email: "one@example.com" },
      { id: "r2", name: "Reference Person Two", role: "Manager", company: "Blue Nile Systems", phone: "+1 555 0102", email: "two@example.com" },
    ];
    // Synthetic test photo (no real person).
    const c = document.createElement("canvas");
    c.width = 400; c.height = 500;
    const g = c.getContext("2d")!;
    const grad = g.createLinearGradient(0, 0, 400, 500);
    grad.addColorStop(0, "#8fb3d9"); grad.addColorStop(1, "#2d4a6b");
    g.fillStyle = grad; g.fillRect(0, 0, 400, 500);
    g.fillStyle = "#f1d2b6"; g.beginPath(); g.arc(200, 190, 85, 0, Math.PI * 2); g.fill();
    g.fillStyle = "#33414f"; g.fillRect(90, 320, 220, 180);
    cv.personal.photo = c.toDataURL("image/jpeg", 0.85);
    localStorage.setItem(key, JSON.stringify(cv));
  }, id);
  await page.reload();
}

const FULL_BLEED = ["Executive", "Corporate", "Bold", "Slate", "Studio", "Vivid", "Heritage", "Pillbox", "Onyx", "Coral", "Evergreen", "Horizon", "Sage", "Banner", "Summit"];
for (const template of ["Executive", "Corporate", "Bold", "Slate", "Studio", "Vivid", "Heritage", "Pillbox", "Onyx", "Coral", "Evergreen", "Horizon", "Sage", "Banner", "Summit", "Professional", "Classic", "Modern", "Minimal"]) {
  for (const size of ["A4", "Letter"] as const) {
    test(`PDF ${template} ${size}: correct paper, no content loss, nothing outside the page`, async ({ page }) => {
      await seedLongCV(page);
      await selectTemplate(page, template);
      await page.getByLabel("Paper size").selectOption(size);
      const buf = await exportPdf(page);
      fs.mkdirSync(OUT, { recursive: true });
      fs.writeFileSync(path.join(OUT, `${template}-${size}.pdf`), buf);
      const pdf = await readPdf(buf);

      // Paper size (points). A4 = 595.28 x 841.89, Letter = 612 x 792.
      const [w, h] = size === "A4" ? [595.28, 841.89] : [612, 792];
      for (const p of pdf.pages) {
        expect(Math.abs(p.width - w)).toBeLessThan(1);
        expect(Math.abs(p.height - h)).toBeLessThan(1);
      }
      expect(pdf.pages.length).toBeGreaterThanOrEqual(2);
      expect(pdf.pages.length).toBeLessThanOrEqual(6);

      // Every entry made it into the PDF (text is real, selectable text).
      const flat = pdf.text.replace(/\s+/g, "");
      for (let i = 1; i <= 14; i++) expect(flat).toContain(`Marker-END-${i}`.replace(/\s+/g, ""));
      expect(flat).toContain("Finalcertificationmarker");
      expect(flat).toContain("Skill25");
      expect(flat).toContain("ReferencePersonTwo");
      expect(pdf.text).toContain("Zürich");
      // Amharic (Ethiopic script) survives export as real text, not tofu boxes.
      expect(pdf.text.replace(/\s+/g, "")).toContain("ከፍተኛየሶፍትዌርመሐንዲስ");

      // Nothing is clipped off the page: all text within the page box with the 16mm (~45pt) margins.
      // Full-bleed templates paint to the edge but must keep text at least ~7mm in.
      const margin = (FULL_BLEED.includes(template) ? 7 : 16) * 2.835 - 2;
      for (const p of pdf.pages) {
        for (const it of p.items) {
          if (!it.str.trim()) continue;
          expect.soft(it.x, `"${it.str}" starts left of margin`).toBeGreaterThanOrEqual(margin);
          expect.soft(it.x + it.w, `"${it.str}" overflows right margin`).toBeLessThanOrEqual(p.width - margin + 1);
          expect.soft(it.y, `"${it.str}" below bottom margin`).toBeGreaterThanOrEqual(margin - 4);
          expect.soft(it.y + it.h, `"${it.str}" above top margin`).toBeLessThanOrEqual(p.height - margin + 4);
        }
      }

      // No app chrome leaked into the PDF.
      for (const chrome of ["Download PDF", "Personal details", "My CVs", "Saving", "Add position"]) {
        expect(pdf.text).not.toContain(chrome);
      }

      // Layout integrity: every experience entry sits in the same column. If an entry falls into
      // another column (e.g. a label gutter), its bullets start at a different x position.
      const markerX = pdf.pages.flatMap((p) => p.items.filter((it) => /^Marker-END-\d+$/.test(it.str.trim())).map((it) => it.x));
      expect(markerX.length, "marker lines found").toBeGreaterThanOrEqual(14);
      expect.soft(Math.max(...markerX) - Math.min(...markerX), "entries are not in one column").toBeLessThan(3);

      // An entry is never split across pages: each "Role number N" and its "Marker-END-N" are on the same page.
      for (let i = 1; i <= 14; i++) {
        const rolePage = pdf.pages.findIndex((p) => p.text.includes(`Role number ${i} `));
        const endPage = pdf.pages.findIndex((p) => p.text.replace(/\s+/g, "").includes(`Marker-END-${i}`));
        expect.soft(rolePage, `entry ${i} split across pages`).toBe(endPage);
      }
    });
  }
}

test("short CV exports as exactly one page in every template", async ({ page }) => {
  await newSampleCV(page);
  for (const t of ["Executive", "Corporate", "Bold", "Slate", "Studio", "Vivid", "Heritage", "Pillbox", "Onyx", "Coral", "Evergreen", "Horizon", "Sage", "Banner", "Summit", "Professional", "Classic", "Modern", "Minimal"]) {
    await selectTemplate(page, t);
    const buf = await exportPdf(page);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(path.join(OUT, `short-${t}.pdf`), buf);
    const pdf = await readPdf(buf);
    expect.soft(pdf.pages.length, `${t} should be one page`).toBe(1);
    expect(pdf.text.toLowerCase()).toMatch(/tadele\s+mesfin/);
  }
});

test("PDF export sets a sensible file name via the document title and restores it", async ({ page }) => {
  await newSampleCV(page);
  await page.evaluate(() => {
    window.print = () => {
      (window as unknown as { __title: string }).__title = document.title;
    };
  });
  await page.getByRole("button", { name: "Download PDF" }).click();
  expect(await page.evaluate(() => (window as unknown as { __title: string }).__title)).toBe("Tadele_Mesfin_CV");
  await page.evaluate(() => window.dispatchEvent(new Event("afterprint")));
  await expect(page).toHaveTitle("Edit CV · CV for Ethiopians");
});

test("browser headers/footers (date, title, URL, page numbers) never appear in the PDF", async ({ page }) => {
  await newSampleCV(page);
  for (const t of ["Classic", "Minimal", "Professional", "Executive", "Horizon"]) {
    await selectTemplate(page, t);
    await page.evaluate(() => {
      window.print = () => {};
    });
    await page.getByRole("button", { name: "Download PDF" }).click();
    await page.emulateMedia({ media: "print" });
    const buf = await page.pdf({ preferCSSPageSize: true, printBackground: true, displayHeaderFooter: true });
    await page.emulateMedia({ media: "screen" });
    const pdf = await readPdf(buf);
    expect.soft(pdf.text, `${t}: URL in PDF`).not.toMatch(/localhost|https?:\/\/|\/cv\//);
    expect.soft(pdf.text, `${t}: page title in PDF`).not.toMatch(/CV for Ethiopians|Tadele_Mesfin_CV/);
    expect.soft(pdf.text, `${t}: date in PDF`).not.toMatch(/\d{1,2}\/\d{1,2}\/\d{2,4}/);
    expect.soft(pdf.text, `${t}: page numbers in PDF`).not.toMatch(/\b1\s*\/\s*1\b/);
    expect(pdf.text.toLowerCase()).toMatch(/tadele\s+mesfin/);
  }
});

test("chosen font is embedded in the exported PDF", async ({ page }) => {
  await newSampleCV(page);
  await page.getByLabel("Font").selectOption("merriweather");
  const buf = await exportPdf(page);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, "font-merriweather.pdf"), buf);
  // Read the names of the fonts actually used on page 1 (e.g. "AAAAAA+Merriweather-Bold").
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const docu = await pdfjs.getDocument({ data: new Uint8Array(buf), fontExtraProperties: true }).promise;
  const pg = await docu.getPage(1);
  const ops = await pg.getOperatorList();
  const used = new Set<string>();
  ops.fnArray.forEach((fn, i) => {
    if (fn === pdfjs.OPS.setFont) used.add(String((pg.commonObjs.get(ops.argsArray[i][0]) as { name?: string }).name));
  });
  const names = [...used];
  expect(names.length).toBeGreaterThan(0);
  // Every Latin font on the page is Merriweather (Ethiopic glyphs, if any, may use the Ethiopic font).
  expect(names.filter((n) => !/Ethiopic/i.test(n)).every((n) => /Merriweather/.test(n)), names.join(", ")).toBe(true);
});
