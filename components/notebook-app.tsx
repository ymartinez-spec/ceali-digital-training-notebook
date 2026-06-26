"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { NotebookSettings, ResourceItem } from "@/lib/resources";
import {
  ArrowRightIcon,
  DownloadIcon,
  EyeIcon,
  HeartIcon,
  LinkIcon,
  PhoneIcon,
  SearchIcon,
} from "@/components/icons";

type NotebookAppProps = {
  appendixResources: ResourceItem[];
  handoutResources: ResourceItem[];
  notebookSettings: NotebookSettings;
};

type RegistrationForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  consent: boolean;
};

type CategoryFilter = "all" | "template" | "handout" | "appendix";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

const blankForm: RegistrationForm = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  organization: "",
  consent: false,
};

function emitNotebookStorageChange() {
  window.dispatchEvent(new Event("ceali-notebook-storage"));
}

function subscribeNotebookStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener("ceali-notebook-storage", callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener("ceali-notebook-storage", callback);
  };
}

function subscribeHydration(callback: () => void) {
  const timeout = window.setTimeout(callback, 0);
  return () => window.clearTimeout(timeout);
}

function getStoredAccess() {
  return (
    typeof window !== "undefined" &&
    window.localStorage.getItem("cealiNotebookAccess") === "true"
  );
}

function getStoredFavoriteSnapshot() {
  if (typeof window === "undefined") {
    return "[]";
  }
  return window.localStorage.getItem("cealiFavoriteResources") ?? "[]";
}

function parseFavorites(snapshot: string) {
  try {
    return new Set(JSON.parse(snapshot) as string[]);
  } catch {
    return new Set<string>();
  }
}

function getSessionId() {
  const key = "cealiNotebookSession";
  const existing = window.localStorage.getItem(key);
  if (existing) {
    return existing;
  }
  const created =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

function resourceMatches(resource: ResourceItem, query: string) {
  if (!query.trim()) {
    return true;
  }
  const haystack = [
    resource.title,
    resource.description,
    resource.kind,
    ...resource.keywords,
  ]
    .join(" ")
    .toLowerCase();
  return haystack.includes(query.trim().toLowerCase());
}

function trackEvent(eventName: string, params: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }
  window.gtag?.("event", eventName, params);
}

function ResourceCard({
  resource,
  favorite,
  onToggleFavorite,
  onTrackAction,
}: {
  resource: ResourceItem;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onTrackAction: (resource: ResourceItem, action: "view" | "download") => void;
}) {
  return (
    <article className="resource-card">
      <div className="preview-frame">
        <Image
          alt=""
          fill
          sizes="(max-width: 680px) 100vw, (max-width: 920px) 50vw, 33vw"
          src={resource.preview}
          unoptimized
        />
      </div>
      <div className="resource-body">
        <div className="resource-topline">
          <span className={`pill ${resource.kind}`}>{resource.kind}</span>
          <button
            aria-label={
              favorite
                ? `Remove ${resource.title} from favorites`
                : `Add ${resource.title} to favorites`
            }
            aria-pressed={favorite}
            className="icon-button"
            onClick={() => onToggleFavorite(resource.id)}
            title={favorite ? "Remove favorite" : "Add favorite"}
            type="button"
          >
            <HeartIcon size={16} />
          </button>
        </div>
        <h4>{resource.title}</h4>
        <p>{resource.description}</p>
        <span className="resource-meta">{resource.pages}</span>
        <div className="card-actions">
          <a
            className="button button-light"
            href={`/api/resources/${resource.id}?action=view`}
            onClick={() => onTrackAction(resource, "view")}
            rel="noreferrer"
            target="_blank"
          >
            <EyeIcon size={17} />
            View
          </a>
          <a
            className="button button-dark"
            href={`/api/resources/${resource.id}?action=download`}
            onClick={() => onTrackAction(resource, "download")}
          >
            <DownloadIcon size={17} />
            Download
          </a>
        </div>
      </div>
    </article>
  );
}

function ResourceSection({
  countLabel,
  favoriteIds,
  id,
  query,
  resources,
  title,
  categoryFilter,
  onToggleFavorite,
  onTrackAction,
}: {
  categoryFilter: CategoryFilter;
  countLabel: string;
  favoriteIds: Set<string>;
  id: string;
  query: string;
  resources: ResourceItem[];
  title: string;
  onToggleFavorite: (id: string) => void;
  onTrackAction: (resource: ResourceItem, action: "view" | "download") => void;
}) {
  const visible = resources.filter(
    (resource) =>
      resourceMatches(resource, query) &&
      (categoryFilter === "all" || resource.kind === categoryFilter),
  );

  return (
    <section className="resource-section" id={id}>
      <div className="section-heading-row">
        <h3>{title}</h3>
        <span>{countLabel}</span>
      </div>
      <div className="resource-grid">
        {visible.map((resource) => (
          <ResourceCard
            favorite={favoriteIds.has(resource.id)}
            key={resource.id}
            onToggleFavorite={onToggleFavorite}
            onTrackAction={onTrackAction}
            resource={resource}
          />
        ))}
      </div>
      <p className={`empty-state ${visible.length === 0 ? "visible" : ""}`}>
        No matching resources found.
      </p>
    </section>
  );
}

export default function NotebookApp({
  appendixResources,
  handoutResources,
  notebookSettings,
}: NotebookAppProps) {
  const allResources = useMemo(
    () => [...handoutResources, ...appendixResources],
    [appendixResources, handoutResources],
  );
  const registered = useSyncExternalStore(
    subscribeNotebookStorage,
    getStoredAccess,
    () => false,
  );
  const hydrated = useSyncExternalStore(
    subscribeHydration,
    () => true,
    () => false,
  );
  const hasNotebookAccess = hydrated && registered;
  const favoriteSnapshot = useSyncExternalStore(
    subscribeNotebookStorage,
    getStoredFavoriteSnapshot,
    () => "[]",
  );
  const [form, setForm] = useState(blankForm);
  const [formStatus, setFormStatus] = useState<
    { type: "success" | "error"; message: string } | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [query, setQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const favoriteIds = useMemo(
    () => parseFavorites(favoriteSnapshot),
    [favoriteSnapshot],
  );
  const [adminKey, setAdminKey] = useState("");
  const [adminStatus, setAdminStatus] = useState("");

  useEffect(() => {
    const sessionId = getSessionId();
    void fetch("/api/analytics", {
      body: JSON.stringify({ event: "visit", sessionId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }, []);

  function updateForm(field: keyof RegistrationForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function toggleFavorite(id: string) {
    const next = new Set(favoriteIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    window.localStorage.setItem(
      "cealiFavoriteResources",
      JSON.stringify(Array.from(next)),
    );
    emitNotebookStorageChange();
  }

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setFormStatus(null);

    try {
      if (!appsScriptWebAppUrl) {
        throw new Error(
          "Registration is not configured. Add the Apps Script Web App URL in Vercel.",
        );
      }

      const sessionId = getSessionId();
      await fetch(appsScriptWebAppUrl, {
        body: JSON.stringify({
          ...form,
          consentText:
            "I would like to receive information about future trainings, resources, events, coaching opportunities, and professional development offerings from CEALI.",
          pageUrl: window.location.href,
          sessionId,
          submittedAt: new Date().toISOString(),
          userAgent: window.navigator.userAgent,
        }),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        method: "POST",
        mode: "no-cors",
      });

      const response = await fetch("/api/register", {
        body: JSON.stringify({ ...form, sessionId }),
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(result.error ?? "Registration could not be saved.");
      }
      window.localStorage.setItem("cealiNotebookAccess", "true");
      emitNotebookStorageChange();
      setForm(blankForm);
      setFormStatus({
        type: "success",
        message:
          "Registration saved. You are signed up for CEALI updates and your notebook is ready.",
      });
      trackEvent("registration_complete", {
        organization: form.organization || "not provided",
      });
      setTimeout(() => {
        document.getElementById("notebook")?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (error) {
      setFormStatus({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Registration could not be saved.",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function trackResourceAction(
    resource: ResourceItem,
    action: "view" | "download",
  ) {
    trackEvent(action === "download" ? "resource_download" : "resource_view", {
      resource_id: resource.id,
      resource_title: resource.title,
      resource_type: resource.kind,
    });
  }

  const favoriteResources = allResources.filter((resource) =>
    favoriteIds.has(resource.id),
  );
  const appsScriptWebAppUrl =
    process.env.NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL || "";
  const googleSheetUrl = process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || "";
  const googleDriveFolderUrl =
    process.env.NEXT_PUBLIC_GOOGLE_DRIVE_FOLDER_URL ||
    notebookSettings.googleDriveFolderUrl ||
    "https://drive.google.com/";
  const upcomingTrainingsUrl =
    process.env.NEXT_PUBLIC_UPCOMING_TRAININGS_URL ||
    notebookSettings.upcomingTrainingsUrl ||
    "https://www.ceali.org";
  const googleAnalyticsUrl =
    process.env.NEXT_PUBLIC_GOOGLE_ANALYTICS_URL ||
    "https://analytics.google.com/";

  return (
    <div className="app-shell">
      <a className="skip-link" href="#registration">
        Skip to registration
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#">
            <span className="brand-mark">C</span>
            <span className="brand-text">
              <strong>CEALI</strong>
              <span>Digital Resource Notebook</span>
            </span>
          </a>
          <nav aria-label="Primary" className="nav-links">
            <a href="#registration">Register</a>
            <a href="#notebook">Notebook</a>
            <a href="#resources">Resources</a>
            <a href="#admin">Admin</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero-inner">
            <div className="hero-main">
              <div>
                <p className="eyebrow">Conference Participant Access</p>
                <h1>Having Tough Conversations</h1>
              </div>
              <p className="hero-copy">
                Resource notebook for families of children who require additional
                support, created for early childhood educators and child care
                providers.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#registration">
                  Access Training Materials
                  <ArrowRightIcon size={18} />
                </a>
                <a className="button button-light" href="https://www.ceali.org">
                  CEALI Website
                </a>
              </div>
            </div>
            <aside className="hero-qr-card" aria-label="Conference QR code">
              <Image
                alt="QR code linking to the CEALI digital training notebook"
                height={164}
                src="/qr/ceali-notebook-qr.svg"
                unoptimized
                width={164}
              />
              <strong>Scan for materials</strong>
              <span>Place this QR code on slides or signage for quick access.</span>
            </aside>
          </div>
        </section>

        <section className="section-band alt">
          <div className="section-inner intro-grid">
            <div>
              <p className="section-kicker">Welcome</p>
              <h2 className="section-title">A practical packet for careful, respectful family conversations.</h2>
              <p className="body-copy">
                This notebook gathers the observation templates, planning tools,
                referral resources, and professional word banks from the CEALI
                training session into one searchable digital portal.
              </p>
              <div className="stats-strip" aria-label="Notebook contents">
                <div className="stat">
                  <strong>{handoutResources.length}</strong>
                  <span>handout and template files</span>
                </div>
                <div className="stat">
                  <strong>{appendixResources.length}</strong>
                  <span>appendix word-bank files</span>
                </div>
                <div className="stat">
                  <strong>400+</strong>
                  <span>conference-ready attendees</span>
                </div>
              </div>
            </div>
            <aside className="bio-panel" aria-label="Presenter bio">
              <p className="section-kicker">Presenter</p>
              <h2>CEALI Training Team</h2>
              <p className="body-copy">
                CEALI provides professional development, resources, and support
                for early childhood educators, child care programs, and leaders
                committed to inclusive, family-centered practice.
              </p>
            </aside>
          </div>
        </section>

        <section className="section-band" id="registration">
          <div className="section-inner intro-grid">
            <div>
              <p className="section-kicker">Step 1</p>
              <h2 className="section-title">Register once to unlock the notebook.</h2>
              <p className="body-copy">
                Your information helps CEALI share future training
                opportunities, coaching, consulting services, courses, events,
                and professional resources.
              </p>
            </div>
            <form className="form-panel" onSubmit={submitRegistration}>
              <div className="form-grid">
                <div className="field">
                  <label htmlFor="firstName">First Name</label>
                  <input
                    autoComplete="given-name"
                    id="firstName"
                    name="firstName"
                    onChange={(event) => updateForm("firstName", event.target.value)}
                    required
                    value={form.firstName}
                  />
                </div>
                <div className="field">
                  <label htmlFor="lastName">Last Name</label>
                  <input
                    autoComplete="family-name"
                    id="lastName"
                    name="lastName"
                    onChange={(event) => updateForm("lastName", event.target.value)}
                    required
                    value={form.lastName}
                  />
                </div>
                <div className="field">
                  <label htmlFor="email">Email Address</label>
                  <input
                    autoComplete="email"
                    id="email"
                    name="email"
                    onChange={(event) => updateForm("email", event.target.value)}
                    required
                    type="email"
                    value={form.email}
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">Mobile Phone Number</label>
                  <input
                    autoComplete="tel"
                    id="phone"
                    name="phone"
                    onChange={(event) => updateForm("phone", event.target.value)}
                    required
                    type="tel"
                    value={form.phone}
                  />
                </div>
                <div className="field full">
                  <label htmlFor="organization">Program/Organization Name</label>
                  <input
                    autoComplete="organization"
                    id="organization"
                    name="organization"
                    onChange={(event) =>
                      updateForm("organization", event.target.value)
                    }
                    value={form.organization}
                  />
                </div>
                <label className="checkbox-label field full">
                  <input
                    checked={form.consent}
                    onChange={(event) => updateForm("consent", event.target.checked)}
                    required
                    type="checkbox"
                  />
                  <span>
                    I would like to receive future training opportunities,
                    resources, events, and professional development information.
                  </span>
                </label>
              </div>
              <button
                className="button button-dark"
                disabled={submitting}
                type="submit"
              >
                Access Training Materials
                <ArrowRightIcon size={18} />
              </button>
              {formStatus ? (
                <p className={`form-message ${formStatus.type}`} role="status">
                  {formStatus.message}
                </p>
              ) : null}
              <p className="privacy-note">
                Your information is collected to provide access to today&apos;s
                training materials and to share future CEALI training
                opportunities, resources, and professional development
                offerings. You may unsubscribe at any time.
              </p>
            </form>
          </div>
        </section>

        <section className="section-band alt" id="notebook">
          <div className="section-inner">
            <div className="notebook-header">
              <div>
                <p className="section-kicker">Step 2</p>
                <h2 className="section-title">Digital Resource Notebook</h2>
                <p className="body-copy">
                  {hasNotebookAccess
                    ? "Search, favorite, view, or download the training resources."
                    : "Complete registration to unlock resource view and download links."}
                </p>
              </div>
              <div className="toolbar">
                <label className="search-wrap">
                  <SearchIcon size={18} />
                  <span className="sr-only">Search resources</span>
                  <input
                    className="search-input"
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder="Search resources"
                    type="search"
                    value={query}
                  />
                </label>
                <div className="segmented-filter" aria-label="Filter resources">
                  {[
                    ["all", "All"],
                    ["template", "Templates"],
                    ["handout", "Handouts"],
                    ["appendix", "Appendix"],
                  ].map(([value, label]) => (
                    <button
                      aria-pressed={categoryFilter === value}
                      key={value}
                      onClick={() => setCategoryFilter(value as CategoryFilter)}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <a
                  className="button button-dark"
                  href={`/api/resources/${notebookSettings.fullHandoutPacket.id}?action=download`}
                  onClick={() =>
                    trackEvent("download_all_handouts", {
                      resource_id: notebookSettings.fullHandoutPacket.id,
                      resource_title: notebookSettings.fullHandoutPacket.title,
                    })
                  }
                >
                  <DownloadIcon size={17} />
                  Download All
                </a>
              </div>
            </div>

            <nav aria-label="Notebook table of contents" className="toc">
              <a href="#presentation-materials">Presentation Materials</a>
              <a href="#appendix-resources">Appendix Resources</a>
              <a href="#favorite-resources">Favorites</a>
              <a href="#additional-resources">Additional Resources</a>
            </nav>

            {hasNotebookAccess ? (
              <>
                <ResourceSection
                  categoryFilter={categoryFilter}
                  countLabel={`${handoutResources.length} files`}
                  favoriteIds={favoriteIds}
                  id="presentation-materials"
                  onToggleFavorite={toggleFavorite}
                  onTrackAction={trackResourceAction}
                  query={query}
                  resources={handoutResources}
                  title="Presentation Materials"
                />
                <ResourceSection
                  categoryFilter={categoryFilter}
                  countLabel={`${appendixResources.length} files`}
                  favoriteIds={favoriteIds}
                  id="appendix-resources"
                  onToggleFavorite={toggleFavorite}
                  onTrackAction={trackResourceAction}
                  query={query}
                  resources={appendixResources}
                  title="Appendix Resources"
                />
                <ResourceSection
                  categoryFilter={categoryFilter}
                  countLabel={`${favoriteResources.length} saved`}
                  favoriteIds={favoriteIds}
                  id="favorite-resources"
                  onToggleFavorite={toggleFavorite}
                  onTrackAction={trackResourceAction}
                  query={query}
                  resources={favoriteResources}
                  title="Favorite Resources"
                />
              </>
            ) : (
              <p className="empty-state visible">
                Registration is required before the notebook opens.
              </p>
            )}
          </div>
        </section>

        <section className="section-band" id="additional-resources">
          <div className="section-inner">
            <p className="section-kicker">Step 3</p>
            <h2 className="section-title">Additional Resources</h2>
            <div className="resource-links" id="resources">
              <a className="resource-link" href="https://www.ceali.org">
                <strong>
                  <LinkIcon size={18} />
                  CEALI Website
                </strong>
                <span>www.ceali.org</span>
              </a>
              <a className="resource-link" href={upcomingTrainingsUrl}>
                <strong>
                  <LinkIcon size={18} />
                  Upcoming Trainings
                </strong>
                <span>Future CEALI events, courses, coaching, and professional development.</span>
              </a>
              <a className="resource-link" href={googleDriveFolderUrl}>
                <strong>
                  <LinkIcon size={18} />
                  Google Drive Folder
                </strong>
                <span>Central storage folder for notebook PDFs and future updates.</span>
              </a>
              <a
                className="resource-link"
                href="https://www.instagram.com/ceali.ny/"
              >
                <strong>
                  <LinkIcon size={18} />
                  Instagram
                </strong>
                <span>@ceali.ny</span>
              </a>
              <a className="resource-link" href="tel:6315160010">
                <strong>
                  <PhoneIcon size={18} />
                  Contact
                </strong>
                <span>631-516-0010</span>
              </a>
            </div>
            <div className="resource-section">
              <div className="section-heading-row">
                <h3>Conference QR Code</h3>
                <span>Print or project for participants</span>
              </div>
              <div className="qr-wrap">
                <Image
                  alt="QR code linking to the CEALI digital resource notebook"
                  height={128}
                  src="/qr/ceali-notebook-qr.svg"
                  unoptimized
                  width={128}
                />
                <a
                  className="button button-light"
                  href="/qr/ceali-notebook-qr.svg"
                  download
                >
                  <DownloadIcon size={17} />
                  Download QR
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="section-band alt" id="admin">
          <div className="section-inner admin-panel">
            <p className="section-kicker">Admin</p>
            <h2 className="section-title">Lead Management</h2>
            <p className="body-copy">
              Open the registration Sheet, export contacts through Apps Script,
              and review visitor, registration, view, and download activity in
              Google Analytics.
            </p>
            <div className="admin-grid">
              <label>
                <span className="sr-only">Admin key</span>
                <input
                  className="admin-input"
                  onChange={(event) => setAdminKey(event.target.value)}
                  placeholder="Admin export key"
                  type="password"
                  value={adminKey}
                />
              </label>
              <a className="button button-light" href={googleAnalyticsUrl}>
                <LinkIcon size={17} />
                Open Analytics
              </a>
              {googleSheetUrl ? (
                <a className="button button-light" href={googleSheetUrl}>
                  <LinkIcon size={17} />
                  Open Sheet
                </a>
              ) : null}
              <a
                className="button button-dark"
                onClick={(event) => {
                  if (!adminKey) {
                    event.preventDefault();
                    setAdminStatus("Enter the admin export key before downloading CSV.");
                  }
                }}
                href={`/api/admin/contacts.csv?key=${encodeURIComponent(adminKey)}`}
              >
                <DownloadIcon size={17} />
                Export CSV
              </a>
            </div>
            {adminStatus ? <p className="form-message success">{adminStatus}</p> : null}
            <div className="analytics-grid">
              <div className="analytics-tile">
                <strong>Apps Script</strong>
                <span>Registration posts and CSV exports</span>
              </div>
              <div className="analytics-tile">
                <strong>Drive</strong>
                <span>PDF storage and replacements</span>
              </div>
              <div className="analytics-tile">
                <strong>GA4</strong>
                <span>Visitors, views, downloads</span>
              </div>
              <div className="analytics-tile">
                <strong>Vercel</strong>
                <span>Fast mobile delivery for 400+ attendees</span>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="footer">
        CEALI training materials are provided for registered conference
        participants.
      </footer>
    </div>
  );
}
