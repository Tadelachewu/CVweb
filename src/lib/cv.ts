import type {
  CV,
  CVSettings,
  EducationItem,
  ExperienceItem,
  PageSize,
  PersonalInfo,
  ProjectItem,
  ReferenceItem,
  SimpleItem,
  TemplateId,
} from "./types";
import { ACCENT_COLORS, FONT_IDS, TEMPLATE_IDS } from "./types";
import type { FontId } from "./types";

export const MAX_TEXT = 5000;
export const MAX_SHORT = 300;
export const MAX_ITEMS = 50;

export function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function emptyExperience(): ExperienceItem {
  return { id: newId(), role: "", company: "", location: "", startDate: "", endDate: "", current: false, description: "" };
}
export function emptyEducation(): EducationItem {
  return { id: newId(), degree: "", school: "", location: "", startDate: "", endDate: "", description: "" };
}
export function emptyProject(): ProjectItem {
  return { id: newId(), name: "", link: "", description: "" };
}
export function emptySimple(): SimpleItem {
  return { id: newId(), name: "", detail: "", level: 0 };
}
export function emptyReference(): ReferenceItem {
  return { id: newId(), name: "", role: "", company: "", phone: "", email: "" };
}

export function createBlankCV(name = "Untitled CV"): CV {
  const now = new Date().toISOString();
  return {
    id: newId(),
    name,
    createdAt: now,
    updatedAt: now,
    settings: { template: "classic", accentColor: ACCENT_COLORS[0], pageSize: "A4", font: "template" },
    personal: { fullName: "", title: "", email: "", phone: "", location: "", website: "", linkedin: "", photo: "" },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    languages: [],
    certifications: [],
    references: [],
  };
}

export function duplicateCV(cv: CV): CV {
  const now = new Date().toISOString();
  const copy = sanitizeCV(JSON.parse(JSON.stringify(cv)));
  if (!copy) throw new Error("Could not duplicate CV");
  copy.id = newId();
  copy.name = `${cv.name} (copy)`.slice(0, MAX_SHORT);
  copy.createdAt = now;
  copy.updatedAt = now;
  // Give list items new ids so React keys never collide across documents.
  for (const key of ["experience", "education", "skills", "projects", "languages", "certifications", "references"] as const) {
    (copy[key] as { id: string }[]).forEach((item) => (item.id = newId()));
  }
  return copy;
}

// ---------- Validation / sanitisation of untrusted data (localStorage, imported files) ----------

function str(v: unknown, max = MAX_SHORT): string {
  return typeof v === "string" ? v.slice(0, max) : "";
}
function bool(v: unknown): boolean {
  return v === true;
}
function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}
function arr<T>(v: unknown, map: (o: Record<string, unknown>) => T): T[] {
  if (!Array.isArray(v)) return [];
  return v.slice(0, MAX_ITEMS).map((x) => map(obj(x)));
}
function id(v: unknown): string {
  return typeof v === "string" && v.length > 0 && v.length <= 100 ? v : newId();
}
function isoDate(v: unknown): string {
  if (typeof v === "string" && !Number.isNaN(Date.parse(v))) return new Date(v).toISOString();
  return new Date().toISOString();
}

const PAGE_SIZES: PageSize[] = ["A4", "Letter"];
const HEX = /^#[0-9a-fA-F]{6}$/;

function sanitizeSettings(v: unknown): CVSettings {
  const o = obj(v);
  return {
    template: TEMPLATE_IDS.includes(o.template as TemplateId) ? (o.template as TemplateId) : "classic",
    accentColor: typeof o.accentColor === "string" && HEX.test(o.accentColor) ? o.accentColor : ACCENT_COLORS[0],
    pageSize: PAGE_SIZES.includes(o.pageSize as PageSize) ? (o.pageSize as PageSize) : "A4",
    font: FONT_IDS.includes(o.font as FontId) ? (o.font as FontId) : "template",
  };
}

export const MAX_PHOTO_CHARS = 350_000;
const PHOTO_RE = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+=*$/;
/** Only small base64 raster images are accepted, never SVG (which can carry script) or remote URLs. */
export function safePhoto(v: unknown): string {
  return typeof v === "string" && v.length <= MAX_PHOTO_CHARS && PHOTO_RE.test(v) ? v : "";
}

function level(v: unknown): number {
  return typeof v === "number" && Number.isInteger(v) && v >= 0 && v <= 5 ? v : 0;
}

function sanitizePersonal(v: unknown): PersonalInfo {
  const o = obj(v);
  return {
    fullName: str(o.fullName),
    title: str(o.title),
    email: str(o.email),
    phone: str(o.phone),
    location: str(o.location),
    website: str(o.website),
    linkedin: str(o.linkedin),
    photo: safePhoto(o.photo),
  };
}

/** Returns a structurally valid CV, or null if the input is not recognisably a CV. */
export function sanitizeCV(input: unknown): CV | null {
  const o = obj(input);
  if (typeof o.id !== "string" && typeof o.personal !== "object") return null;
  return {
    id: id(o.id),
    name: str(o.name) || "Untitled CV",
    createdAt: isoDate(o.createdAt),
    updatedAt: isoDate(o.updatedAt),
    settings: sanitizeSettings(o.settings),
    personal: sanitizePersonal(o.personal),
    summary: str(o.summary, MAX_TEXT),
    experience: arr(o.experience, (e) => ({
      id: id(e.id),
      role: str(e.role),
      company: str(e.company),
      location: str(e.location),
      startDate: str(e.startDate, 50),
      endDate: str(e.endDate, 50),
      current: bool(e.current),
      description: str(e.description, MAX_TEXT),
    })),
    education: arr(o.education, (e) => ({
      id: id(e.id),
      degree: str(e.degree),
      school: str(e.school),
      location: str(e.location),
      startDate: str(e.startDate, 50),
      endDate: str(e.endDate, 50),
      description: str(e.description, MAX_TEXT),
    })),
    skills: arr(o.skills, (e) => ({ id: id(e.id), name: str(e.name), detail: str(e.detail), level: level(e.level) })),
    projects: arr(o.projects, (e) => ({
      id: id(e.id),
      name: str(e.name),
      link: str(e.link),
      description: str(e.description, MAX_TEXT),
    })),
    languages: arr(o.languages, (e) => ({ id: id(e.id), name: str(e.name), detail: str(e.detail), level: level(e.level) })),
    certifications: arr(o.certifications, (e) => ({ id: id(e.id), name: str(e.name), detail: str(e.detail), level: level(e.level) })),
    references: arr(o.references, (e) => ({
      id: id(e.id),
      name: str(e.name),
      role: str(e.role),
      company: str(e.company),
      phone: str(e.phone),
      email: str(e.email),
    })),
  };
}

// ---------- Rendering helpers ----------

/**
 * Turns user-typed link text into a safe href, or null.
 * Only http(s) and mailto are allowed, so `javascript:` and `data:` URLs can never be rendered as links.
 */
export function safeHref(raw: string, kind: "url" | "email" = "url"): string | null {
  const value = raw.trim();
  if (!value) return null;
  if (kind === "email") {
    return /^[^\s@<>()]+@[^\s@<>()]+\.[^\s@<>()]+$/.test(value) ? `mailto:${value}` : null;
  }
  const withScheme = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withScheme);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    if (!url.hostname.includes(".")) return null;
    return url.href;
  } catch {
    return null;
  }
}

/** Strips the scheme for display: "https://www.site.com/" -> "site.com". */
export function displayUrl(raw: string): string {
  return raw.trim().replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/$/, "");
}

export function bullets(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^\s*[-•*]\s*/, "").trim())
    .filter(Boolean);
}

export function dateRange(start: string, end: string, current = false): string {
  const s = start.trim();
  const e = current ? "Present" : end.trim();
  if (s && e) return `${s} – ${e}`;
  return s || e;
}

/** Safe file name for the downloaded PDF / JSON. */
export function fileNameFor(cv: CV, ext: string): string {
  const base = (cv.personal.fullName || cv.name || "cv")
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .slice(0, 60);
  return `${base || "cv"}_CV.${ext}`;
}

export function hasContent(cv: CV): boolean {
  const p = cv.personal;
  return Boolean(
    p.fullName || p.title || p.email || p.phone || cv.summary || cv.experience.length || cv.education.length ||
      cv.skills.length || cv.projects.length || cv.languages.length || cv.certifications.length,
  );
}

export function sampleCV(): CV {
  const cv = createBlankCV("Sample CV");
  cv.settings = { template: "executive", accentColor: "#1f3a5f", pageSize: "A4", font: "template" };
  cv.personal = {
    photo: "",
    fullName: "Tadele Mesfin",
    title: "Senior Software Engineer",
    email: "tadele.mesfin@example.com",
    phone: "+251 91 123 4567",
    location: "Addis Ababa, Ethiopia",
    website: "tadelemesfin.dev",
    linkedin: "linkedin.com/in/tadelemesfin",
  };
  cv.summary =
    "Software engineer with 8 years of experience building reliable, accessible web and mobile applications for fintech and public-sector clients. Comfortable owning features end-to-end, from design collaboration to production monitoring.";
  cv.experience = [
    {
      ...emptyExperience(),
      role: "Senior Software Engineer",
      company: "Entoto Digital Labs",
      location: "Addis Ababa",
      startDate: "Mar 2022",
      current: true,
      description:
        "Led the rebuild of a mobile-money web portal used by 2 million customers\nCut median page load time by 38% on low-bandwidth connections\nMentored four junior engineers and introduced code review standards",
    },
    {
      ...emptyExperience(),
      role: "Software Engineer",
      company: "Blue Nile Systems",
      location: "Addis Ababa",
      startDate: "Jan 2018",
      endDate: "Feb 2022",
      description: "Built an Amharic and English design system used by 12 product teams\nIntroduced end-to-end testing with Playwright",
    },
  ];
  cv.education = [
    { ...emptyEducation(), degree: "BSc Computer Science", school: "Addis Ababa University", startDate: "2013", endDate: "2017" },
  ];
  cv.skills = (
    [
      ["TypeScript", 5],
      ["React & Next.js", 5],
      ["Node.js", 4],
      ["Flutter", 4],
      ["PostgreSQL", 4],
      ["Accessibility (WCAG)", 4],
    ] as const
  ).map(([name, level]) => ({ ...emptySimple(), name, level }));
  cv.languages = [
    { ...emptySimple(), name: "Amharic", detail: "Native", level: 5 },
    { ...emptySimple(), name: "English", detail: "Fluent", level: 5 },
    { ...emptySimple(), name: "Afaan Oromo", detail: "Conversational", level: 3 },
  ];
  cv.references = [
    { ...emptyReference(), name: "Dawit Bekele", role: "CTO", company: "Entoto Digital Labs", phone: "+251 91 234 5678", email: "dawit.bekele@example.com" },
    { ...emptyReference(), name: "Hiwot Alemu", role: "Engineering Manager", company: "Blue Nile Systems", phone: "+251 92 345 6789", email: "hiwot.alemu@example.com" },
  ];
  return cv;
}

// ---------- Colour contrast (WCAG 2.x) ----------

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function luminance([r, g, b]: [number, number, number]): number {
  const f = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(hexToRgb(a)), luminance(hexToRgb(b))].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}
/** White or near-black, whichever reads better on the given background. */
export function inkOn(bg: string): string {
  return contrast(bg, "#ffffff") >= contrast(bg, "#1a1a1a") ? "#ffffff" : "#1a1a1a";
}
/** The accent, darkened just enough to reach 4.5:1 against white for body-size text. */
export function readableOnWhite(hex: string): string {
  let [r, g, b] = hexToRgb(hex);
  for (let i = 0; i < 40 && contrast(toHex(r, g, b), "#ffffff") < 4.5; i++) {
    r = Math.round(r * 0.93);
    g = Math.round(g * 0.93);
    b = Math.round(b * 0.93);
  }
  return toHex(r, g, b);
}
function toHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("");
}
