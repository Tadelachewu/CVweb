"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { CV } from "@/lib/types";
import { TEMPLATES } from "@/lib/types";
import { createBlankCV, duplicateCV, sampleCV } from "@/lib/cv";
import { CV_KEY_PREFIX, INDEX_KEY, clearAllCVs, deleteCV, listCVs, saveCV, StorageError } from "@/lib/storage";
import { Button, ConfirmDialog } from "@/components/ui";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { processPhoto } from "@/lib/photo";
import { CVDocument } from "@/components/templates/CVDocument";
import { ScaledPreview } from "@/components/ScaledPreview";

type Status = { kind: "info" | "error"; text: string } | null;

export default function Dashboard() {
  const router = useRouter();
  const [cvs, setCvs] = useState<CV[] | null>(null);
  const [corrupt, setCorrupt] = useState<string[]>([]);
  const [fatal, setFatal] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>(null);
  const [toDelete, setToDelete] = useState<CV | null>(null);

  const refresh = useCallback(() => {
    try {
      const r = listCVs();
      setCvs(r.cvs);
      setCorrupt(r.corrupt);
      setFatal(null);
    } catch (e) {
      setCvs([]);
      setFatal(e instanceof Error ? e.message : "Browser storage is unavailable.");
    }
  }, []);

  useEffect(() => {
    refresh();
    // Keep the list in sync with edits made in other tabs.
    const onStorage = (e: StorageEvent) => {
      if (e.key === null || e.key === INDEX_KEY || e.key.startsWith(CV_KEY_PREFIX)) refresh();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [refresh]);

  const handleError = (e: unknown) => {
    setStatus({ kind: "error", text: e instanceof StorageError || e instanceof Error ? e.message : "Something went wrong." });
  };

  const create = (cv: CV) => {
    try {
      saveCV(cv);
      router.push(`/cv/${cv.id}`);
    } catch (e) {
      handleError(e);
    }
  };

  const [loadingSample, setLoadingSample] = useState(false);
  /** The example CV uses the bundled sample photo when present; otherwise it shows initials. */
  const createSample = async () => {
    setLoadingSample(true);
    const cv = sampleCV();
    try {
      const res = await fetch("/brand/sample-photo.jpg");
      if (res.ok) {
        const blob = await res.blob();
        cv.personal.photo = await processPhoto(new File([blob], "sample.jpg", { type: blob.type || "image/jpeg" }));
      }
    } catch {
      /* no sample photo: keep initials */
    }
    setLoadingSample(false);
    create(cv);
  };

  const duplicate = (cv: CV) => {
    try {
      const copy = saveCV(duplicateCV(cv));
      refresh();
      setStatus({ kind: "info", text: `Created “${copy.name}”.` });
    } catch (e) {
      handleError(e);
    }
  };

  const [confirmClear, setConfirmClear] = useState(false);
  const total = (cvs?.length ?? 0) + corrupt.length;
  const clearAll = () => {
    try {
      const n = clearAllCVs();
      setStatus({ kind: "info", text: `Deleted all saved CVs (${n}).` });
      refresh();
    } catch (e) {
      handleError(e);
    }
    setConfirmClear(false);
  };

  const confirmDelete = () => {
    if (!toDelete) return;
    try {
      deleteCV(toDelete.id);
      setStatus({ kind: "info", text: `Deleted “${toDelete.name}”.` });
      refresh();
    } catch (e) {
      handleError(e);
    }
    setToDelete(null);
  };

  return (
    <div className="screen-only flex min-h-screen flex-col">
      <SiteHeader
        action={
          <button
            type="button"
            onClick={() => create(createBlankCV())}
            disabled={!!fatal}
            className="rounded-full bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-black disabled:opacity-50"
          >
            + New CV
          </button>
        }
      />

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
        <h1 className="mb-4 text-3xl font-extrabold tracking-tight text-gray-900">My CVs</h1>
        <div role="status" aria-live="polite" className="min-h-0">
          {status && (
            <div
              className={`mb-4 flex items-start justify-between gap-3 rounded-md border px-4 py-3 text-sm ${
                status.kind === "error" ? "border-red-300 bg-red-50 text-red-900" : "border-green-300 bg-green-50 text-green-900"
              }`}
            >
              <span>{status.text}</span>
              <button className="font-medium underline" onClick={() => setStatus(null)}>
                Dismiss
              </button>
            </div>
          )}
        </div>

        {fatal && (
          <div role="alert" className="mb-4 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-sm text-red-900">
            {fatal}
          </div>
        )}

        {corrupt.length > 0 && (
          <div role="alert" className="mb-4 rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            {corrupt.length} saved CV{corrupt.length === 1 ? " is" : "s are"} damaged and could not be opened. The data has
            been left untouched.
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-2">
          <Button variant="primary" onClick={() => create(createBlankCV())} disabled={!!fatal}>
            + New blank CV
          </Button>
          <Button onClick={createSample} disabled={!!fatal || loadingSample}>
            {loadingSample ? "Preparing example…" : "Start from example"}
          </Button>
          {total > 0 && (
            <Button variant="ghost" className="ml-auto text-red-700 hover:bg-red-50" onClick={() => setConfirmClear(true)}>
              Delete all CVs
            </Button>
          )}
        </div>

        {cvs === null ? (
          <p className="text-gray-600">Loading…</p>
        ) : cvs.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-white px-6 py-12 text-center">
            <h2 className="text-lg font-semibold text-gray-900">No CVs yet</h2>
            <p className="mt-1 text-sm text-gray-600">Create a blank CV or start from the example to see how it works.</p>
          </div>
        ) : (
          <>
            <h2 className="mb-3 text-base font-semibold text-gray-900">
              Your CVs <span className="font-normal text-gray-600">({cvs.length})</span>
            </h2>
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {cvs.map((cv) => (
                <li key={cv.id} className="flex flex-col overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
                  <Link
                    href={`/cv/${cv.id}`}
                    className="block border-b border-gray-200 bg-gray-100 p-3"
                    // Mouse shortcut only; keyboard and screen-reader users get the named links below.
                    aria-hidden="true"
                    tabIndex={-1}
                  >
                    <div className="pointer-events-none h-48 overflow-hidden" inert>
                      <ScaledPreview>
                        <CVDocument cv={cv} links={false} />
                      </ScaledPreview>
                    </div>
                  </Link>
                  <div className="flex flex-1 flex-col p-4">
                    <h3 className="truncate font-medium text-gray-900" title={cv.name}>
                      <Link href={`/cv/${cv.id}`} className="hover:underline">
                        {cv.name}
                      </Link>
                    </h3>
                    <p className="text-xs text-gray-600">
                      {TEMPLATES.find((t) => t.id === cv.settings.template)?.label} template · Edited{" "}
                      <time dateTime={cv.updatedAt}>{new Date(cv.updatedAt).toLocaleString()}</time>
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Link
                        href={`/cv/${cv.id}`}
                        className="inline-flex items-center rounded-md bg-blue-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-blue-800"
                      >
                        Edit<span className="sr-only"> {cv.name}</span>
                      </Link>
                      <Button size="sm" onClick={() => duplicate(cv)}>
                        Duplicate<span className="sr-only"> {cv.name}</span>
                      </Button>
                      <Button size="sm" variant="ghost" className="text-red-700 hover:bg-red-50" onClick={() => setToDelete(cv)}>
                        Delete<span className="sr-only"> {cv.name}</span>
                      </Button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </main>
      <SiteFooter />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete this CV?"
        message={
          <>
            “{toDelete?.name}” will be permanently removed from this browser. This cannot be undone.
          </>
        }
        confirmLabel="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setToDelete(null)}
      />
      <ConfirmDialog
        open={confirmClear}
        title="Delete all CVs?"
        message={
          <>
            All {total} saved CV{total === 1 ? "" : "s"} will be permanently removed from this browser. This cannot be undone.
            Download a PDF of any CV you want to keep first.
          </>
        }
        confirmLabel={`Delete all ${total}`}
        onConfirm={clearAll}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
}
