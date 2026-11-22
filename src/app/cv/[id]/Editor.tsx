"use client";

import Link from "next/link";
import { memo, useCallback, useDeferredValue, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { CV, EducationItem, ExperienceItem, PersonalInfo, ProjectItem, ReferenceItem, SimpleItem, TemplateId } from "@/lib/types";
import { ACCENT_COLORS, FONTS, TEMPLATES } from "@/lib/types";
import type { FontId } from "@/lib/types";
import {
  MAX_ITEMS,
  emptyEducation,
  emptyExperience,
  emptyProject,
  emptyReference,
  emptySimple,
  fileNameFor,
  safeHref,
} from "@/lib/cv";
import { CV_KEY_PREFIX, loadCV, saveCV } from "@/lib/storage";
import { Button, TextArea, TextField } from "@/components/ui";
import { BrandLogo } from "@/components/BrandLogo";
import { CVDocument } from "@/components/templates/CVDocument";
import { processPhoto } from "@/lib/photo";
import { ScaledPreview } from "@/components/ScaledPreview";

type SaveState = "saved" | "pending" | "error";
type ListKey = "experience" | "education" | "projects" | "skills" | "languages" | "certifications" | "references";
type ItemOf<K extends ListKey> = CV[K][number];

export default function Editor({ id }: { id: string }) {
  const [cv, setCv] = useState<CV | null | undefined>(undefined); // undefined = loading, null = not found
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [saveError, setSaveError] = useState<string | null>(null);
  const [externalChange, setExternalChange] = useState(false);
  const [mobileView, setMobileView] = useState<"edit" | "preview">("edit");
  const [announce, setAnnounce] = useState("");

  const cvRef = useRef<CV | null>(null);
  const pendingRef = useRef(false);

  useEffect(() => {
    try {
      const loaded = loadCV(id);
      setCv(loaded);
      cvRef.current = loaded;
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Could not read browser storage.");
      setCv(null);
    }
  }, [id]);

  const persist = useCallback((doc: CV) => {
    try {
      saveCV(doc);
      pendingRef.current = false;
      setSaveState("saved");
      setSaveError(null);
      setExternalChange(false);
    } catch (e) {
      setSaveState("error");
      setSaveError(e instanceof Error ? e.message : "Could not save.");
    }
  }, []);

  // Debounced autosave.
  useEffect(() => {
    if (!cv || saveState !== "pending") return;
    const t = setTimeout(() => persist(cv), 400);
    return () => clearTimeout(t);
  }, [cv, saveState, persist]);

  // Never lose the last keystrokes: flush when the tab is hidden/closed or the editor unmounts.
  useEffect(() => {
    const flush = () => {
      if (pendingRef.current && cvRef.current) persist(cvRef.current);
    };
    const onVisibility = () => document.visibilityState === "hidden" && flush();
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      flush();
      if (pendingRef.current) e.preventDefault(); // still unsaved (e.g. storage full): warn the user
    };
    window.addEventListener("pagehide", flush);
    window.addEventListener("beforeunload", onBeforeUnload);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      flush();
      window.removeEventListener("pagehide", flush);
      window.removeEventListener("beforeunload", onBeforeUnload);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [persist]);

  // Same CV edited in another tab.
  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key !== CV_KEY_PREFIX + id && e.key !== null) return;
      if (pendingRef.current) {
        setExternalChange(true);
        return;
      }
      try {
        const fresh = loadCV(id);
        setCv(fresh);
        cvRef.current = fresh;
      } catch {
        /* ignore */
      }
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [id]);

  const update = useCallback((fn: (d: CV) => CV) => {
    setCv((prev) => {
      if (!prev) return prev;
      const next = fn(prev);
      cvRef.current = next;
      return next;
    });
    pendingRef.current = true;
    setSaveState("pending");
  }, []);

  // ---------- field helpers ----------
  const setPersonal = (key: keyof PersonalInfo, value: string) =>
    update((d) => ({ ...d, personal: { ...d.personal, [key]: value } }));

  const addItem = <K extends ListKey>(key: K, item: ItemOf<K>) => {
    update((d) => ({ ...d, [key]: [...d[key], item] }));
    // Focus the first field of the new item once it renders.
    requestAnimationFrame(() => {
      const el = document.querySelector<HTMLInputElement>(`[data-item-id="${CSS.escape(item.id)}"] input, [data-item-id="${CSS.escape(item.id)}"] textarea`);
      el?.focus();
    });
  };
  const updateItem = <K extends ListKey>(key: K, itemId: string, patch: Partial<ItemOf<K>>) =>
    update((d) => ({ ...d, [key]: (d[key] as ItemOf<K>[]).map((i) => (i.id === itemId ? { ...i, ...patch } : i)) }));
  const removeItem = (key: ListKey, itemId: string, label: string) => {
    update((d) => ({ ...d, [key]: (d[key] as { id: string }[]).filter((i) => i.id !== itemId) }));
    setAnnounce(`${label} removed.`);
  };
  const moveItem = (key: ListKey, itemId: string, dir: -1 | 1) => {
    update((d) => {
      const list = [...(d[key] as { id: string }[])];
      const i = list.findIndex((x) => x.id === itemId);
      const j = i + dir;
      if (i < 0 || j < 0 || j >= list.length) return d;
      [list[i], list[j]] = [list[j], list[i]];
      return { ...d, [key]: list };
    });
    setAnnounce(dir < 0 ? "Moved up." : "Moved down.");
    // Keep focus on the button that was pressed, which moved with its item.
    requestAnimationFrame(() => {
      document.querySelector<HTMLButtonElement>(`[data-item-id="${CSS.escape(itemId)}"] [data-move="${dir}"]`)?.focus();
    });
  };

  const pickTemplate = (t: TemplateId) => {
    const def = TEMPLATES.find((x) => x.id === t)!;
    // Each design ships with its own colour; the user can still change it afterwards.
    update((d) => ({ ...d, settings: { ...d.settings, template: t, accentColor: def.defaultAccent } }));
  };

  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const onPhoto = async (file: File | undefined) => {
    if (!file) return;
    setPhotoError(null);
    setPhotoBusy(true);
    try {
      const data = await processPhoto(file);
      setPersonal("photo", data);
      setAnnounce("Photo added.");
    } catch (e) {
      setPhotoError(e instanceof Error ? e.message : "Could not use that image.");
    } finally {
      setPhotoBusy(false);
    }
  };

  // ---------- export ----------
  const exportPdf = () => {
    if (!cvRef.current) return;
    if (pendingRef.current) persist(cvRef.current);
    const doc = cvRef.current;
    const style = document.createElement("style");
    style.id = "cv-page-style";
    // Zero page margin for every template: the CV carries its own white space (repeated on each
    // page), and the browser has no margin area to print its date / title / URL headers and footers.
    style.textContent = `@page { size: ${doc.settings.pageSize === "Letter" ? "letter" : "A4"}; margin: 0; }`;
    document.getElementById("cv-page-style")?.remove();
    document.head.appendChild(style);
    const prevTitle = document.title;
    // Browsers use the document title as the default PDF file name.
    document.title = fileNameFor(doc, "pdf").replace(/\.pdf$/, "");
    const restore = () => {
      document.title = prevTitle;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    window.print();
  };

  // ---------- render ----------
  if (cv === undefined) {
    return <p className="p-6 text-gray-600">Loading…</p>;
  }
  if (cv === null) {
    return (
      <main id="main" className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-gray-900">CV not found</h1>
        <p className="mt-2 text-gray-600">
          {loadError ??
            "This CV doesn’t exist in this browser. CVs are stored locally, so a link from another device or browser won’t open here."}
        </p>
        <Link href="/" className="mt-6 inline-block rounded-md bg-blue-700 px-4 py-2 text-sm font-medium text-white">
          Back to my CVs
        </Link>
      </main>
    );
  }

  const emailInvalid = cv.personal.email.trim() !== "" && !safeHref(cv.personal.email, "email");
  const websiteInvalid = cv.personal.website.trim() !== "" && !safeHref(cv.personal.website);
  const linkedinInvalid = cv.personal.linkedin.trim() !== "" && !safeHref(cv.personal.linkedin);

  return (
    <>
      <div className="screen-only flex min-h-screen flex-col">
        {/* Toolbar */}
        <header className="sticky top-0 z-20 border-b border-gray-200 bg-white">
          <div className="flex flex-wrap items-center gap-2 px-4 py-2.5">
            <Link href="/" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100">
              <BrandLogo size={28} />
              <span>← My CVs</span>
            </Link>
            <label className="sr-only" htmlFor="cv-name">
              CV name
            </label>
            <input
              id="cv-name"
              value={cv.name}
              maxLength={120}
              onChange={(e) => update((d) => ({ ...d, name: e.target.value }))}
              onBlur={() => !cv.name.trim() && update((d) => ({ ...d, name: "Untitled CV" }))}
              className="min-w-0 flex-1 basis-40 rounded-md border border-transparent px-2 py-1.5 text-base font-semibold text-gray-900 hover:border-gray-300 focus:border-blue-600 focus:outline-none"
            />
            <SaveIndicator state={saveState} error={saveError} onRetry={() => cvRef.current && persist(cvRef.current)} />
            <div className="flex gap-2">
              <Button variant="primary" onClick={exportPdf}>
                Download PDF
              </Button>
            </div>
          </div>
          {externalChange && (
            <p role="alert" className="border-t border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-900">
              This CV was changed in another tab. Your next save here will overwrite those changes.
            </p>
          )}
          {/* Mobile view switcher */}
          <div className="flex border-t border-gray-200 lg:hidden" role="group" aria-label="View">
            {(["edit", "preview"] as const).map((v) => (
              <button
                key={v}
                aria-pressed={mobileView === v}
                onClick={() => setMobileView(v)}
                className={`flex-1 py-2 text-sm font-medium ${mobileView === v ? "border-b-2 border-blue-700 text-blue-800" : "text-gray-600"}`}
              >
                {v === "edit" ? "Edit" : "Preview"}
              </button>
            ))}
          </div>
        </header>

        <div className="flex flex-1 flex-col lg:flex-row">
          {/* Form */}
          <main
            id="main"
            className={`w-full space-y-5 px-4 py-5 lg:block lg:w-[46%] lg:max-w-[640px] lg:overflow-y-auto lg:border-r lg:border-gray-200 lg:[height:calc(100vh-57px)] ${
              mobileView === "edit" ? "block" : "hidden"
            }`}
          >
            <Card title="Design">
              <TemplatePicker cv={cv} onPick={pickTemplate} />
              <div className="flex flex-wrap items-end gap-6">
                <fieldset>
                  <legend className="text-sm font-medium text-gray-800">Accent colour</legend>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    {ACCENT_COLORS.map((c) => (
                      <label key={c} className="relative cursor-pointer">
                        <input
                          type="radio"
                          name="accent"
                          value={c}
                          checked={cv.settings.accentColor === c}
                          onChange={() => update((d) => ({ ...d, settings: { ...d.settings, accentColor: c } }))}
                          className="peer sr-only"
                        />
                        <span
                          className="block h-7 w-7 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-gray-900 peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-blue-600"
                          style={{ background: c }}
                        />
                        <span className="sr-only">Colour {c}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <div>
                  <label htmlFor="page-size" className="block text-sm font-medium text-gray-800">
                    Paper size
                  </label>
                  <select
                    id="page-size"
                    value={cv.settings.pageSize}
                    onChange={(e) =>
                      update((d) => ({ ...d, settings: { ...d.settings, pageSize: e.target.value === "Letter" ? "Letter" : "A4" } }))
                    }
                    className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="A4">A4</option>
                    <option value="Letter">US Letter</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="cv-font" className="block text-sm font-medium text-gray-800">
                    Font
                  </label>
                  <select
                    id="cv-font"
                    value={cv.settings.font}
                    onChange={(e) => {
                      const font = (FONTS.find((f) => f.id === e.target.value)?.id ?? "template") as FontId;
                      update((d) => ({ ...d, settings: { ...d.settings, font } }));
                    }}
                    aria-describedby="cv-font-hint"
                    className="mt-1 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
                  >
                    <option value="template">Template default</option>
                    <optgroup label="Works on every device">
                      {FONTS.filter((f) => f.group === "bundled").map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                    <optgroup label="System fonts (if installed on this computer)">
                      {FONTS.filter((f) => f.group === "system").map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  </select>
                  <p id="cv-font-hint" className="mt-1 max-w-[16rem] text-xs text-gray-600">
                    {FONTS.find((f) => f.id === cv.settings.font)?.group === "system"
                      ? "System font: used if the computer has it, otherwise a close match."
                      : "Amharic text always uses an Ethiopic font."}
                  </p>
                </div>
              </div>
            </Card>

            <Card title="Personal details">
              <PhotoField
                photo={cv.personal.photo}
                busy={photoBusy}
                error={photoError}
                shown={TEMPLATES.find((t) => t.id === cv.settings.template)?.photo ?? false}
                onFile={onPhoto}
                onRemove={() => {
                  setPersonal("photo", "");
                  setAnnounce("Photo removed.");
                }}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <TextField label="Full name" value={cv.personal.fullName} onChange={(v) => setPersonal("fullName", v)} autoComplete="name" />
                <TextField label="Job title" value={cv.personal.title} onChange={(v) => setPersonal("title", v)} placeholder="e.g. Product Designer" />
                <TextField
                  label="Email"
                  type="email"
                  value={cv.personal.email}
                  onChange={(v) => setPersonal("email", v)}
                  autoComplete="email"
                  hint={emailInvalid ? "This doesn’t look like an email address. It will be shown but not linked." : undefined}
                />
                <TextField label="Phone" type="tel" value={cv.personal.phone} onChange={(v) => setPersonal("phone", v)} autoComplete="tel" />
                <TextField label="Location" value={cv.personal.location} onChange={(v) => setPersonal("location", v)} placeholder="City, Country" />
                <TextField
                  label="Website"
                  value={cv.personal.website}
                  onChange={(v) => setPersonal("website", v)}
                  placeholder="yoursite.com"
                  hint={websiteInvalid ? "Not a valid web address. It will be shown as plain text." : undefined}
                />
                <TextField
                  label="LinkedIn"
                  value={cv.personal.linkedin}
                  onChange={(v) => setPersonal("linkedin", v)}
                  placeholder="linkedin.com/in/you"
                  hint={linkedinInvalid ? "Not a valid web address. It will be shown as plain text." : undefined}
                />
              </div>
            </Card>

            <Card title="Profile summary">
              <TextArea
                label="Summary"
                value={cv.summary}
                onChange={(v) => update((d) => ({ ...d, summary: v }))}
                rows={4}
                maxLength={1500}
                hint="2–4 sentences about who you are and what you do best."
              />
            </Card>

            <ListCard<"experience">
              title="Experience"
              itemNoun="position"
              items={cv.experience}
              onAdd={() => addItem("experience", emptyExperience())}
              onMove={(i, dir) => moveItem("experience", i, dir)}
              onRemove={(i, label) => removeItem("experience", i, label)}
              labelOf={(e) => [e.role, e.company].filter(Boolean).join(" at ") || "New position"}
              render={(e: ExperienceItem) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Job title" value={e.role} onChange={(v) => updateItem("experience", e.id, { role: v })} />
                  <TextField label="Company" value={e.company} onChange={(v) => updateItem("experience", e.id, { company: v })} />
                  <TextField label="Start date" value={e.startDate} placeholder="e.g. Jan 2022" maxLength={50} onChange={(v) => updateItem("experience", e.id, { startDate: v })} />
                  <div>
                    <TextField
                      label="End date"
                      value={e.current ? "" : e.endDate}
                      placeholder={e.current ? "Present" : "e.g. Mar 2024"}
                      maxLength={50}
                      disabled={e.current}
                      onChange={(v) => updateItem("experience", e.id, { endDate: v })}
                    />
                    <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                      <input
                        type="checkbox"
                        checked={e.current}
                        onChange={(ev) => updateItem("experience", e.id, { current: ev.target.checked })}
                        className="h-4 w-4"
                      />
                      I currently work here
                    </label>
                  </div>
                  <div className="sm:col-span-2">
                    <TextField label="Location" value={e.location} onChange={(v) => updateItem("experience", e.id, { location: v })} />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea
                      label="Responsibilities and achievements"
                      value={e.description}
                      rows={5}
                      onChange={(v) => updateItem("experience", e.id, { description: v })}
                      hint="One bullet point per line."
                    />
                  </div>
                </div>
              )}
            />

            <ListCard<"education">
              title="Education"
              itemNoun="education entry"
              items={cv.education}
              onAdd={() => addItem("education", emptyEducation())}
              onMove={(i, dir) => moveItem("education", i, dir)}
              onRemove={(i, label) => removeItem("education", i, label)}
              labelOf={(e) => [e.degree, e.school].filter(Boolean).join(", ") || "New education entry"}
              render={(e: EducationItem) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Degree / qualification" value={e.degree} onChange={(v) => updateItem("education", e.id, { degree: v })} />
                  <TextField label="School / university" value={e.school} onChange={(v) => updateItem("education", e.id, { school: v })} />
                  <TextField label="Start date" value={e.startDate} maxLength={50} onChange={(v) => updateItem("education", e.id, { startDate: v })} />
                  <TextField label="End date" value={e.endDate} maxLength={50} onChange={(v) => updateItem("education", e.id, { endDate: v })} />
                  <div className="sm:col-span-2">
                    <TextField label="Location" value={e.location} onChange={(v) => updateItem("education", e.id, { location: v })} />
                  </div>
                  <div className="sm:col-span-2">
                    <TextArea label="Details" value={e.description} rows={3} onChange={(v) => updateItem("education", e.id, { description: v })} hint="Optional. One point per line." />
                  </div>
                </div>
              )}
            />

            <SimpleListCard title="Skills" noun="skill" detailLabel="Detail (optional)" showLevel items={cv.skills} listKey="skills" {...{ addItem, updateItem, moveItem, removeItem }} />

            <ListCard<"projects">
              title="Projects"
              itemNoun="project"
              items={cv.projects}
              onAdd={() => addItem("projects", emptyProject())}
              onMove={(i, dir) => moveItem("projects", i, dir)}
              onRemove={(i, label) => removeItem("projects", i, label)}
              labelOf={(p) => p.name || "New project"}
              render={(p: ProjectItem) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Project name" value={p.name} onChange={(v) => updateItem("projects", p.id, { name: v })} />
                  <TextField
                    label="Link"
                    value={p.link}
                    placeholder="github.com/you/project"
                    onChange={(v) => updateItem("projects", p.id, { link: v })}
                    hint={p.link.trim() && !safeHref(p.link) ? "Not a valid web address. It will be shown as plain text." : undefined}
                  />
                  <div className="sm:col-span-2">
                    <TextArea label="Description" value={p.description} rows={3} onChange={(v) => updateItem("projects", p.id, { description: v })} hint="One point per line." />
                  </div>
                </div>
              )}
            />

            <SimpleListCard title="Languages" noun="language" detailLabel="Proficiency" showLevel items={cv.languages} listKey="languages" {...{ addItem, updateItem, moveItem, removeItem }} />
            <SimpleListCard title="Certifications" noun="certification" detailLabel="Issuer / year" items={cv.certifications} listKey="certifications" {...{ addItem, updateItem, moveItem, removeItem }} />

            <ListCard<"references">
              title="References"
              itemNoun="reference"
              items={cv.references}
              onAdd={() => addItem("references", emptyReference())}
              onMove={(i, dir) => moveItem("references", i, dir)}
              onRemove={(i, label) => removeItem("references", i, label)}
              labelOf={(r) => r.name || "New reference"}
              render={(r: ReferenceItem) => (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <TextField label="Name" value={r.name} onChange={(v) => updateItem("references", r.id, { name: v })} />
                  <TextField label="Job title" value={r.role} onChange={(v) => updateItem("references", r.id, { role: v })} />
                  <TextField label="Company" value={r.company} onChange={(v) => updateItem("references", r.id, { company: v })} />
                  <TextField label="Phone" type="tel" value={r.phone} onChange={(v) => updateItem("references", r.id, { phone: v })} />
                  <div className="sm:col-span-2">
                    <TextField
                      label="Email"
                      type="email"
                      value={r.email}
                      onChange={(v) => updateItem("references", r.id, { email: v })}
                      hint={r.email.trim() && !safeHref(r.email, "email") ? "This doesn’t look like an email address." : undefined}
                    />
                  </div>
                </div>
              )}
            />
            <p className="text-xs text-gray-600">Only list references who have agreed to be contacted.</p>

            <p className="pb-6 text-xs text-gray-600">
              Tip: after clicking <strong>Download PDF</strong>, choose <em>Save as PDF</em> as the destination in the print dialog.
            </p>
          </main>

          {/* Preview */}
          <section
            aria-label="Live preview"
            className={`flex-1 bg-gray-200 px-4 py-6 lg:block lg:overflow-y-auto lg:[height:calc(100vh-57px)] ${mobileView === "preview" ? "block" : "hidden"}`}
          >
            <div className="mx-auto max-w-[820px]">
              <ScaledPreview>
                <CVDocument cv={cv} />
              </ScaledPreview>
            </div>
          </section>
        </div>
        <div aria-live="polite" className="sr-only">
          {announce}
        </div>
      </div>

      {/* Unscaled copy used only when printing / saving as PDF. */}
      <div className="print-only">
        <CVDocument cv={cv} />
      </div>
    </>
  );
}

function SaveIndicator({ state, error, onRetry }: { state: SaveState; error: string | null; onRetry: () => void }) {
  return (
    <div role="status" aria-live="polite" className="text-sm">
      {state === "saved" && <span className="text-green-800">✓ Saved</span>}
      {state === "pending" && <span className="text-gray-600">Saving…</span>}
      {state === "error" && (
        <span className="text-red-800">
          Not saved: {error}{" "}
          <button className="font-medium underline" onClick={onRetry}>
            Retry
          </button>
        </span>
      )}
    </div>
  );
}

function Card({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  const headingId = `h-${title.toLowerCase().replace(/\W+/g, "-")}`;
  return (
    <section aria-labelledby={headingId} className="space-y-4 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <h2 id={headingId} className="text-lg font-bold text-black">
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function ItemShell({
  id,
  label,
  index,
  count,
  onMove,
  onRemove,
  children,
}: {
  id: string;
  label: string;
  index: number;
  count: number;
  onMove: (dir: -1 | 1) => void;
  onRemove: () => void;
  children: ReactNode;
}) {
  return (
    <div data-item-id={id} role="group" aria-label={label} className="rounded-md border border-gray-200 bg-gray-50 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="min-w-0 truncate text-sm font-medium text-gray-800">{label}</h3>
        <div className="flex shrink-0 gap-1">
          <Button size="sm" variant="ghost" data-move="-1" disabled={index === 0} onClick={() => onMove(-1)} aria-label={`Move ${label} up`}>
            ↑
          </Button>
          <Button size="sm" variant="ghost" data-move="1" disabled={index === count - 1} onClick={() => onMove(1)} aria-label={`Move ${label} down`}>
            ↓
          </Button>
          <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={onRemove} aria-label={`Remove ${label}`}>
            Remove
          </Button>
        </div>
      </div>
      {children}
    </div>
  );
}

function ListCard<K extends ListKey>({
  title,
  itemNoun,
  items,
  onAdd,
  onMove,
  onRemove,
  labelOf,
  render,
}: {
  title: string;
  itemNoun: string;
  items: ItemOf<K>[];
  onAdd: () => void;
  onMove: (id: string, dir: -1 | 1) => void;
  onRemove: (id: string, label: string) => void;
  labelOf: (item: ItemOf<K>) => string;
  render: (item: ItemOf<K>) => ReactNode;
}) {
  const full = items.length >= MAX_ITEMS;
  return (
    <Card title={title}>
      {items.length === 0 && <p className="text-sm text-gray-600">Nothing added yet.</p>}
      <div className="space-y-3">
        {items.map((item, i) => (
          <ItemShell
            key={item.id}
            id={item.id}
            label={labelOf(item)}
            index={i}
            count={items.length}
            onMove={(dir) => onMove(item.id, dir)}
            onRemove={() => onRemove(item.id, labelOf(item))}
          >
            {render(item)}
          </ItemShell>
        ))}
      </div>
      <Button onClick={onAdd} disabled={full}>
        + Add {itemNoun}
      </Button>
      {full && <p className="text-xs text-gray-600">Maximum of {MAX_ITEMS} entries reached.</p>}
    </Card>
  );
}

type SimpleKey = "skills" | "languages" | "certifications";

function SimpleListCard({
  title,
  noun,
  detailLabel,
  showLevel = false,
  items,
  listKey,
  addItem,
  updateItem,
  moveItem,
  removeItem,
}: {
  title: string;
  noun: string;
  detailLabel: string;
  showLevel?: boolean;
  items: SimpleItem[];
  listKey: SimpleKey;
  addItem: (key: SimpleKey, item: SimpleItem) => void;
  updateItem: (key: SimpleKey, id: string, patch: Partial<SimpleItem>) => void;
  moveItem: (key: SimpleKey, id: string, dir: -1 | 1) => void;
  removeItem: (key: SimpleKey, id: string, label: string) => void;
}) {
  return (
    <ListCard<SimpleKey>
      title={title}
      itemNoun={noun}
      items={items}
      onAdd={() => addItem(listKey, emptySimple())}
      onMove={(i, d) => moveItem(listKey, i, d)}
      onRemove={(i, l) => removeItem(listKey, i, l)}
      labelOf={(s) => s.name || `New ${noun}`}
      render={(s) => (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <TextField label={title.replace(/s$/, "")} value={s.name} onChange={(v) => updateItem(listKey, s.id, { name: v })} />
          <TextField label={detailLabel} value={s.detail} onChange={(v) => updateItem(listKey, s.id, { detail: v })} />
          {showLevel && <LevelField value={s.level} onChange={(v) => updateItem(listKey, s.id, { level: v })} />}
        </div>
      )}
    />
  );
}

function LevelField({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const id = useId();
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-800">
        Rating bar
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-describedby={`${id}-hint`}
        className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
      >
        <option value={0}>No bar</option>
        {[1, 2, 3, 4, 5].map((n) => (
          <option key={n} value={n}>
            {n} / 5
          </option>
        ))}
      </select>
      <p id={`${id}-hint`} className="mt-1 text-xs text-gray-600">
        Shown as a rating in the Studio (skills) and Horizon (languages) templates.
      </p>
    </div>
  );
}

function PhotoField({
  photo,
  busy,
  error,
  shown,
  onFile,
  onRemove,
}: {
  photo: string;
  busy: boolean;
  error: string | null;
  shown: boolean;
  onFile: (f: File | undefined) => void;
  onRemove: () => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const id = useId();
  return (
    <div className="flex flex-wrap items-center gap-4">
      <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gray-200 text-xs text-gray-600">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element -- local data URL
          <img src={photo} alt="Your current photo" className="h-full w-full object-cover" />
        ) : (
          "No photo"
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => input.current?.click()} disabled={busy} aria-describedby={`${id}-hint`}>
            {busy ? "Processing…" : photo ? "Change photo" : "Add photo"}
          </Button>
          {photo && (
            <Button variant="ghost" className="text-red-700 hover:bg-red-50" onClick={onRemove}>
              Remove photo
            </Button>
          )}
        </div>
        <input
          ref={input}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          data-testid="photo-input"
          onChange={(e) => {
            onFile(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
        <p id={`${id}-hint`} className="mt-1 text-xs text-gray-600">
          JPG, PNG or WebP. Resized and kept only in this browser.
          {!shown && " The current template doesn’t show a photo."}
        </p>
        {error && (
          <p role="alert" className="mt-1 text-xs font-medium text-red-800">
            {error}
          </p>
        )}
      </div>
    </div>
  );
}

const TemplateThumb = memo(function TemplateThumb({ cv }: { cv: CV }) {
  return (
    <div className="pointer-events-none h-[150px] overflow-hidden" aria-hidden="true" inert>
      <ScaledPreview>
        <CVDocument cv={cv} links={false} />
      </ScaledPreview>
    </div>
  );
});

function TemplatePicker({ cv, onPick }: { cv: CV; onPick: (t: TemplateId) => void }) {
  // Thumbnails render the user's own content; deferring keeps typing responsive.
  const deferred = useDeferredValue(cv);
  return (
    <fieldset>
      <legend className="text-sm font-medium text-gray-800">Template</legend>
      <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {TEMPLATES.map((t) => {
          const selected = cv.settings.template === t.id;
          const thumbCv: CV = {
            ...deferred,
            settings: { ...deferred.settings, template: t.id, accentColor: selected ? deferred.settings.accentColor : t.defaultAccent },
          };
          return (
            <label
              key={t.id}
              className={`relative cursor-pointer overflow-hidden rounded-md border-2 bg-white text-sm has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-blue-600 has-[:focus-visible]:ring-offset-2 ${
                selected ? "border-blue-700" : "border-gray-200 hover:border-gray-400"
              }`}
            >
              <input
                type="radio"
                name="template"
                value={t.id}
                checked={selected}
                onChange={() => onPick(t.id)}
                className="sr-only"
                aria-label={t.label}
                aria-describedby={`tpl-${t.id}-desc`}
              />
              <TemplateThumb cv={thumbCv} />
              <span
                className={`block border-t px-2 py-1.5 font-medium ${selected ? "border-blue-700 bg-blue-50 text-blue-900" : "border-gray-200 text-gray-900"}`}
                aria-hidden="true"
              >
                {t.label}
              </span>
              <span id={`tpl-${t.id}-desc`} className="sr-only">
                {t.description}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
