import { MAX_PHOTO_CHARS } from "./cv";

const ACCEPTED = ["image/jpeg", "image/png", "image/webp"];
const MAX_INPUT_BYTES = 15 * 1024 * 1024;
const MAX_DIM = 520;

/**
 * Downscales a user-chosen photo in the browser and returns a JPEG data URL small
 * enough to keep in localStorage (~30-80 KB). Re-encoding through a canvas also
 * strips EXIF metadata such as GPS location.
 */
export async function processPhoto(file: File): Promise<string> {
  if (!ACCEPTED.includes(file.type)) throw new Error("Please choose a JPG, PNG or WebP image.");
  if (file.size > MAX_INPUT_BYTES) throw new Error("That image is larger than 15 MB.");

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = () => reject(new Error("That file could not be read as an image."));
      i.src = url;
    });
    const scale = Math.min(1, MAX_DIM / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Your browser could not process the image.");
    ctx.fillStyle = "#ffffff"; // flatten transparency for JPEG
    ctx.fillRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    for (const q of [0.85, 0.75, 0.6, 0.45]) {
      const data = canvas.toDataURL("image/jpeg", q);
      if (data.length <= MAX_PHOTO_CHARS) return data;
    }
    throw new Error("That image could not be compressed enough. Try a smaller one.");
  } finally {
    URL.revokeObjectURL(url);
  }
}
