"use client";

import Image from "next/image";
import type { FormEvent, KeyboardEvent } from "react";
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

type NotebookTab = "presentation" | "template" | "appendix" | "favorites";

const notebookTabs: { id: NotebookTab; label: string }[] = [
  {
    id: "presentation",
    label: "Presentation Materials",
  },
  { id: "template", label: "Templates" },
  { id: "appendix", label: "Appendix" },
  { id: "favorites", label: "Favorites" },
];

const notebookTabLabels = notebookTabs.reduce(
  (labels, tab) => ({ ...labels, [tab.id]: tab.label }),
  {} as Record<NotebookTab, string>,
);

type NotebookPage =
  | { id: string; kind: "cover" | "welcome" | "toc" | "additional" | "closing" }
  | {
      emptyMessage: string;
      id: string;
      kind: "resources";
      resources: ResourceItem[];
      title: string;
    };

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

function chunkResources(resources: ResourceItem[], size: number) {
  const chunks: ResourceItem[][] = [];
  for (let index = 0; index < resources.length; index += size) {
    chunks.push(resources.slice(index, index + size));
  }
  return chunks;
}

function getNotebookPageLabel(page: NotebookPage, index: number) {
  if (page.kind === "resources") {
    return page.title;
  }

  const labels: Record<NotebookPage["kind"], string> = {
    additional: "Resources",
    closing: "Contact",
    cover: "Cover",
    resources: "Resources",
    toc: "Contents",
    welcome: "Welcome",
  };

  return labels[page.kind] ?? `Page ${index + 1}`;
}

function NotebookResourceItem({
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
    <article className="notebook-resource">
      <div className="notebook-resource-preview">
        <Image
          alt=""
          fill
          sizes="(max-width: 760px) 5rem, 6rem"
          src={resource.preview}
          unoptimized
        />
      </div>
      <div className="notebook-resource-copy">
        <div className="notebook-resource-line">
          <span className={`pill ${resource.kind}`}>{resource.kind}</span>
          <span className="resource-meta">{resource.pages}</span>
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
        <div className="notebook-resource-actions">
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

function NotebookPageContent({
  appendixCount,
  currentTab,
  favoriteIds,
  favoriteCount,
  handoutCount,
  notebookSettings,
  page,
  templateCount,
  onJumpToTab,
  onToggleFavorite,
  onTrackAction,
}: {
  appendixCount: number;
  currentTab: NotebookTab;
  favoriteIds: Set<string>;
  favoriteCount: number;
  handoutCount: number;
  notebookSettings: NotebookSettings;
  page: NotebookPage;
  templateCount: number;
  onJumpToTab: (tab: NotebookTab) => void;
  onToggleFavorite: (id: string) => void;
  onTrackAction: (resource: ResourceItem, action: "view" | "download") => void;
}) {
  if (page.kind === "cover") {
    return (
      <div className="page-cover">
        <p className="page-kicker">CEALI Conference Notebook</p>
        <h3>Digital Resource Notebook</h3>
        <p>
          Having Tough Conversations: observation tools, planning guides, word
          banks, and referral resources for early childhood professionals.
        </p>
        <div className="cover-stamp">
          <strong>CEALI</strong>
          <span>Professional Development Resources</span>
        </div>
      </div>
    );
  }

  if (page.kind === "welcome") {
    return (
      <div className="page-prose">
        <p className="page-kicker">Welcome</p>
        <h3>Training Materials At Your Fingertips</h3>
        <p>
          This notebook gathers the practical tools from today&apos;s session
          into one calm, searchable place. Use the tabs, index, search, and
          favorites to return quickly to the pages that support your work.
        </p>
        <div className="paper-note">
          <strong>Inside this notebook</strong>
          <span>{handoutCount} presentation files</span>
          <span>{appendixCount} appendix resources</span>
          <span>{favoriteCount} saved favorites</span>
        </div>
      </div>
    );
  }

  if (page.kind === "toc") {
    return (
      <div className="page-prose">
        <p className="page-kicker">Index</p>
        <h3>Table Of Contents</h3>
        <div className="toc-list">
          {[
            ["presentation", "Presentation Materials", `${handoutCount} files`],
            ["template", "Templates", `${templateCount} forms`],
            ["appendix", "Appendix", `${appendixCount} word banks`],
            ["favorites", "Favorites", `${favoriteCount} saved`],
          ].map(([tab, label, count]) => (
            <button
              aria-current={currentTab === tab ? "page" : undefined}
              key={tab}
              onClick={() => onJumpToTab(tab as NotebookTab)}
              type="button"
            >
              <span>{label}</span>
              <strong>{count}</strong>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (page.kind === "additional") {
    return (
      <div className="page-prose">
        <p className="page-kicker">Resources</p>
        <h3>Additional CEALI Links</h3>
        <div className="notebook-link-list">
          <a href="https://www.ceali.org">CEALI Website</a>
          <a href="https://www.instagram.com/ceali.ny/">Instagram @ceali.ny</a>
          <a href="tel:6315160010">Contact CEALI: 631-516-0010</a>
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
    );
  }

  if (page.kind === "closing") {
    return (
      <div className="page-prose closing-page">
        <p className="page-kicker">Thank You</p>
        <h3>Continue The Conversation</h3>
        <p>
          CEALI supports early childhood programs with training, coaching,
          consultation, and professional resources rooted in respectful,
          family-centered practice.
        </p>
        <div className="cover-stamp">
          <strong>www.ceali.org</strong>
          <span>@ceali.ny</span>
        </div>
      </div>
    );
  }

  if (page.kind !== "resources") {
    return null;
  }

  return (
    <div className="page-resource-list">
      <div className="page-heading">
        <p className="page-kicker">Notebook Section</p>
        <h3>{page.title}</h3>
      </div>
      {page.resources.length ? (
        page.resources.map((resource) => (
          <NotebookResourceItem
            favorite={favoriteIds.has(resource.id)}
            key={resource.id}
            onToggleFavorite={onToggleFavorite}
            onTrackAction={onTrackAction}
            resource={resource}
          />
        ))
      ) : (
        <p className="notebook-empty">{page.emptyMessage}</p>
      )}
    </div>
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
  const [notebookTab, setNotebookTab] = useState<NotebookTab>("presentation");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [showIndex, setShowIndex] = useState(false);
  const [focusMode, setFocusMode] = useState(false);
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

  const favoriteResources = useMemo(
    () => allResources.filter((resource) => favoriteIds.has(resource.id)),
    [allResources, favoriteIds],
  );
  const templateResources = useMemo(
    () => handoutResources.filter((resource) => resource.kind === "template"),
    [handoutResources],
  );
  const selectedTabResources = useMemo(() => {
    if (notebookTab === "appendix") {
      return appendixResources;
    }
    if (notebookTab === "favorites") {
      return favoriteResources;
    }
    if (notebookTab === "template") {
      return templateResources;
    }
    return handoutResources;
  }, [
    appendixResources,
    favoriteResources,
    handoutResources,
    notebookTab,
    templateResources,
  ]);
  const visibleNotebookResources = useMemo(
    () =>
      selectedTabResources.filter((resource) => resourceMatches(resource, query)),
    [query, selectedTabResources],
  );
  const notebookPages = useMemo<NotebookPage[]>(() => {
    const chunks = chunkResources(visibleNotebookResources, 4);
    const resourcePages: NotebookPage[] = chunks.length
      ? chunks.map((resources, index) => ({
          emptyMessage: "",
          id: `${notebookTab}-resources-${index}`,
          kind: "resources",
          resources,
          title:
            chunks.length > 1
              ? `${notebookTabLabels[notebookTab]} ${index + 1}/${chunks.length}`
              : notebookTabLabels[notebookTab],
        }))
      : [
          {
            emptyMessage: query.trim()
              ? "No matching resources found on this tab."
              : notebookTab === "favorites"
                ? "Favorite resources will appear here after you tap the heart on a page."
                : "No resources are available in this notebook section yet.",
            id: `${notebookTab}-empty`,
            kind: "resources",
            resources: [],
            title: notebookTabLabels[notebookTab],
          },
        ];

    return [
      { id: "cover", kind: "cover" },
      { id: "welcome", kind: "welcome" },
      { id: "toc", kind: "toc" },
      ...resourcePages,
      { id: "additional", kind: "additional" },
      { id: "closing", kind: "closing" },
    ];
  }, [notebookTab, query, visibleNotebookResources]);
  const maxNotebookPageIndex = Math.max(notebookPages.length - 1, 0);
  const visiblePageIndex = Math.min(currentPageIndex, maxNotebookPageIndex);
  const fallbackNotebookPage: NotebookPage = { id: "cover", kind: "cover" };
  const currentNotebookPage =
    notebookPages[visiblePageIndex] ?? fallbackNotebookPage;
  const facingNotebookPage = notebookPages[visiblePageIndex + 1] ?? null;
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

  function goToNotebookPage(index: number) {
    setCurrentPageIndex(Math.max(0, Math.min(index, maxNotebookPageIndex)));
  }

  function goToNextNotebookPage() {
    setCurrentPageIndex(Math.min(visiblePageIndex + 1, maxNotebookPageIndex));
  }

  function goToPreviousNotebookPage() {
    setCurrentPageIndex(Math.max(visiblePageIndex - 1, 0));
  }

  function jumpToNotebookTab(tab: NotebookTab) {
    setNotebookTab(tab);
    setCurrentPageIndex(3);
    setShowIndex(false);
  }

  function handleNotebookKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowRight") {
      event.preventDefault();
      goToNextNotebookPage();
    }
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToPreviousNotebookPage();
    }
  }

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

        <section className="notebook-workspace-section" id="notebook">
          <div
            className={`notebook-workspace ${focusMode ? "focus-mode" : ""}`}
          >
            <div className="notebook-nav">
              <div>
                <p className="section-kicker">Step 2</p>
                <h2>CEALI Digital Resource Notebook</h2>
                <p>
                  {hasNotebookAccess
                    ? "Flip through the workbook, search resources, save favorites, and download what you need."
                    : "Register to unlock access to all notebook materials."}
                </p>
              </div>
              {hasNotebookAccess ? (
                <div className="notebook-tools" aria-label="Notebook tools">
                  <label className="search-wrap notebook-search">
                    <SearchIcon size={18} />
                    <span className="sr-only">Search notebook resources</span>
                    <input
                      className="search-input"
                      onChange={(event) => {
                        setQuery(event.target.value);
                        setCurrentPageIndex(3);
                      }}
                      placeholder="Search notebook"
                      type="search"
                      value={query}
                    />
                  </label>
                  <button
                    className="notebook-tool-button"
                    onClick={() => setShowIndex((visible) => !visible)}
                    type="button"
                  >
                    Index
                  </button>
                  <button
                    className="notebook-tool-button"
                    onClick={() => setFocusMode((active) => !active)}
                    type="button"
                  >
                    {focusMode ? "Exit Fullscreen" : "Fullscreen"}
                  </button>
                  <a
                    className="button button-primary"
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
              ) : null}
            </div>

            {hasNotebookAccess ? (
              <>
                <div className="notebook-tabs" aria-label="Notebook sections">
                  {notebookTabs.map((tab) => (
                    <button
                      aria-pressed={notebookTab === tab.id}
                      key={tab.id}
                      onClick={() => jumpToNotebookTab(tab.id)}
                      type="button"
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {showIndex ? (
                  <div className="floating-index" role="region" aria-label="Notebook index">
                    <div className="floating-index-heading">
                      <strong>Table of Contents</strong>
                      <button
                        className="mini-button"
                        onClick={() => setShowIndex(false)}
                        type="button"
                      >
                        Close
                      </button>
                    </div>
                    <div className="floating-index-tabs">
                      {notebookTabs.map((tab) => (
                        <button
                          aria-current={notebookTab === tab.id ? "page" : undefined}
                          key={tab.id}
                          onClick={() => jumpToNotebookTab(tab.id)}
                          type="button"
                        >
                          {tab.label}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div
                  aria-label="Interactive digital notebook"
                  className="desk-scene"
                  onKeyDown={handleNotebookKeyDown}
                  tabIndex={0}
                >
                  <button
                    aria-label="Previous notebook page"
                    className="page-turn page-turn-left"
                    disabled={visiblePageIndex === 0}
                    onClick={goToPreviousNotebookPage}
                    type="button"
                  >
                    ‹
                  </button>
                  <div className="open-notebook">
                    <article className="notebook-page page-left">
                      <NotebookPageContent
                        appendixCount={appendixResources.length}
                        currentTab={notebookTab}
                        favoriteCount={favoriteResources.length}
                        favoriteIds={favoriteIds}
                        handoutCount={handoutResources.length}
                        notebookSettings={notebookSettings}
                        onJumpToTab={jumpToNotebookTab}
                        onToggleFavorite={toggleFavorite}
                        onTrackAction={trackResourceAction}
                        page={currentNotebookPage}
                        templateCount={templateResources.length}
                      />
                      <span className="page-number">
                        Page {visiblePageIndex + 1}
                      </span>
                    </article>
                    <div className="spiral-binding" aria-hidden="true">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <span key={index} />
                      ))}
                    </div>
                    <article
                      className={`notebook-page page-right ${
                        facingNotebookPage ? "" : "blank-page"
                      }`}
                    >
                      {facingNotebookPage ? (
                        <>
                          <NotebookPageContent
                            appendixCount={appendixResources.length}
                            currentTab={notebookTab}
                            favoriteCount={favoriteResources.length}
                            favoriteIds={favoriteIds}
                            handoutCount={handoutResources.length}
                            notebookSettings={notebookSettings}
                            onJumpToTab={jumpToNotebookTab}
                            onToggleFavorite={toggleFavorite}
                            onTrackAction={trackResourceAction}
                            page={facingNotebookPage}
                            templateCount={templateResources.length}
                          />
                          <span className="page-number">
                            Page {visiblePageIndex + 2}
                          </span>
                        </>
                      ) : null}
                    </article>
                  </div>
                  <button
                    aria-label="Next notebook page"
                    className="page-turn page-turn-right"
                    disabled={visiblePageIndex >= maxNotebookPageIndex}
                    onClick={goToNextNotebookPage}
                    type="button"
                  >
                    ›
                  </button>
                </div>

                <div className="page-strip" aria-label="Notebook page thumbnails">
                  {notebookPages.map((page, index) => (
                    <button
                      aria-current={index === visiblePageIndex ? "page" : undefined}
                      key={page.id}
                      onClick={() => goToNotebookPage(index)}
                      type="button"
                    >
                      <span>{index + 1}</span>
                      {getNotebookPageLabel(page, index)}
                    </button>
                  ))}
                </div>

                <details className="notebook-fallback">
                  <summary>Resource index fallback</summary>
                  <div className="fallback-list">
                    {visibleNotebookResources.length ? (
                      visibleNotebookResources.map((resource) => (
                        <div className="fallback-row" key={resource.id}>
                          <button
                            aria-label={
                              favoriteIds.has(resource.id)
                                ? `Remove ${resource.title} from favorites`
                                : `Add ${resource.title} to favorites`
                            }
                            aria-pressed={favoriteIds.has(resource.id)}
                            className="icon-button"
                            onClick={() => toggleFavorite(resource.id)}
                            title={
                              favoriteIds.has(resource.id)
                                ? "Remove favorite"
                                : "Add favorite"
                            }
                            type="button"
                          >
                            <HeartIcon size={16} />
                          </button>
                          <span>{resource.title}</span>
                          <a
                            href={`/api/resources/${resource.id}?action=view`}
                            onClick={() => trackResourceAction(resource, "view")}
                            rel="noreferrer"
                            target="_blank"
                          >
                            View
                          </a>
                          <a
                            href={`/api/resources/${resource.id}?action=download`}
                            onClick={() =>
                              trackResourceAction(resource, "download")
                            }
                          >
                            Download
                          </a>
                        </div>
                      ))
                    ) : (
                      <p>No resources match the current search.</p>
                    )}
                  </div>
                </details>
              </>
            ) : (
              <div className="desk-scene locked-desk">
                <div className="locked-notebook" role="status">
                  <span className="locked-tab">CEALI</span>
                  <h3>Register to unlock access to all notebook materials.</h3>
                  <p>
                    Once registered, this space becomes an interactive workbook
                    with searchable resources, downloads, and favorites.
                  </p>
                  <a className="button button-primary" href="#registration">
                    Access Training Materials
                    <ArrowRightIcon size={18} />
                  </a>
                </div>
              </div>
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
