// Usage: node scripts-pdf-to-png.mjs <dir-with-pdfs>  -> writes <name>-p<N>.png next to each PDF
import fs from "node:fs";
import path from "node:path";
import { createCanvas } from "@napi-rs/canvas";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";

const dir = process.argv[2];
for (const f of fs.readdirSync(dir).filter((x) => x.endsWith(".pdf"))) {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(fs.readFileSync(path.join(dir, f))) }).promise;
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: 1.1 });
    const canvas = createCanvas(Math.ceil(vp.width), Math.ceil(vp.height));
    await page.render({ canvas, canvasContext: canvas.getContext("2d"), viewport: vp }).promise;
    fs.writeFileSync(path.join(dir, `${f.replace(/\.pdf$/, "")}-p${n}.png`), canvas.toBuffer("image/png"));
  }
  console.log(f, doc.numPages, "pages");
}
