"use client";

import Image from "next/image";
import type { FormEvent, KeyboardEvent } from "react";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import type {
  NotebookSettings,
  ResourceItem,
  ResourceSection,
} from "@/lib/resources";
import {
  ArrowRightIcon,
  DownloadIcon,
  EyeIcon,
  HeartIcon,
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

type NotebookTab = ResourceSection | "favorites";

const notebookTabs: { id: NotebookTab; label: string }[] = [
  { id: "templates", label: "Templates" },
  {
    id: "documentation",
    label: "Documentation Examples",
  },
  { id: "conversation", label: "Conversation Planning" },
  { id: "handouts", label: "Handouts" },
  { id: "appendix", label: "Appendix" },
  { id: "support", label: "Support Services" },
  { id: "favorites", label: "Favorites" },
];

const CEALI_LOGO_SRC = "/ceali-logo.png";

const notebookTabLabels = notebookTabs.reduce(
  (labels, tab) => ({ ...labels, [tab.id]: tab.label }),
  {} as Record<NotebookTab, string>,
);

type NotebookPage =
  | { id: string; kind: "cover" | "toc" | "additional" | "closing" }
  | {
      emptyMessage: string;
      id: string;
      kind: "empty";
      title: string;
    }
  | {
      id: string;
      kind: "resource";
      resource: ResourceItem;
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

function formatTabCount(tab: NotebookTab, count: number) {
  if (tab === "favorites") {
    return `${count} saved`;
  }
  if (tab === "templates") {
    return `${count} forms`;
  }
  if (tab === "appendix") {
    return `${count} word banks`;
  }
  return `${count} ${count === 1 ? "file" : "files"}`;
}

function trackEvent(eventName: string, params: Record<string, string>) {
  if (typeof window === "undefined") {
    return;
  }
  window.gtag?.("event", eventName, params);
}

function getNotebookPageLabel(page: NotebookPage, index: number) {
  if (page.kind === "resource") {
    return page.resource.title;
  }

  if (page.kind === "empty") {
    return page.title;
  }

  const labels: Record<NotebookPage["kind"], string> = {
    additional: "Resources",
    closing: "Contact",
    cover: "Cover",
    empty: "Empty",
    resource: "Resource",
    toc: "Contents",
  };

  return labels[page.kind] ?? `Page ${index + 1}`;
}

function normalizeSpreadStart(index: number, maxSpreadStart: number) {
  const clamped = Math.max(0, Math.min(index, maxSpreadStart));
  return clamped % 2 === 0 ? clamped : clamped - 1;
}

function PremiumCoverContent({ compact = false }: { compact?: boolean }) {
  return (
    <span className={compact ? "premium-cover-content compact" : "premium-cover-content"}>
      <Image
        alt="Childcare Excellence Association logo"
        className="premium-cover-logo"
        height={232}
        priority={!compact}
        src={CEALI_LOGO_SRC}
        unoptimized
        width={500}
      />
      <span className="premium-cover-rule" aria-hidden="true" />
      <span className="premium-cover-title">Digital Training Notebook</span>
      <span className="premium-cover-subtitle">Having Tough Conversations</span>
      <span className="premium-cover-small">
        Training Tools &amp; Resources for Early Childhood Professionals
      </span>
      {!compact ? (
        <span className="premium-cover-open">
          Click anywhere to open your notebook
          <span aria-hidden="true">↓</span>
        </span>
      ) : null}
    </span>
  );
}

function NotebookResourcePage({
  hasNotebookAccess,
  resource,
  favorite,
  onToggleFavorite,
  onTrackAction,
}: {
  hasNotebookAccess: boolean;
  resource: ResourceItem;
  favorite: boolean;
  onToggleFavorite: (id: string) => void;
  onTrackAction: (resource: ResourceItem, action: "view" | "download") => void;
}) {
  return (
    <div className="document-page">
      <div className="document-topline">
        <span className={`pill ${resource.kind}`}>{resource.kind}</span>
        <span className="resource-meta">{resource.pages}</span>
        <button
          aria-label={
            favorite
              ? `Remove ${resource.title} from favorites`
              : `Add ${resource.title} to favorites`
          }
          aria-pressed={favorite}
          className="icon-button document-favorite"
          onClick={() => onToggleFavorite(resource.id)}
          title={favorite ? "Remove favorite" : "Add favorite"}
          type="button"
        >
          <HeartIcon size={17} />
        </button>
      </div>
      <div className="document-heading">
        <p className="page-kicker">{notebookTabLabels[resource.section]}</p>
        <h3>{resource.title}</h3>
        <p>{resource.description}</p>
      </div>
      <div className="document-preview-large">
        <Image
          alt=""
          fill
          sizes="(max-width: 760px) 80vw, 34rem"
          src={resource.preview}
          unoptimized
        />
      </div>
      <div className="notebook-resource-actions document-actions">
        {hasNotebookAccess ? (
          <>
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
          </>
        ) : (
          <>
            <button className="button button-light" disabled type="button">
              <EyeIcon size={17} />
              View
            </button>
            <button className="button button-dark" disabled type="button">
              <DownloadIcon size={17} />
              Download
            </button>
          </>
        )}
      </div>
      {!hasNotebookAccess ? (
        <p className="locked-page-note">
          Register to unlock view and download access for this resource.
        </p>
      ) : null}
    </div>
  );
}

function NotebookPageContent({
  currentTab,
  favoriteIds,
  hasNotebookAccess,
  notebookSettings,
  page,
  tabCounts,
  onJumpToTab,
  onToggleFavorite,
  onTrackAction,
}: {
  currentTab: NotebookTab;
  favoriteIds: Set<string>;
  hasNotebookAccess: boolean;
  notebookSettings: NotebookSettings;
  page: NotebookPage;
  tabCounts: Record<NotebookTab, number>;
  onJumpToTab: (tab: NotebookTab) => void;
  onToggleFavorite: (id: string) => void;
  onTrackAction: (resource: ResourceItem, action: "view" | "download") => void;
}) {
  if (page.kind === "cover") {
    return (
      <div className="page-cover">
        <div className="cover-logo">
          <Image
            alt="Childcare Excellence Association logo"
            className="cover-logo-image"
            height={126}
            src={CEALI_LOGO_SRC}
            unoptimized
            width={272}
          />
        </div>
        <p className="page-kicker">Having Tough Conversations</p>
        <h3>Digital Training Notebook</h3>
        <p>
          Training Tools &amp; Resources for Early Childhood Professionals
        </p>
        {!hasNotebookAccess ? (
          <div className="cover-lock-card">
            <strong>Register to unlock access to all notebook materials.</strong>
            <span>Complete the registration form above to get full access.</span>
          </div>
        ) : (
          <div className="cover-stamp">
            <strong>Notebook Unlocked</strong>
            <span>Use the tabs, page arrows, search, and favorites to navigate.</span>
          </div>
        )}
      </div>
    );
  }

  if (page.kind === "toc") {
    return (
      <div className="page-prose">
        <p className="page-kicker">Index</p>
        <h3>Table of Contents</h3>
        <div className="toc-list">
          {notebookTabs.map((tab) => (
            <button
              aria-current={currentTab === tab.id ? "page" : undefined}
              key={tab.id}
              onClick={() => onJumpToTab(tab.id)}
              type="button"
            >
              <span className={`toc-dot tab-${tab.id}`} aria-hidden="true" />
              <span>{tab.label}</span>
              <strong>{formatTabCount(tab.id, tabCounts[tab.id])}</strong>
            </button>
          ))}
        </div>
        <div className="paper-note notebook-quote">
          <strong>The best investment you can make is in yourself.</strong>
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

  if (page.kind === "resource") {
    return (
      <NotebookResourcePage
        favorite={favoriteIds.has(page.resource.id)}
        hasNotebookAccess={hasNotebookAccess}
        onToggleFavorite={onToggleFavorite}
        onTrackAction={onTrackAction}
        resource={page.resource}
      />
    );
  }

  if (page.kind === "empty") {
    return (
      <div className="page-prose">
        <p className="page-kicker">Notebook Section</p>
        <h3>{page.title}</h3>
        <p className="notebook-empty">{page.emptyMessage}</p>
      </div>
    );
  }

  return null;
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
  const [notebookTab, setNotebookTab] = useState<NotebookTab>("templates");
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [notebookOpened, setNotebookOpened] = useState(false);
  const [coverAnimating, setCoverAnimating] = useState(false);
  const [pageTurnDirection, setPageTurnDirection] = useState<
    "next" | "previous" | "jump" | null
  >(null);
  const favoriteIds = useMemo(
    () => parseFavorites(favoriteSnapshot),
    [favoriteSnapshot],
  );
  useEffect(() => {
    const sessionId = getSessionId();
    void fetch("/api/analytics", {
      body: JSON.stringify({ event: "visit", sessionId }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (!coverAnimating) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCoverAnimating(false), 760);
    return () => window.clearTimeout(timeout);
  }, [coverAnimating]);

  useEffect(() => {
    if (!pageTurnDirection) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setPageTurnDirection(null), 340);
    return () => window.clearTimeout(timeout);
  }, [currentPageIndex, pageTurnDirection]);

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
      setNotebookTab("templates");
      setCurrentPageIndex(0);
      setNotebookOpened(true);
      setPageTurnDirection("jump");
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

  const orderedNotebookResources = useMemo(
    () => [...allResources].sort((a, b) => a.order - b.order),
    [allResources],
  );
  const favoriteResources = useMemo(
    () => orderedNotebookResources.filter((resource) => favoriteIds.has(resource.id)),
    [orderedNotebookResources, favoriteIds],
  );
  const searchedNotebookResources = useMemo(
    () =>
      orderedNotebookResources.filter((resource) =>
        resourceMatches(resource, query),
      ),
    [orderedNotebookResources, query],
  );
  const searchedFavoriteResources = useMemo(
    () =>
      favoriteResources.filter((resource) => resourceMatches(resource, query)),
    [favoriteResources, query],
  );
  const visibleNotebookResources =
    notebookTab === "favorites"
      ? searchedFavoriteResources
      : searchedNotebookResources;
  const tabCounts = useMemo(() => {
    const counts: Record<NotebookTab, number> = {
      appendix: 0,
      conversation: 0,
      documentation: 0,
      favorites: favoriteResources.length,
      handouts: 0,
      support: 0,
      templates: 0,
    };

    for (const resource of orderedNotebookResources) {
      counts[resource.section] += 1;
    }

    return counts;
  }, [favoriteResources.length, orderedNotebookResources]);
  const notebookPages = useMemo<NotebookPage[]>(() => {
    const coverPages: NotebookPage[] = [
      { id: "toc", kind: "toc" },
      { id: "cover", kind: "cover" },
    ];

    if (!hasNotebookAccess) {
      return coverPages;
    }

    const resourcePages: NotebookPage[] = visibleNotebookResources.length
      ? visibleNotebookResources.map((resource) => ({
          id: `resource-${resource.id}`,
          kind: "resource",
          resource,
        }))
      : [
          {
            emptyMessage: query.trim()
              ? "No matching resources found in this notebook view."
              : notebookTab === "favorites"
                ? "Favorite resources will appear here after you tap the heart on a page."
                : "No resources are available in this notebook section yet.",
            id: `${notebookTab}-empty`,
            kind: "empty",
            title: notebookTabLabels[notebookTab],
          },
        ];

    return [
      ...coverPages,
      ...resourcePages,
      { id: "additional", kind: "additional" },
      { id: "closing", kind: "closing" },
    ];
  }, [hasNotebookAccess, notebookTab, query, visibleNotebookResources]);
  const maxNotebookPageIndex = Math.max(notebookPages.length - 1, 0);
  const maxNotebookSpreadStart =
    maxNotebookPageIndex % 2 === 0
      ? maxNotebookPageIndex
      : Math.max(maxNotebookPageIndex - 1, 0);
  const visiblePageIndex = normalizeSpreadStart(
    currentPageIndex,
    maxNotebookSpreadStart,
  );
  const fallbackNotebookPage: NotebookPage = { id: "cover", kind: "cover" };
  const leftNotebookPage = notebookPages[visiblePageIndex] ?? fallbackNotebookPage;
  const rightNotebookPage = notebookPages[visiblePageIndex + 1] ?? null;
  const activeNotebookTab = useMemo<NotebookTab>(() => {
    if (notebookTab === "favorites") {
      return "favorites";
    }

    const visibleSections = [leftNotebookPage, rightNotebookPage]
      .filter((page): page is Extract<NotebookPage, { kind: "resource" }> =>
        page?.kind === "resource",
      )
      .map((page) => page.resource.section);

    if (visibleSections.includes(notebookTab as ResourceSection)) {
      return notebookTab;
    }

    if (rightNotebookPage?.kind === "resource") {
      return rightNotebookPage.resource.section;
    }

    if (leftNotebookPage.kind === "resource") {
      return leftNotebookPage.resource.section;
    }

    return notebookTab;
  }, [leftNotebookPage, notebookTab, rightNotebookPage]);
  const appsScriptWebAppUrl =
    process.env.NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL || "";

  function openNotebook() {
    if (notebookOpened || coverAnimating) {
      return;
    }

    setNotebookOpened(true);
    setCoverAnimating(true);
    setCurrentPageIndex((current) =>
      normalizeSpreadStart(current, maxNotebookSpreadStart),
    );
  }

  function goToNotebookPage(index: number) {
    const nextIndex = normalizeSpreadStart(index, maxNotebookSpreadStart);
    if (nextIndex === visiblePageIndex) {
      return;
    }

    setPageTurnDirection(nextIndex > visiblePageIndex ? "next" : "previous");
    setCurrentPageIndex(nextIndex);
  }

  function goToNextNotebookPage() {
    goToNotebookPage(visiblePageIndex + 2);
  }

  function goToPreviousNotebookPage() {
    goToNotebookPage(visiblePageIndex - 2);
  }

  function jumpToNotebookTab(tab: NotebookTab) {
    const resourceIndex =
      tab === "favorites"
        ? 0
        : searchedNotebookResources.findIndex(
            (resource) => resource.section === tab,
          );

    setNotebookTab(tab);
    setPageTurnDirection("jump");
    setCurrentPageIndex(
      hasNotebookAccess ? Math.max(resourceIndex, 0) + 2 : 0,
    );
  }

  function handleNotebookKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!notebookOpened && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault();
      openNotebook();
      return;
    }

    if (!notebookOpened) {
      return;
    }

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
        Skip to registration form
      </a>
      <header className="topbar">
        <div className="topbar-inner">
          <a className="brand" href="#home">
            <Image
              alt="Childcare Excellence Association logo"
              className="brand-logo-image"
              height={44}
              src={CEALI_LOGO_SRC}
              unoptimized
              width={95}
            />
            <span className="brand-text">
              <strong>CEALI</strong>
              <span>Digital Training Notebook</span>
            </span>
          </a>
          <nav aria-label="Primary" className="nav-links">
            <a href="#home">Home</a>
            <a href={hasNotebookAccess ? "#notebook" : "#registration"}>
              Digital Notebook
            </a>
            <a href="https://www.ceali.org">CEALI Website</a>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero participant-hero" id="home">
          <div className="participant-hero-inner">
            <div className="participant-hero-copy">
              <Image
                alt="Childcare Excellence Association logo"
                className="hero-logo-image"
                height={104}
                priority
                src={CEALI_LOGO_SRC}
                unoptimized
                width={224}
              />
              <div>
                <p className="eyebrow">CEALI Digital Training Notebook</p>
                <h1>Having Tough Conversations</h1>
              </div>
              <p className="hero-copy">
                Access training tools, templates, handouts, and word banks for
                respectful family conversations in early childhood settings.
              </p>
              <div className="hero-actions">
                <a className="button button-primary" href="#registration">
                  Open Digital Notebook
                  <ArrowRightIcon size={18} />
                </a>
              </div>
            </div>
            <aside
              aria-label="Digital notebook preview"
              className="landing-notebook-preview"
            >
              <PremiumCoverContent compact />
            </aside>
          </div>
        </section>

        <section className="section-band registration-section" id="registration">
          <div className="section-inner intro-grid">
            <div>
              <p className="section-kicker">Registration</p>
              <h2 className="section-title">Register to open your notebook.</h2>
              <p className="body-copy">
                Complete this quick form once to unlock today&apos;s digital
                training materials.
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
          <div className="notebook-workspace">
            <div className="notebook-nav">
              <div className="notebook-brand-lockup">
                <span className="notebook-logo">
                  <Image
                    alt="Childcare Excellence Association logo"
                    height={40}
                    src={CEALI_LOGO_SRC}
                    unoptimized
                    width={86}
                  />
                </span>
                <div>
                  <strong>CEALI</strong>
                  <span>Digital Training Notebook</span>
                </div>
              </div>

              <label className="search-wrap notebook-search">
                <SearchIcon size={18} />
                <span className="sr-only">Search notebook resources</span>
                <input
                  className="search-input"
                  disabled={!hasNotebookAccess}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setPageTurnDirection("jump");
                    setCurrentPageIndex(hasNotebookAccess ? 2 : 0);
                  }}
                  placeholder={
                    hasNotebookAccess
                      ? "Search resources..."
                      : "Register to search resources"
                  }
                  type="search"
                  value={query}
                />
              </label>

              <div className="notebook-tools" aria-label="Notebook tools">
                {hasNotebookAccess ? (
                  <a
                    className="button button-primary notebook-download-all"
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
                ) : (
                  <button
                    className="button button-primary notebook-download-all"
                    disabled
                    type="button"
                  >
                    <DownloadIcon size={17} />
                    Download All
                  </button>
                )}
                <button
                  className="notebook-favorites-button"
                  disabled={!hasNotebookAccess}
                  onClick={() => jumpToNotebookTab("favorites")}
                  type="button"
                >
                  <HeartIcon size={18} />
                  Favorites
                  <span>{favoriteResources.length}</span>
                </button>
              </div>
            </div>

            <div
              aria-label="Interactive digital notebook"
              className={`desk-scene ${
                notebookOpened ? "notebook-opened" : "notebook-closed"
              }`}
              onKeyDown={handleNotebookKeyDown}
              tabIndex={0}
            >
              {notebookOpened ? (
                <button
                  aria-label="Previous notebook page spread"
                  className="page-turn page-turn-left"
                  disabled={visiblePageIndex === 0}
                  onClick={goToPreviousNotebookPage}
                  type="button"
                >
                  ‹
                </button>
              ) : null}

              <div
                className={`notebook-stage ${
                  notebookOpened ? "is-open" : "is-closed"
                } ${coverAnimating ? "is-opening" : ""}`}
              >
                <div className="cover-backing" aria-hidden="true" />

                {notebookOpened ? (
                  <>
                    <div
                      className={`open-notebook ${
                        pageTurnDirection
                          ? `page-turning-${pageTurnDirection}`
                          : ""
                      }`}
                    >
                      <article className="notebook-page page-left">
                        <NotebookPageContent
                          currentTab={activeNotebookTab}
                          favoriteIds={favoriteIds}
                          hasNotebookAccess={hasNotebookAccess}
                          notebookSettings={notebookSettings}
                          onJumpToTab={jumpToNotebookTab}
                          onToggleFavorite={toggleFavorite}
                          onTrackAction={trackResourceAction}
                          page={leftNotebookPage}
                          tabCounts={tabCounts}
                        />
                        <span className="page-number">
                          Page {visiblePageIndex + 1}
                        </span>
                      </article>
                      <div className="spiral-binding" aria-hidden="true">
                        {Array.from({ length: 14 }).map((_, index) => (
                          <span key={index} />
                        ))}
                      </div>
                      <article className="notebook-page page-right">
                        {rightNotebookPage ? (
                          <>
                            <NotebookPageContent
                              currentTab={activeNotebookTab}
                              favoriteIds={favoriteIds}
                              hasNotebookAccess={hasNotebookAccess}
                              notebookSettings={notebookSettings}
                              onJumpToTab={jumpToNotebookTab}
                              onToggleFavorite={toggleFavorite}
                              onTrackAction={trackResourceAction}
                              page={rightNotebookPage}
                              tabCounts={tabCounts}
                            />
                            <span className="page-number">
                              Page {visiblePageIndex + 2}
                            </span>
                          </>
                        ) : (
                          <div className="blank-inside-page" aria-hidden="true" />
                        )}
                      </article>
                    </div>

                    <div className="divider-tabs" aria-label="Notebook sections">
                      {notebookTabs.map((tab) => (
                        <button
                          aria-pressed={activeNotebookTab === tab.id}
                          className={`divider-tab tab-${tab.id}`}
                          disabled={!hasNotebookAccess}
                          key={tab.id}
                          onClick={() => jumpToNotebookTab(tab.id)}
                          type="button"
                        >
                          <span>{tab.label}</span>
                          {tab.id === "favorites" ? (
                            <strong>{favoriteResources.length}</strong>
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </>
                ) : (
                  <button
                    aria-label="Open CEALI Digital Training Notebook"
                    className="closed-notebook-cover"
                    onClick={openNotebook}
                    type="button"
                  >
                    <span className="closed-cover-spiral" aria-hidden="true">
                      {Array.from({ length: 12 }).map((_, index) => (
                        <span key={index} />
                      ))}
                    </span>
                    <PremiumCoverContent />
                    <span className="closed-cover-access">
                      {hasNotebookAccess
                        ? "Notebook unlocked"
                        : "Register to unlock access to all notebook materials."}
                    </span>
                  </button>
                )}

                {coverAnimating ? (
                  <span className="front-cover-swing" aria-hidden="true">
                    <PremiumCoverContent compact />
                  </span>
                ) : null}
              </div>

              {notebookOpened ? (
                <button
                  aria-label="Next notebook page spread"
                  className="page-turn page-turn-right"
                  disabled={visiblePageIndex >= maxNotebookSpreadStart}
                  onClick={goToNextNotebookPage}
                  type="button"
                >
                  ›
                </button>
              ) : null}
            </div>

            {notebookOpened ? (
              <div className="page-strip" aria-label="Notebook page navigation">
                <span>Go to page</span>
                {notebookPages.map((page, index) => (
                  <button
                    aria-current={
                      index === visiblePageIndex ? "page" : undefined
                    }
                    key={page.id}
                    onClick={() => goToNotebookPage(index)}
                    title={getNotebookPageLabel(page, index)}
                    type="button"
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            ) : null}

            {!hasNotebookAccess ? (
              <p className="notebook-lock-note" role="status">
                Register to unlock access to all notebook materials.
              </p>
            ) : null}

            {hasNotebookAccess ? (
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
                          onClick={() => trackResourceAction(resource, "download")}
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
            ) : null}
          </div>
        </section>

      </main>
      <footer className="footer">
        <span>CEALI training materials are provided for registered conference participants.</span>
        <a href="https://www.ceali.org">www.ceali.org</a>
        <a href="tel:6315160010">631-516-0010</a>
      </footer>
    </div>
  );
}
