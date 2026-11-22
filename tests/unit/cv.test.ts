import { beforeEach, describe, expect, it } from "vitest";
import {
  bullets,
  createBlankCV,
  dateRange,
  duplicateCV,
  fileNameFor,
  safeHref,
  sampleCV,
  sanitizeCV,
} from "@/lib/cv";
import { CV_KEY_PREFIX, INDEX_KEY, deleteCV, listCVs, loadCV, saveCV } from "@/lib/storage";

describe("safeHref", () => {
  it("adds https to bare domains", () => {
    expect(safeHref("example.com")).toBe("https://example.com/");
  });
  it("rejects dangerous schemes", () => {
    expect(safeHref("javascript:alert(1)")).toBeNull();
    expect(safeHref("JaVaScRiPt:alert(1)")).toBeNull();
    expect(safeHref("data:text/html,<script>alert(1)</script>")).toBeNull();
    expect(safeHref("vbscript:msgbox")).toBeNull();
  });
  it("rejects non-URLs", () => {
    expect(safeHref("hello")).toBeNull();
    expect(safeHref("")).toBeNull();
  });
  it("validates emails", () => {
    expect(safeHref("a@b.co", "email")).toBe("mailto:a@b.co");
    expect(safeHref("not-an-email", "email")).toBeNull();
    expect(safeHref("a@b.co?bcc=x@y.z<script>", "email")).toBeNull();
  });
});

describe("sanitizeCV", () => {
  it("returns null for non-CV input", () => {
    expect(sanitizeCV(null)).toBeNull();
    expect(sanitizeCV("x")).toBeNull();
    expect(sanitizeCV(42)).toBeNull();
  });
  it("repairs wrong types and bad settings", () => {
    const cv = sanitizeCV({
      id: "abc",
      personal: { fullName: 123, email: "a@b.co" },
      settings: { template: "evil", accentColor: "red;background:url(x)", pageSize: "A0" },
      experience: "nope",
      skills: [{ name: "TS" }, null, 5],
    })!;
    expect(cv.personal.fullName).toBe("");
    expect(cv.personal.email).toBe("a@b.co");
    expect(cv.settings).toEqual({ template: "classic", accentColor: "#1f3a5f", pageSize: "A4", font: "template" });
    expect(cv.experience).toEqual([]);
    expect(cv.skills).toHaveLength(3);
    expect(cv.skills[0].name).toBe("TS");
    expect(cv.skills[1].name).toBe("");
  });
  it("truncates oversized strings and lists", () => {
    const cv = sanitizeCV({
      id: "x",
      summary: "a".repeat(100_000),
      skills: Array.from({ length: 500 }, () => ({ name: "s" })),
    })!;
    expect(cv.summary.length).toBe(5000);
    expect(cv.skills.length).toBe(50);
  });
  it("round-trips a full CV unchanged", () => {
    const cv = sampleCV();
    expect(sanitizeCV(JSON.parse(JSON.stringify(cv)))).toEqual(cv);
  });
});

describe("helpers", () => {
  it("splits bullets and strips markers", () => {
    expect(bullets("- one\n• two\n\n * three\n")).toEqual(["one", "two", "three"]);
  });
  it("formats date ranges", () => {
    expect(dateRange("2020", "2022")).toBe("2020 – 2022");
    expect(dateRange("2020", "2022", true)).toBe("2020 – Present");
    expect(dateRange("", "")).toBe("");
    expect(dateRange("2020", "")).toBe("2020");
  });
  it("builds safe file names", () => {
    const cv = createBlankCV();
    cv.personal.fullName = 'José ../../"Ñúñez" <x>';
    expect(fileNameFor(cv, "pdf")).toBe("Jose_Nunez_x_CV.pdf");
    cv.personal.fullName = "";
    cv.name = "///";
    expect(fileNameFor(cv, "pdf")).toBe("cv_CV.pdf");
  });
  it("duplicates with new ids", () => {
    const a = sampleCV();
    const b = duplicateCV(a);
    expect(b.id).not.toBe(a.id);
    expect(b.name).toBe("Sample CV (copy)");
    expect(b.experience[0].id).not.toBe(a.experience[0].id);
    expect(b.experience[0].role).toBe(a.experience[0].role);
  });
});

describe("storage", () => {
  beforeEach(() => localStorage.clear());

  it("saves, lists, loads and deletes", () => {
    const a = saveCV(createBlankCV("A"));
    const b = saveCV(createBlankCV("B"));
    expect(listCVs().cvs.map((c) => c.name).sort()).toEqual(["A", "B"]);
    expect(loadCV(a.id)?.name).toBe("A");
    deleteCV(a.id);
    expect(loadCV(a.id)).toBeNull();
    expect(listCVs().cvs.map((c) => c.id)).toEqual([b.id]);
    expect(JSON.parse(localStorage.getItem(INDEX_KEY)!)).toEqual([b.id]);
  });

  it("does not let a stored record claim a different id", () => {
    const cv = createBlankCV("A");
    localStorage.setItem(CV_KEY_PREFIX + "real", JSON.stringify({ ...cv, id: "other" }));
    expect(loadCV("real")?.id).toBe("real");
  });

  it("reports corrupt records without deleting them and keeps the others", () => {
    const good = saveCV(createBlankCV("Good"));
    localStorage.setItem(CV_KEY_PREFIX + "bad", "{not json");
    const r = listCVs();
    expect(r.cvs.map((c) => c.id)).toEqual([good.id]);
    expect(r.corrupt).toEqual(["bad"]);
    expect(localStorage.getItem(CV_KEY_PREFIX + "bad")).toBe("{not json");
  });

  it("recovers when the index is corrupt or missing", () => {
    const a = saveCV(createBlankCV("A"));
    localStorage.setItem(INDEX_KEY, "garbage");
    expect(listCVs().cvs.map((c) => c.id)).toEqual([a.id]);
    localStorage.removeItem(INDEX_KEY);
    expect(listCVs().cvs.map((c) => c.id)).toEqual([a.id]);
  });

  it("sorts by last edit, newest first", async () => {
    const a = saveCV(createBlankCV("A"));
    await new Promise((r) => setTimeout(r, 5));
    saveCV(createBlankCV("B"));
    await new Promise((r) => setTimeout(r, 5));
    saveCV(a);
    expect(listCVs().cvs.map((c) => c.name)).toEqual(["A", "B"]);
  });

  it("surfaces quota errors as a readable StorageError", () => {
    const orig = Storage.prototype.setItem;
    Storage.prototype.setItem = function (k: string, v: string) {
      if (k.startsWith(CV_KEY_PREFIX)) throw new DOMException("full", "QuotaExceededError");
      return orig.call(this, k, v);
    };
    try {
      expect(() => saveCV(createBlankCV())).toThrow(/storage is full/i);
    } finally {
      Storage.prototype.setItem = orig;
    }
  });
});

import { contrast, inkOn, readableOnWhite, safePhoto } from "@/lib/cv";
import { ACCENT_COLORS, TEMPLATES } from "@/lib/types";

describe("photo validation", () => {
  it("accepts small base64 raster images", () => {
    expect(safePhoto("data:image/jpeg;base64,/9j/4AAQSkZJRg==")).not.toBe("");
    expect(safePhoto("data:image/png;base64,iVBORw0KGgo=")).not.toBe("");
  });
  it("rejects SVG, remote URLs, script and oversized data", () => {
    expect(safePhoto("data:image/svg+xml;base64,PHN2Zz4=")).toBe("");
    expect(safePhoto("https://evil.example/x.jpg")).toBe("");
    expect(safePhoto('data:image/png;base64,AAAA" onerror="alert(1)')).toBe("");
    expect(safePhoto("data:image/png;base64," + "A".repeat(400_000))).toBe("");
    expect(safePhoto(42)).toBe("");
  });
});

describe("colour contrast", () => {
  it("picks readable ink for every palette colour and template default", () => {
    for (const c of [...ACCENT_COLORS, ...TEMPLATES.map((t) => t.defaultAccent)]) {
      expect(contrast(c, inkOn(c)), c).toBeGreaterThanOrEqual(3); // large/bold sidebar text
      expect(contrast(readableOnWhite(c), "#ffffff"), c).toBeGreaterThanOrEqual(4.5);
    }
  });
  it("keeps already-dark colours unchanged", () => {
    expect(readableOnWhite("#1f3a5f")).toBe("#1f3a5f");
  });
});

import { clearAllCVs } from "@/lib/storage";

describe("clearAllCVs", () => {
  beforeEach(() => localStorage.clear());
  it("removes every CV (including damaged ones) and the index, but nothing else", () => {
    saveCV(createBlankCV("A"));
    saveCV(createBlankCV("B"));
    localStorage.setItem(CV_KEY_PREFIX + "broken", "{oops");
    localStorage.setItem("someone-else:setting", "keep me");
    expect(clearAllCVs()).toBe(3);
    expect(listCVs()).toEqual({ cvs: [], corrupt: [] });
    expect(localStorage.getItem(INDEX_KEY)).toBeNull();
    expect(localStorage.getItem("someone-else:setting")).toBe("keep me");
  });
  it("is safe when there is nothing to clear", () => {
    expect(clearAllCVs()).toBe(0);
  });
});

describe("font setting", () => {
  it("defaults to the template font and rejects unknown values", () => {
    expect(createBlankCV().settings.font).toBe("template");
    expect(sanitizeCV({ id: "x", settings: { font: "comic-sans" } })!.settings.font).toBe("template");
    expect(sanitizeCV({ id: "x", settings: { font: "lato" } })!.settings.font).toBe("lato");
  });
  it("every font stack keeps the Ethiopic fallback", async () => {
    const { FONTS } = await import("@/lib/types");
    for (const f of FONTS.filter((f) => f.id !== "template")) expect(f.stack).toContain("--font-ethiopic");
  });
});
