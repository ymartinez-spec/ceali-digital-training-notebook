"use client";

import Image from "next/image";
import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type { ResourceItem } from "@/lib/resources";
import {
  ArrowRightIcon,
  ChartIcon,
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
};

type RegistrationForm = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  organization: string;
  consent: boolean;
};

type AnalyticsData = {
  visitors: number;
  registrations: number;
  downloads: number;
  views: number;
  topDownloads: Array<{ resourceId: string; count: number; title: string }>;
};

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

function ResourceCard({
  resource,
  favorite,
  onToggleFavorite,
}: {
  resource: ResourceItem;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
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
            rel="noreferrer"
            target="_blank"
          >
            <EyeIcon size={17} />
            View
          </a>
          <a
            className="button button-dark"
            href={`/api/resources/${resource.id}?action=download`}
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
  onToggleFavorite,
}: {
  countLabel: string;
  favoriteIds: Set<string>;
  id: string;
  query: string;
  resources: ResourceItem[];
  title: string;
  onToggleFavorite: (id: string) => void;
}) {
  const visible = resources.filter((resource) => resourceMatches(resource, query));

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
  const favoriteIds = useMemo(
    () => parseFavorites(favoriteSnapshot),
    [favoriteSnapshot],
  );
  const [adminKey, setAdminKey] = useState("");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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
      const response = await fetch("/api/register", {
        body: JSON.stringify({ ...form, sessionId: getSessionId() }),
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
        message: "Registration saved. Your notebook is ready.",
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

  async function loadAnalytics() {
    setAdminStatus("Loading analytics...");
    try {
      const response = await fetch(`/api/admin/analytics?key=${encodeURIComponent(adminKey)}`);
      if (!response.ok) {
        throw new Error("Admin key was not accepted.");
      }
      setAnalytics((await response.json()) as AnalyticsData);
      setAdminStatus("Analytics loaded.");
    } catch (error) {
      setAdminStatus(error instanceof Error ? error.message : "Analytics failed.");
    }
  }

  const favoriteResources = allResources.filter((resource) =>
    favoriteIds.has(resource.id),
  );

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
                  countLabel={`${handoutResources.length} files`}
                  favoriteIds={favoriteIds}
                  id="presentation-materials"
                  onToggleFavorite={toggleFavorite}
                  query={query}
                  resources={handoutResources}
                  title="Presentation Materials"
                />
                <ResourceSection
                  countLabel={`${appendixResources.length} files`}
                  favoriteIds={favoriteIds}
                  id="appendix-resources"
                  onToggleFavorite={toggleFavorite}
                  query={query}
                  resources={appendixResources}
                  title="Appendix Resources"
                />
                <ResourceSection
                  countLabel={`${favoriteResources.length} saved`}
                  favoriteIds={favoriteIds}
                  id="favorite-resources"
                  onToggleFavorite={toggleFavorite}
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
              Export registrations and review visitor, registration, view, and
              download activity.
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
              <button className="button button-light" onClick={loadAnalytics} type="button">
                <ChartIcon size={17} />
                Analytics
              </button>
              <a
                className="button button-dark"
                href={`/api/admin/contacts.csv?key=${encodeURIComponent(adminKey)}`}
              >
                <DownloadIcon size={17} />
                Export CSV
              </a>
            </div>
            {adminStatus ? <p className="form-message success">{adminStatus}</p> : null}
            {analytics ? (
              <>
                <div className="analytics-grid">
                  <div className="analytics-tile">
                    <strong>{analytics.visitors}</strong>
                    <span>Visitors</span>
                  </div>
                  <div className="analytics-tile">
                    <strong>{analytics.registrations}</strong>
                    <span>Registrations</span>
                  </div>
                  <div className="analytics-tile">
                    <strong>{analytics.views}</strong>
                    <span>Views</span>
                  </div>
                  <div className="analytics-tile">
                    <strong>{analytics.downloads}</strong>
                    <span>Downloads</span>
                  </div>
                </div>
                <div className="download-list">
                  {analytics.topDownloads.map((item) => (
                    <div className="download-row" key={item.resourceId}>
                      <span>{item.title}</span>
                      <strong>{item.count}</strong>
                    </div>
                  ))}
                </div>
              </>
            ) : null}
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
