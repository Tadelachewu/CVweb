export type TemplateId = "classic" | "modern" | "minimal" | "executive" | "bold" | "corporate" | "slate" | "studio" | "vivid" | "professional" | "heritage" | "pillbox" | "evergreen" | "horizon" | "onyx" | "coral" | "sage" | "banner" | "summit";
export type PageSize = "A4" | "Letter";
export type FontId = (typeof FONTS)[number]["id"];

export interface PersonalInfo {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  /** Small JPEG data URL (resized in the browser), or "". */
  photo: string;
}

export interface ExperienceItem {
  id: string;
  role: string;
  company: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  /** One bullet point per line. */
  description: string;
}

export interface EducationItem {
  id: string;
  degree: string;
  school: string;
  location: string;
  startDate: string;
  endDate: string;
  description: string;
}

export interface ProjectItem {
  id: string;
  name: string;
  link: string;
  description: string;
}

export interface SimpleItem {
  id: string;
  name: string;
  /** Free text: a skill level, issuer, proficiency, year, etc. */
  detail: string;
  /** Optional 1-5 rating, 0 = not set. Shown as a bar by some templates. */
  level: number;
}

export interface ReferenceItem {
  id: string;
  name: string;
  role: string;
  company: string;
  phone: string;
  email: string;
}

export interface CVSettings {
  template: TemplateId;
  accentColor: string;
  pageSize: PageSize;
  /** "template" keeps each design's own typography. */
  font: FontId;
}

export interface CV {
  id: string;
  /** Internal name shown on the dashboard, e.g. "Frontend roles 2026". */
  name: string;
  createdAt: string;
  updatedAt: string;
  settings: CVSettings;
  personal: PersonalInfo;
  summary: string;
  experience: ExperienceItem[];
  education: EducationItem[];
  skills: SimpleItem[];
  projects: ProjectItem[];
  languages: SimpleItem[];
  certifications: SimpleItem[];
  references: ReferenceItem[];
}

export const TEMPLATES: { id: TemplateId; label: string; description: string; photo: boolean; defaultAccent: string }[] = [
  { id: "executive", label: "Executive", description: "Navy sidebar with photo, timeline experience.", photo: true, defaultAccent: "#1f3a5f" },
  { id: "corporate", label: "Corporate", description: "Dark name banner, grey sidebar, icon headings.", photo: true, defaultAccent: "#2b3445" },
  { id: "bold", label: "Bold", description: "Dark right sidebar with accent stripes.", photo: true, defaultAccent: "#e07b24" },
  { id: "slate", label: "Slate", description: "Teal sidebar under an angled photo.", photo: true, defaultAccent: "#24535c" },
  { id: "studio", label: "Studio", description: "Charcoal sidebar, skill bars, pill header.", photo: true, defaultAccent: "#3a3d42" },
  { id: "vivid", label: "Vivid", description: "Bright accent, round photo, dual timelines.", photo: true, defaultAccent: "#f4c430" },
  { id: "heritage", label: "Heritage", description: "Navy and bronze bands, round photo, dual timelines.", photo: true, defaultAccent: "#a8703a" },
  { id: "pillbox", label: "Pillbox", description: "Rounded sidebar card, pill headings, soft panels.", photo: true, defaultAccent: "#4a6491" },
  { id: "onyx", label: "Onyx", description: "Charcoal sidebar, gold accents, icon rail.", photo: true, defaultAccent: "#f5b700" },
  { id: "coral", label: "Coral", description: "Navy sidebar with name, coral waves, skill chips.", photo: false, defaultAccent: "#e8566a" },
  { id: "sage", label: "Sage", description: "Serif, leafy frame, centred icon headings.", photo: true, defaultAccent: "#3f5e45" },
  { id: "banner", label: "Banner", description: "Full-width name banner, serif, photo right.", photo: true, defaultAccent: "#0f4c75" },
  { id: "summit", label: "Summit", description: "Slate banner, slab serif, banded headings.", photo: true, defaultAccent: "#2f4553" },
  { id: "evergreen", label: "Evergreen", description: "Botanical edge strip, photo top-right, refined type.", photo: true, defaultAccent: "#2f5d50" },
  { id: "horizon", label: "Horizon", description: "Coloured frame with angled corners, dot ratings.", photo: true, defaultAccent: "#f08a3c" },
  { id: "professional", label: "Professional", description: "ATS-friendly single column with a date column.", photo: false, defaultAccent: "#1f2937" },
  { id: "classic", label: "Classic", description: "Single column, serif headings, traditional.", photo: false, defaultAccent: "#1f4e79" },
  { id: "modern", label: "Modern", description: "Tinted header with a right-hand column.", photo: false, defaultAccent: "#0f766e" },
  { id: "minimal", label: "Minimal", description: "Clean single column, lots of whitespace.", photo: false, defaultAccent: "#334155" },
];

export const TEMPLATE_IDS: TemplateId[] = TEMPLATES.map((t) => t.id);

export const ACCENT_COLORS = ["#1f3a5f", "#1f4e79", "#24535c", "#0f766e", "#2b3445", "#3a3d42", "#4a6491", "#a8703a", "#2f5d50", "#f08a3c", "#e07b24", "#f4c430", "#f5b700", "#e8566a", "#3f5e45", "#0f4c75", "#2f4553", "#7c2d12", "#6d28d9", "#be123c"];

/**
 * Font choices. Every stack includes the Ethiopic font so Amharic keeps rendering.
 * "bundled" fonts ship with the app and look identical everywhere; "system" fonts
 * (Verdana, Arial, Calibri, ...) cannot be redistributed, so they are used when the
 * viewer's computer has them and fall back to a close match otherwise.
 */
export const FONTS = [
  { id: "template", label: "Template default", stack: "", group: "default" },
  { id: "inter", label: "Inter", stack: "var(--font-inter), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "roboto", label: "Roboto", stack: "var(--font-roboto), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "opensans", label: "Open Sans", stack: "var(--font-opensans), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "lato", label: "Lato", stack: "var(--font-lato), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "poppins", label: "Poppins", stack: "var(--font-poppins), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "montserrat", label: "Montserrat", stack: "var(--font-display), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "raleway", label: "Raleway", stack: "var(--font-raleway), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "nunito", label: "Nunito", stack: "var(--font-nunito), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "worksans", label: "Work Sans", stack: "var(--font-worksans), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "ibmplex", label: "IBM Plex Sans", stack: "var(--font-ibmplex), var(--font-ethiopic), sans-serif", group: "bundled" },
  { id: "sourceserif", label: "Source Serif", stack: "var(--font-serif-cv), var(--font-ethiopic), Georgia, serif", group: "bundled" },
  { id: "merriweather", label: "Merriweather", stack: "var(--font-merriweather), var(--font-ethiopic), Georgia, serif", group: "bundled" },
  { id: "lora", label: "Lora", stack: "var(--font-lora), var(--font-ethiopic), Georgia, serif", group: "bundled" },
  { id: "playfair", label: "Playfair Display", stack: "var(--font-playfair), var(--font-ethiopic), Georgia, serif", group: "bundled" },
  { id: "garamond", label: "EB Garamond", stack: "var(--font-garamond), var(--font-ethiopic), Garamond, Georgia, serif", group: "bundled" },
  { id: "baskerville", label: "Libre Baskerville", stack: "var(--font-baskerville), var(--font-ethiopic), Baskerville, Georgia, serif", group: "bundled" },
  { id: "ptserif", label: "PT Serif", stack: "var(--font-ptserif), var(--font-ethiopic), Georgia, serif", group: "bundled" },
  { id: "robotoslab", label: "Roboto Slab", stack: "var(--font-slab), var(--font-ethiopic), Georgia, serif", group: "bundled" },
  { id: "verdana", label: "Verdana", stack: "Verdana, Geneva, \"DejaVu Sans\", var(--font-ethiopic), sans-serif", group: "system" },
  { id: "arial", label: "Arial", stack: "Arial, Helvetica, \"Liberation Sans\", var(--font-ethiopic), sans-serif", group: "system" },
  { id: "calibri", label: "Calibri", stack: "Calibri, Carlito, \"Segoe UI\", var(--font-ethiopic), sans-serif", group: "system" },
  { id: "segoe", label: "Segoe UI", stack: "\"Segoe UI\", \"Helvetica Neue\", Arial, var(--font-ethiopic), sans-serif", group: "system" },
  { id: "tahoma", label: "Tahoma", stack: "Tahoma, Verdana, \"DejaVu Sans\", var(--font-ethiopic), sans-serif", group: "system" },
  { id: "trebuchet", label: "Trebuchet MS", stack: "\"Trebuchet MS\", \"Lucida Grande\", Arial, var(--font-ethiopic), sans-serif", group: "system" },
  { id: "georgia", label: "Georgia", stack: "Georgia, \"DejaVu Serif\", var(--font-ethiopic), serif", group: "system" },
  { id: "cambria", label: "Cambria", stack: "Cambria, Caladea, Georgia, var(--font-ethiopic), serif", group: "system" },
  { id: "times", label: "Times New Roman", stack: "\"Times New Roman\", Times, \"Liberation Serif\", var(--font-ethiopic), serif", group: "system" },
] as const satisfies readonly { id: string; label: string; stack: string; group: "default" | "bundled" | "system" }[];

export const FONT_IDS: readonly FontId[] = FONTS.map((f) => f.id);
