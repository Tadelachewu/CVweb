"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { BrandLogo } from "./BrandLogo";

const AMBER = "#fbb534";

/** Wavy edge between the amber band and the page. */
function Wave({ flip = false }: { flip?: boolean }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 1440 60"
      preserveAspectRatio="none"
      className={`block h-6 w-full sm:h-10 ${flip ? "rotate-180" : ""}`}
    >
      <path d="M0 0h1440v28c-180 18-360 26-560 14S440 8 260 14 60 34 0 40z" fill={AMBER} />
    </svg>
  );
}

export function SiteHeader({ action }: { action?: ReactNode }) {
  return (
    <header className="screen-only">
      <div style={{ background: AMBER }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 pb-1 pt-4">
          <Link href="/" className="flex items-center gap-3 rounded-full focus-visible:outline-gray-900">
            <span className="rounded-full bg-white p-1 shadow-md">
              <BrandLogo size={56} />
            </span>
            <span>
              <span className="block text-xl font-extrabold text-gray-900">CV for Ethiopians</span>
              <span className="block text-sm text-gray-800">Saved only in this browser, on this device.</span>
            </span>
          </Link>
          {action}
        </div>
      </div>
      <Wave />
    </header>
  );
}

// ---- Social links -------------------------------------------------------

const SOCIAL: { name: string; href: string; icon: ReactNode }[] = [
  {
    name: "LinkedIn",
    href: "https://www.linkedin.com/in/tadele-mesfin-belay",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5">
        <rect x="2" y="2" width="20" height="20" rx="3.5" fill="#0a66c2" />
        <circle cx="7.2" cy="7.4" r="1.6" fill="#fff" />
        <rect x="5.7" y="10" width="3" height="8.5" fill="#fff" />
        <path d="M11 10h2.9v1.3c.5-.8 1.5-1.5 2.9-1.5 2.4 0 3.2 1.5 3.2 4v4.7h-3v-4.2c0-1.1-.2-2-1.4-2s-1.6.9-1.6 2v4.2H11z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "GitHub",
    href: "https://github.com/Tadelachewu",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5">
        <path
          fill="#181717"
          d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1.1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1.1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.8-1.6-2.7-.3-5.5-1.3-5.5-5.9 0-1.3.5-2.4 1.2-3.2-.1-.3-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.7.2 2.9.1 3.2.8.8 1.2 1.9 1.2 3.2 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3"
        />
      </svg>
    ),
  },
  {
    name: "YouTube",
    href: "https://www.youtube.com/@EagleTube-ph6wh",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5">
        <circle cx="12" cy="12" r="10" fill="#ff0000" />
        <path d="M10 8.3v7.4l6-3.7z" fill="#fff" />
      </svg>
    ),
  },
  {
    name: "Telegram",
    href: "https://t.me/TadeleMesfin",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5">
        <path
          fill="#229ed9"
          d="M21.4 3.6 2.9 10.7c-1 .4-1 1.7 0 2l4.6 1.5 1.8 5.6c.2.7 1.1.9 1.6.4l2.6-2.5 4.8 3.6c.6.5 1.5.1 1.7-.7l3.1-15.1c.2-1-.7-1.7-1.7-1.3zM9.7 14.6l-.4 3.8-1.2-4.2 9.2-6.1-7.6 6.5z"
        />
      </svg>
    ),
  },
  {
    name: "TikTok",
    href: "https://www.tiktok.com/@coming_to_hacker",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="h-5 w-5">
        <path
          fill="#25f4ee"
          transform="translate(-0.9 0.6)"
          d="M16.5 3c.4 2.3 1.9 3.8 4.1 4v3.2c-1.5 0-2.9-.4-4.1-1.2v6.3a5.8 5.8 0 1 1-5.8-5.8h.9v3.3l-.9-.1a2.5 2.5 0 1 0 2.6 2.5V3z"
        />
        <path
          fill="#fe2c55"
          transform="translate(0.9 -0.6)"
          d="M16.5 3c.4 2.3 1.9 3.8 4.1 4v3.2c-1.5 0-2.9-.4-4.1-1.2v6.3a5.8 5.8 0 1 1-5.8-5.8h.9v3.3l-.9-.1a2.5 2.5 0 1 0 2.6 2.5V3z"
        />
        <path
          fill="#111"
          d="M16.5 3c.4 2.3 1.9 3.8 4.1 4v3.2c-1.5 0-2.9-.4-4.1-1.2v6.3a5.8 5.8 0 1 1-5.8-5.8h.9v3.3l-.9-.1a2.5 2.5 0 1 0 2.6 2.5V3z"
        />
      </svg>
    ),
  },
];

export const SOCIAL_LINKS = SOCIAL.map(({ name, href }) => ({ name, href }));

export function SiteFooter() {
  return (
    <footer className="screen-only mt-16">
      <Wave flip />
      <div style={{ background: AMBER }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 pb-6 pt-2">
          <p className="text-sm text-gray-900">
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Tadele Mesfin. All rights reserved.
          </p>
          <ul className="flex gap-2" aria-label="Social media">
            {SOCIAL.map((s) => (
              <li key={s.name}>
                <a
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={`${s.name} (opens in a new tab)`}
                  title={s.name}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm ring-1 ring-black/5 transition-transform hover:-translate-y-0.5 focus-visible:outline-gray-900"
                >
                  {s.icon}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
