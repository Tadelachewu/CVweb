import { createContext, useContext, type CSSProperties, type ReactNode } from "react";
import type { CV, SimpleItem, TemplateId } from "@/lib/types";
import { FONTS } from "@/lib/types";
import { bullets, dateRange, displayUrl, inkOn, readableOnWhite, safeHref, safePhoto } from "@/lib/cv";
import { Icon, type IconName } from "./icons";

/**
 * Renders a CV as a printable page. The same markup is used for the on-screen
 * preview and for PDF export (via the browser's print engine), so what you see
 * is what gets exported.
 */
/** False inside thumbnails, which are themselves clickable: links inside links are invalid HTML. */
const LinksEnabled = createContext(true);

export function CVDocument({ cv, links = true }: { cv: CV; links?: boolean }) {
  return (
    <LinksEnabled.Provider value={links}>
      <CVPage cv={cv} />
    </LinksEnabled.Provider>
  );
}

function CVPage({ cv }: { cv: CV }) {
  const t = cv.settings.template;
  const accent = cv.settings.accentColor;
  const fontStack = FONTS.find((f) => f.id === cv.settings.font)?.stack ?? "";
  const style = {
    "--accent": accent,
    "--accent-text": readableOnWhite(accent),
    "--on-accent": inkOn(accent),
    ...(fontStack ? { "--cv-font": fontStack } : {}),
  } as CSSProperties;
  const layout = SIDEBAR_LAYOUTS[t];
  return (
    <article
      className={`cv-page cv-${t} cv-size-${cv.settings.pageSize} ${layout ? "cv-sb" : DECORATED.includes(t) ? "cv-dec" : "cv-single"}${fontStack ? " cv-font-custom" : ""}`}
      style={style}
      aria-label={`CV preview: ${cv.personal.fullName || cv.name}`}
    >
      {layout ? (
        <SidebarLayout cv={cv} cfg={layout} />
      ) : t === "modern" ? (
        <ModernLayout cv={cv} />
      ) : t === "professional" ? (
        <ProfessionalLayout cv={cv} />
      ) : t === "evergreen" || t === "horizon" || t === "sage" || t === "banner" || t === "summit" ? (
        <DecoratedLayout cv={cv} variant={t} />
      ) : (
        <SingleColumnLayout cv={cv} />
      )}
    </article>
  );
}


const DECORATED: TemplateId[] = ["evergreen", "horizon", "sage", "banner", "summit"];

// ------------------------------------------------------------------ building blocks

type SectionKey =
  | "contact"
  | "summary"
  | "experience"
  | "education"
  | "skills"
  | "projects"
  | "languages"
  | "certifications"
  | "references";

const SECTION_META: Record<Exclude<SectionKey, "contact">, { title: string; icon: IconName }> = {
  summary: { title: "Profile", icon: "user" },
  experience: { title: "Work Experience", icon: "briefcase" },
  education: { title: "Education", icon: "cap" },
  skills: { title: "Skills", icon: "star" },
  projects: { title: "Projects", icon: "folder" },
  languages: { title: "Languages", icon: "chat" },
  certifications: { title: "Certifications & Awards", icon: "award" },
  references: { title: "References", icon: "users" },
};

function Section({ title, icon, children, className = "" }: { title: string; icon?: IconName; children: ReactNode; className?: string }) {
  return (
    <section className={`cv-section ${className}`}>
      <h2 className="cv-section-title">
        {icon && (
          <span className="cv-sec-icon">
            <Icon name={icon} />
          </span>
        )}
        <span>{title}</span>
      </h2>
      {children}
    </section>
  );
}

function Bullets({ text }: { text: string }) {
  const lines = bullets(text);
  if (lines.length === 0) return null;
  if (lines.length === 1) return <p className="cv-desc">{lines[0]}</p>;
  return (
    <ul className="cv-bullets">
      {lines.map((l, i) => (
        <li key={i}>{l}</li>
      ))}
    </ul>
  );
}

function filled<T extends object>(items: T[], ...keys: (keyof T)[]): T[] {
  return items.filter((i) => keys.some((k) => String(i[k] ?? "").trim() !== ""));
}

function ExtLink({ href, children }: { href: string | null; children: ReactNode }) {
  const enabled = useContext(LinksEnabled);
  return href && enabled ? (
    <a href={href} rel="noopener noreferrer nofollow" target="_blank">
      {children}
    </a>
  ) : (
    <>{children}</>
  );
}

function contactsOf(cv: CV) {
  const p = cv.personal;
  const list: { key: string; icon: IconName; text: string; href: string | null }[] = [];
  if (p.phone) list.push({ key: "phone", icon: "phone", text: p.phone, href: null });
  if (p.email) list.push({ key: "email", icon: "mail", text: p.email, href: safeHref(p.email, "email") });
  if (p.location) list.push({ key: "location", icon: "pin", text: p.location, href: null });
  if (p.website) list.push({ key: "website", icon: "globe", text: displayUrl(p.website), href: safeHref(p.website) });
  if (p.linkedin) list.push({ key: "linkedin", icon: "link", text: displayUrl(p.linkedin), href: safeHref(p.linkedin) });
  return list;
}

function ContactList({ cv, icons }: { cv: CV; icons: boolean }) {
  const contacts = contactsOf(cv);
  if (!contacts.length) return null;
  return (
    <ul className={icons ? "cv-contact-list" : "cv-contacts"}>
      {contacts.map((c) => (
        <li key={c.key}>
          {icons && <Icon name={c.icon} />}
          <span>
            <ExtLink href={c.href}>{c.text}</ExtLink>
          </span>
        </li>
      ))}
    </ul>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? "") + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase() || "CV";
}

function Photo({ cv }: { cv: CV }) {
  const src = safePhoto(cv.personal.photo);
  return (
    <div className="cv-photo-wrap">
    <div className="cv-photo">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL, nothing to optimise
        <img src={src} alt={cv.personal.fullName ? `Photo of ${cv.personal.fullName}` : "Profile photo"} />
      ) : (
        <span className="cv-photo-initials" aria-hidden="true">
          {initials(cv.personal.fullName)}
        </span>
      )}
    </div>
    </div>
  );
}

function Name({ cv, split }: { cv: CV; split?: boolean }) {
  const full = cv.personal.fullName.trim() || "Your Name";
  const words = full.split(/\s+/);
  if (!split || words.length < 2) return <h1 className="cv-name">{full}</h1>;
  return (
    <h1 className="cv-name">
      <span className="cv-name-first">{words.slice(0, -1).join(" ")}</span>{" "}
      <span className="cv-name-last">{words[words.length - 1]}</span>
    </h1>
  );
}

function Header({ cv }: { cv: CV }) {
  return (
    <header className="cv-header">
      <Name cv={cv} />
      {cv.personal.title && <p className="cv-title">{cv.personal.title}</p>}
      <ContactList cv={cv} icons={false} />
    </header>
  );
}

// ------------------------------------------------------------------ sections

interface SecOpts {
  icons?: boolean;
  timeline?: boolean;
  /** Narrow column: stack dates under titles. */
  compact?: boolean;
  bars?: boolean;
  /** Two-column entries: dates + organisation on the left, role + details on the right. */
  dated?: boolean;
  /** Skills/languages as a multi-column bullet grid. */
  cols?: boolean;
  /** "Company, Role" titles; dates and location aligned right (or left when dated). */
  orgFirst?: boolean;
  /** Alternative presentation for simple lists. */
  list?: "inline" | "dots" | "grid2" | "cols3";
  /** Override the section heading. */
  title?: string;
  /** Role in bold with the organisation in italics underneath; date and location on the right. */
  stack?: boolean;
}

function renderSection(cv: CV, key: SectionKey, o: SecOpts = {}): ReactNode {
  const baseMeta = key === "contact" ? { title: "Contact", icon: "phone" as IconName } : SECTION_META[key];
  const meta = { ...baseMeta, title: o.title ?? baseMeta.title };
  const icon = o.icons ? meta.icon : undefined;
  const cls = [o.compact ? "cv-compact" : "", o.timeline ? "cv-timeline" : ""].join(" ");

  switch (key) {
    case "contact": {
      if (!contactsOf(cv).length) return null;
      return (
        <Section key={key} title="Contact" icon={icon} className={cls}>
          <ContactList cv={cv} icons />
        </Section>
      );
    }
    case "summary":
      if (!cv.summary.trim()) return null;
      return (
        <Section key={key} title={meta.title} icon={icon} className={cls}>
          <p className="cv-desc cv-summary">{cv.summary.trim()}</p>
        </Section>
      );
    case "experience": {
      const items = filled(cv.experience, "role", "company", "description");
      if (!items.length) return null;
      if (o.dated) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item cv-dated" key={e.id}>
                <div className="cv-dated-left">
                  <p className="cv-dated-date">{dateRange(e.startDate, e.endDate, e.current)}</p>
                  {!o.orgFirst && !o.stack && e.company && <p className="cv-dated-org">{e.company}</p>}
                  {e.location && <p className="cv-sub">{e.location}</p>}
                </div>
                <div className="cv-dated-right">
                  <h3 className="cv-item-title">
                    {o.orgFirst ? <OrgRole org={e.company} role={e.role} /> : o.stack ? e.company || e.role : e.role || e.company}
                  </h3>
                  {o.stack && e.company && e.role && <p className="cv-role">{e.role}</p>}
                  <Bullets text={e.description} />
                </div>
              </div>
            ))}
          </Section>
        );
      }
      if (o.stack) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item" key={e.id}>
                <div className="cv-item-head">
                  <div className="cv-stack">
                    <h3 className="cv-item-title">{e.role || e.company}</h3>
                    {e.role && e.company && <p className="cv-org-em">{e.company}</p>}
                  </div>
                  <span className="cv-meta">
                    {dateRange(e.startDate, e.endDate, e.current)}
                    {e.location && <span className="cv-meta-loc">{e.location}</span>}
                  </span>
                </div>
                <Bullets text={e.description} />
              </div>
            ))}
          </Section>
        );
      }
      if (o.orgFirst) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item" key={e.id}>
                <div className="cv-item-head">
                  <h3 className="cv-item-title">
                    <OrgRole org={e.company} role={e.role} />
                  </h3>
                  <span className="cv-meta">
                    {dateRange(e.startDate, e.endDate, e.current)}
                    {e.location && <span className="cv-meta-loc">{e.location}</span>}
                  </span>
                </div>
                <div className="cv-indent">
                  <Bullets text={e.description} />
                </div>
              </div>
            ))}
          </Section>
        );
      }
      return (
        <Section key={key} title={meta.title} icon={icon} className={cls}>
          {items.map((e) => (
            <div className="cv-item" key={e.id}>
              <div className="cv-item-head">
                <h3 className="cv-item-title">
                  {o.timeline ? e.company || e.role : e.role}
                  {!o.timeline && e.role && e.company && <span className="cv-sep"> · </span>}
                  {!o.timeline && e.company && <span className="cv-org">{e.company}</span>}
                </h3>
                <span className="cv-meta">{dateRange(e.startDate, e.endDate, e.current)}</span>
              </div>
              {o.timeline && e.company && e.role && <p className="cv-role">{e.role}</p>}
              {e.location && <p className="cv-sub">{e.location}</p>}
              <Bullets text={e.description} />
            </div>
          ))}
        </Section>
      );
    }
    case "education": {
      const items = filled(cv.education, "degree", "school", "description");
      if (!items.length) return null;
      if (o.dated) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item cv-dated" key={e.id}>
                <div className="cv-dated-left">
                  <p className="cv-dated-date">{dateRange(e.startDate, e.endDate)}</p>
                  {!o.orgFirst && !o.stack && e.school && <p className="cv-dated-org">{e.school}</p>}
                  {e.location && <p className="cv-sub">{e.location}</p>}
                </div>
                <div className="cv-dated-right">
                  <h3 className="cv-item-title">
                    {o.orgFirst ? <OrgRole org={e.degree} role={e.school} italic={false} /> : e.degree || e.school}
                  </h3>
                  {o.stack && e.degree && e.school && <p className="cv-role">{e.school}</p>}
                  <Bullets text={e.description} />
                </div>
              </div>
            ))}
          </Section>
        );
      }
      if (o.stack) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item" key={e.id}>
                <div className="cv-item-head">
                  <div className="cv-stack">
                    <h3 className="cv-item-title">{e.degree || e.school}</h3>
                    {e.degree && e.school && <p className="cv-org-em">{e.school}</p>}
                  </div>
                  <span className="cv-meta">
                    {dateRange(e.startDate, e.endDate)}
                    {e.location && <span className="cv-meta-loc">{e.location}</span>}
                  </span>
                </div>
                <Bullets text={e.description} />
              </div>
            ))}
          </Section>
        );
      }
      if (o.orgFirst) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item" key={e.id}>
                <div className="cv-item-head">
                  <h3 className="cv-item-title">
                    <OrgRole org={e.school} role={e.degree} />
                  </h3>
                  <span className="cv-meta">
                    {dateRange(e.startDate, e.endDate)}
                    {e.location && <span className="cv-meta-loc">{e.location}</span>}
                  </span>
                </div>
                <div className="cv-indent">
                  <Bullets text={e.description} />
                </div>
              </div>
            ))}
          </Section>
        );
      }
      if (o.timeline) {
        return (
          <Section key={key} title={meta.title} icon={icon} className={cls}>
            {items.map((e) => (
              <div className="cv-item" key={e.id}>
                <div className="cv-item-head">
                  <h3 className="cv-item-title">{e.school || e.degree}</h3>
                  <span className="cv-meta">{dateRange(e.startDate, e.endDate)}</span>
                </div>
                {e.school && e.degree && <p className="cv-role">{e.degree}</p>}
                {e.location && <p className="cv-sub">{e.location}</p>}
                <Bullets text={e.description} />
              </div>
            ))}
          </Section>
        );
      }
      return (
        <Section key={key} title={meta.title} icon={icon} className={cls}>
          {items.map((e) => (
            <div className="cv-item" key={e.id}>
              <div className="cv-item-head">
                <h3 className="cv-item-title">
                  {e.degree}
                  {!o.compact && e.degree && e.school && <span className="cv-sep"> · </span>}
                  {!o.compact && e.school && <span className="cv-org">{e.school}</span>}
                </h3>
                <span className="cv-meta">{dateRange(e.startDate, e.endDate)}</span>
              </div>
              {o.compact && e.school && <p className="cv-role">{e.school}</p>}
              {e.location && <p className="cv-sub">{e.location}</p>}
              <Bullets text={e.description} />
            </div>
          ))}
        </Section>
      );
    }
    case "projects": {
      const items = filled(cv.projects, "name", "description");
      if (!items.length) return null;
      return (
        <Section key={key} title={meta.title} icon={icon} className={cls}>
          {items.map((p) => (
            <div className="cv-item" key={p.id}>
              <div className="cv-item-head">
                <h3 className="cv-item-title">{p.name}</h3>
                {p.link && (
                  <span className="cv-meta">
                    <ExtLink href={safeHref(p.link)}>{displayUrl(p.link)}</ExtLink>
                  </span>
                )}
              </div>
              <Bullets text={p.description} />
            </div>
          ))}
        </Section>
      );
    }
    case "skills":
      return <SimpleList key={key} title={meta.title} icon={icon} items={cv.skills} variant={o.list ?? (o.cols ? "cols" : o.compact ? "list" : "tags")} bars={o.bars} className={cls} />;
    case "languages":
      return <SimpleList key={key} title={meta.title} icon={icon} items={cv.languages} variant={o.list ?? (o.cols ? "cols" : o.compact ? "list" : "rows")} bars={o.bars} className={cls} />;
    case "certifications":
      return <SimpleList key={key} title={meta.title} icon={icon} items={cv.certifications} variant={o.list === "inline" ? "inline" : o.compact ? "list" : "rows"} className={cls} />;
    case "references": {
      const items = filled(cv.references, "name");
      if (!items.length) return null;
      return (
        <Section key={key} title={meta.title} icon={icon} className={cls}>
          <div className="cv-refs">
            {items.map((r) => (
              <div className="cv-ref" key={r.id}>
                <p className="cv-ref-name">{r.name}</p>
                {(r.role || r.company) && <p className="cv-ref-role">{[r.role, r.company].filter(Boolean).join(", ")}</p>}
                {r.phone && (
                  <p className="cv-ref-line">
                    <span className="cv-ref-label">Phone:</span> {r.phone}
                  </p>
                )}
                {r.email && (
                  <p className="cv-ref-line">
                    <span className="cv-ref-label">Email:</span> <ExtLink href={safeHref(r.email, "email")}>{r.email}</ExtLink>
                  </p>
                )}
              </div>
            ))}
          </div>
        </Section>
      );
    }
  }
}

function SimpleList({
  title,
  icon,
  items,
  variant,
  bars,
  className,
}: {
  title: string;
  icon?: IconName;
  items: SimpleItem[];
  variant: "tags" | "rows" | "list" | "cols" | "inline" | "dots" | "grid2" | "cols3";
  bars?: boolean;
  className?: string;
}) {
  const list = filled(items, "name");
  if (!list.length) return null;
  const withBars = bars && list.some((s) => s.level > 0);
  if (variant === "inline") {
    return (
      <Section title={title} icon={icon} className={className}>
        <p className="cv-inline">
          {list.map((s, i) => (
            <span key={s.id}>
              {i > 0 && <span className="cv-inline-sep" aria-hidden="true"> • </span>}
              <span className="cv-row-name">{s.name}</span>
              {s.detail && <span className="cv-row-detail"> ({s.detail})</span>}
            </span>
          ))}
        </p>
      </Section>
    );
  }
  if (variant === "dots") {
    return (
      <Section title={title} icon={icon} className={className}>
        <ul className="cv-dots">
          {list.map((s) => (
            <li key={s.id}>
              <span className="cv-row-name">
                {s.name}
                {s.level === 0 && s.detail && <span className="cv-row-detail"> ({s.detail})</span>}
              </span>
              {s.level > 0 && (
                <span className="cv-dot-row" role="img" aria-label={`${s.level} out of 5`}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <span key={n} className={n <= s.level ? "on" : ""} />
                  ))}
                </span>
              )}
            </li>
          ))}
        </ul>
      </Section>
    );
  }
  if (variant === "grid2") {
    return (
      <Section title={title} icon={icon} className={className}>
        <div className="cv-grid2">
          {list.map((s) => (
            <div key={s.id} className="cv-grid2-item">
              <p className="cv-grid2-name">{s.name}</p>
              {s.detail && <p className="cv-grid2-detail">{s.detail}</p>}
            </div>
          ))}
        </div>
      </Section>
    );
  }
  return (
    <Section title={title} icon={icon} className={className}>
      <ul className={withBars ? "cv-bars" : variant === "tags" ? "cv-tags" : variant === "rows" ? "cv-rows" : variant === "cols" ? "cv-list cv-cols4" : variant === "cols3" ? "cv-list cv-cols3" : "cv-list"}>
        {list.map((s) => (
          <li key={s.id}>
            <span className="cv-row-name">{s.name}</span>
            {withBars && s.level > 0 ? (
              <span className="cv-bar" role="img" aria-label={`${s.level} out of 5`}>
                <span style={{ width: `${s.level * 20}%` }} />
              </span>
            ) : (
              s.detail && (
                <span className="cv-row-detail">{variant === "rows" ? s.detail : ` (${s.detail})`}</span>
              )
            )}
          </li>
        ))}
      </ul>
    </Section>
  );
}

// ------------------------------------------------------------------ layouts

const ALL_SINGLE: SectionKey[] = ["summary", "experience", "education", "projects", "skills", "languages", "certifications", "references"];

function SingleColumnLayout({ cv }: { cv: CV }) {
  return (
    <>
      <Header cv={cv} />
      {ALL_SINGLE.map((k) => renderSection(cv, k))}
    </>
  );
}

function OrgRole({ org, role, italic = true }: { org: string; role: string; italic?: boolean }) {
  if (!org || !role) return <>{org || role}</>;
  return (
    <>
      <span className="cv-org-strong">{org}</span>,{" "}
      {italic ? <em className="cv-role-em">{role}</em> : <span className="cv-role-em">{role}</span>}
    </>
  );
}

function DecoratedLayout({ cv, variant }: { cv: CV; variant: "evergreen" | "horizon" | "sage" | "banner" | "summit" }) {
  const hasPhoto = safePhoto(cv.personal.photo) !== "";
  const horizon = variant === "horizon";
  if (variant === "sage") return <SageLayout cv={cv} hasPhoto={hasPhoto} />;
  if (variant === "banner" || variant === "summit") return <BannerLayout cv={cv} hasPhoto={hasPhoto} summit={variant === "summit"} />;
  return (
    <>
      <div className="cv-sb-bg" aria-hidden="true">
        <div className="cv-sb-bg-side" />
        <div className="cv-sb-deco" />
      </div>
      <div className="cv-dec-body">
        <header className="cv-header cv-dec-header">
          <div className="cv-dec-head-text">
            <Name cv={cv} />
            {cv.personal.title && <p className="cv-title">{cv.personal.title}</p>}
            <ContactList cv={cv} icons />
          </div>
          {hasPhoto && <Photo cv={cv} />}
        </header>
        {horizon ? (
          <>
            {cv.summary.trim() && <p className="cv-desc cv-summary cv-dec-intro">{cv.summary.trim()}</p>}
            {renderSection(cv, "experience", { dated: true, orgFirst: true, icons: true, title: "Professional Experience" })}
            {renderSection(cv, "education", { dated: true, orgFirst: true, icons: true })}
            {renderSection(cv, "projects", { icons: true })}
            {renderSection(cv, "languages", { list: "dots", icons: true })}
            {renderSection(cv, "certifications", { icons: true })}
            {renderSection(cv, "skills", { list: "inline", icons: true })}
            {renderSection(cv, "references", { icons: true })}
          </>
        ) : (
          <>
            {renderSection(cv, "summary")}
            {renderSection(cv, "experience", { orgFirst: true, title: "Professional Experience" })}
            {renderSection(cv, "education", { orgFirst: true })}
            {renderSection(cv, "projects")}
            {renderSection(cv, "certifications", { list: "inline", title: "Certificates" })}
            {renderSection(cv, "languages", { list: "inline" })}
            {renderSection(cv, "skills", { list: "grid2" })}
            {renderSection(cv, "references")}
          </>
        )}
      </div>
    </>
  );
}

function DecoBg() {
  return (
    <div className="cv-sb-bg" aria-hidden="true">
      <div className="cv-sb-bg-side" />
      <div className="cv-sb-deco" />
    </div>
  );
}

function SageLayout({ cv, hasPhoto }: { cv: CV; hasPhoto: boolean }) {
  const half = (k: SectionKey) => renderSection(cv, k, { icons: true, list: "inline" });
  const langs = half("languages");
  const skills = half("skills");
  return (
    <>
      <DecoBg />
      <div className="cv-dec-body">
        <header className="cv-header cv-dec-header">
          {hasPhoto && <Photo cv={cv} />}
          <div className="cv-dec-head-text">
            <Name cv={cv} />
            {cv.personal.title && <p className="cv-title">{cv.personal.title}</p>}
            <ContactList cv={cv} icons />
          </div>
        </header>
        {renderSection(cv, "summary", { icons: true })}
        {renderSection(cv, "experience", { icons: true, stack: true, title: "Professional Experience" })}
        {renderSection(cv, "education", { icons: true, stack: true })}
        {renderSection(cv, "projects", { icons: true })}
        {(langs || skills) && (
          <div className={langs && skills ? "cv-pair" : undefined}>
            {langs}
            {skills}
          </div>
        )}
        {renderSection(cv, "certifications", { icons: true, list: "inline", title: "Certificates" })}
        {renderSection(cv, "references", { icons: true })}
      </div>
    </>
  );
}

function BannerLayout({ cv, hasPhoto, summit = false }: { cv: CV; hasPhoto: boolean; summit?: boolean }) {
  if (summit) {
    return (
      <div className="cv-dec-body">
        <header className="cv-header cv-banner-top">
          <div className="cv-dec-head-text">
            <Name cv={cv} />
            {cv.personal.title && <p className="cv-title">{cv.personal.title}</p>}
            <ContactList cv={cv} icons />
          </div>
          {hasPhoto && <Photo cv={cv} />}
        </header>
        {renderSection(cv, "summary", { icons: true, title: "Summary" })}
        {renderSection(cv, "experience", { icons: true, dated: true, stack: true, title: "Professional Experience" })}
        {renderSection(cv, "education", { icons: true, dated: true, stack: true })}
        {renderSection(cv, "projects", { icons: true })}
        {renderSection(cv, "skills", { icons: true, list: "cols3" })}
        {renderSection(cv, "languages", { icons: true, list: "dots" })}
        {renderSection(cv, "certifications", { icons: true, title: "Certificates" })}
        {renderSection(cv, "references", { icons: true })}
      </div>
    );
  }
  return (
    <div className="cv-dec-body">
      <header className="cv-header cv-banner-top">
        <div className="cv-dec-head-text">
          <h1 className="cv-name">
            {cv.personal.fullName.trim() || "Your Name"}
            {cv.personal.title && <span className="cv-title"> {cv.personal.title}</span>}
          </h1>
          <ContactList cv={cv} icons />
        </div>
        {hasPhoto && <Photo cv={cv} />}
      </header>
      {renderSection(cv, "summary", { title: "Summary" })}
      {renderSection(cv, "experience", { stack: true, title: "Professional Experience" })}
      {renderSection(cv, "education", { stack: true })}
      {renderSection(cv, "projects")}
      {renderSection(cv, "skills", { list: "cols3" })}
      {renderSection(cv, "languages", { list: "cols3" })}
      {renderSection(cv, "certifications")}
      {renderSection(cv, "references")}
    </div>
  );
}

function ProfessionalLayout({ cv }: { cv: CV }) {
  return (
    <>
      <header className="cv-header">
        <Name cv={cv} />
        {cv.personal.title && <p className="cv-title">{cv.personal.title}</p>}
        <ContactList cv={cv} icons />
      </header>
      {renderSection(cv, "summary")}
      {renderSection(cv, "experience", { dated: true })}
      {renderSection(cv, "education", { dated: true })}
      {renderSection(cv, "projects")}
      {renderSection(cv, "skills", { cols: true })}
      {renderSection(cv, "languages", { cols: true })}
      {renderSection(cv, "certifications")}
      {renderSection(cv, "references")}
    </>
  );
}

function ModernLayout({ cv }: { cv: CV }) {
  return (
    <>
      <Header cv={cv} />
      <div className="cv-columns">
        <div className="cv-main">{(["summary", "experience", "projects", "references"] as const).map((k) => renderSection(cv, k))}</div>
        <aside className="cv-side">
          {(["skills", "education", "languages", "certifications"] as const).map((k) => renderSection(cv, k, { compact: true }))}
        </aside>
      </div>
    </>
  );
}

interface SidebarCfg {
  side: "left" | "right";
  /** Where the name/title block goes. */
  header: "main" | "banner" | "pill" | "side";
  /** Extra per-section options. */
  sectionOpts?: Partial<Record<SectionKey, SecOpts>>;
  splitName?: boolean;
  sideSections: SectionKey[];
  mainSections: SectionKey[];
  sideIcons?: boolean;
  mainIcons?: boolean;
  /** Main-column sections drawn as a timeline. */
  timeline?: SectionKey[];
  bars?: boolean;
}

const SIDEBAR_LAYOUTS: Partial<Record<TemplateId, SidebarCfg>> = {
  executive: {
    side: "left",
    header: "main",
    splitName: true,
    sideSections: ["contact", "education", "skills", "languages", "certifications"],
    mainSections: ["summary", "experience", "projects", "references"],
    timeline: ["experience"],
  },
  corporate: {
    side: "left",
    header: "banner",
    sideSections: ["contact", "skills", "languages", "certifications", "references"],
    mainSections: ["summary", "experience", "education", "projects"],
    mainIcons: true,
    timeline: ["experience"],
  },
  bold: {
    side: "right",
    header: "main",
    sideSections: ["education", "skills", "languages", "certifications", "contact"],
    mainSections: ["summary", "experience", "projects", "references"],
  },
  slate: {
    side: "left",
    header: "main",
    splitName: true,
    sideSections: ["contact", "education", "skills", "languages", "certifications"],
    mainSections: ["summary", "experience", "projects", "references"],
    sideIcons: true,
    timeline: ["experience"],
  },
  studio: {
    side: "left",
    header: "pill",
    sideSections: ["contact", "languages", "certifications"],
    mainSections: ["summary", "education", "experience", "projects", "skills", "references"],
    bars: true,
  },
  vivid: {
    side: "left",
    header: "main",
    splitName: true,
    sideSections: ["summary", "contact", "skills", "languages", "certifications"],
    mainSections: ["education", "experience", "projects", "references"],
    sideIcons: true,
    mainIcons: true,
    timeline: ["education", "experience"],
  },
  coral: {
    side: "left",
    header: "side",
    sideSections: ["contact", "summary", "education", "languages"],
    mainSections: ["experience", "projects", "skills", "certifications", "references"],
    sideIcons: true,
    mainIcons: true,
    sectionOpts: { languages: { list: "dots" }, certifications: { title: "Awards" } },
  },
  onyx: {
    side: "left",
    header: "main",
    splitName: true,
    sideSections: ["contact", "skills", "languages", "references", "certifications"],
    mainSections: ["summary", "experience", "education", "projects"],
    mainIcons: true,
  },
  heritage: {
    side: "left",
    header: "main",
    splitName: true,
    sideSections: ["summary", "contact", "skills", "languages", "certifications"],
    mainSections: ["education", "experience", "projects", "references"],
    sideIcons: true,
    mainIcons: true,
    timeline: ["education", "experience"],
  },
  pillbox: {
    side: "left",
    header: "main",
    splitName: true,
    sideSections: ["contact", "skills", "references", "languages"],
    mainSections: ["summary", "experience", "education", "projects", "certifications"],
  },
};

function SidebarLayout({ cv, cfg }: { cv: CV; cfg: SidebarCfg }) {
  const title = cv.personal.title && <p className="cv-title">{cv.personal.title}</p>;
  const nameBlock = (
    <div className="cv-namebox">
      <Name cv={cv} split={cfg.splitName} />
      {title}
    </div>
  );
  const side = (
    <aside className="cv-sb-side">
      {cfg.header === "side" ? <header className="cv-header cv-side-header">{nameBlock}</header> : cfg.header !== "banner" && <Photo cv={cv} />}
      {cfg.sideSections.map((k) => renderSection(cv, k, { compact: true, icons: cfg.sideIcons, bars: cfg.bars, ...cfg.sectionOpts?.[k] }))}
    </aside>
  );
  const main = (
    <div className="cv-sb-main">
      {cfg.header === "main" && <header className="cv-header">{nameBlock}</header>}
      {cfg.header === "pill" && <header className="cv-header cv-pill">{nameBlock}</header>}
      {cfg.mainSections.map((k) =>
        renderSection(cv, k, { icons: cfg.mainIcons, timeline: cfg.timeline?.includes(k), bars: cfg.bars, ...cfg.sectionOpts?.[k] }),
      )}
    </div>
  );
  return (
    <>
      {/* Full-page background art. In print it is position:fixed so it repeats on every page. */}
      <div className="cv-sb-bg" aria-hidden="true">
        <div className="cv-sb-bg-side" />
        <div className="cv-sb-deco" />
      </div>
      {cfg.header === "banner" && (
        <header className="cv-banner">
          <Photo cv={cv} />
          {nameBlock}
        </header>
      )}
      <div className={`cv-sb-grid cv-side-${cfg.side}`}>
        {cfg.side === "left" ? (
          <>
            {side}
            {main}
          </>
        ) : (
          <>
            {main}
            {side}
          </>
        )}
      </div>
    </>
  );
}
