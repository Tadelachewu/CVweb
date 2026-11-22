import { expect, type Page } from "@playwright/test";

export async function newBlankCV(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "+ New blank CV" }).click();
  await expect(page).toHaveURL(/\/cv\/[\w-]+$/, { timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Personal details" })).toBeVisible();
}

export async function newSampleCV(page: Page) {
  await page.goto("/");
  await page.getByRole("button", { name: "Start from example" }).click();
  await expect(page).toHaveURL(/\/cv\/[\w-]+$/, { timeout: 15_000 });
  await expect(page.locator(".cv-name").first()).toHaveText("Tadele Mesfin");
}

export async function waitSaved(page: Page) {
  await expect(page.getByRole("status").filter({ hasText: /Saved|Saving|Not saved/ })).toHaveText("✓ Saved");
}

/** Section card in the editor form by its heading. */
export function card(page: Page, title: string) {
  return page.locator("main section").filter({ has: page.getByRole("heading", { name: title, exact: true, level: 2 }) });
}

/** Triggers the app's own PDF export path (which sets @page size) with print() stubbed, then renders a PDF. */
export async function exportPdf(page: Page): Promise<Buffer> {
  await page.evaluate(() => {
    window.print = () => {};
  });
  await page.getByRole("button", { name: "Download PDF" }).click();
  await page.emulateMedia({ media: "print" });
  const pdf = await page.pdf({ preferCSSPageSize: true, printBackground: true });
  await page.emulateMedia({ media: "screen" });
  return pdf;
}

export interface PdfInfo {
  pages: { width: number; height: number; text: string; items: { str: string; x: number; y: number; w: number; h: number }[] }[];
  text: string;
}

export async function readPdf(buf: Buffer): Promise<PdfInfo> {
  const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), useSystemFonts: true }).promise;
  const pages: PdfInfo["pages"] = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const p = await doc.getPage(n);
    const vp = p.getViewport({ scale: 1 });
    const tc = await p.getTextContent();
    const items = tc.items
      .filter((i): i is typeof i & { str: string; transform: number[]; width: number; height: number } => "str" in i)
      .map((i) => ({ str: i.str, x: i.transform[4], y: i.transform[5], w: i.width, h: i.height }));
    pages.push({ width: vp.width, height: vp.height, text: items.map((i) => i.str).join(" "), items });
  }
  return { pages, text: pages.map((p) => p.text).join("\n") };
}
