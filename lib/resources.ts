import catalog from "@/content/resources.json";

export type ResourceKind = "template" | "handout" | "appendix";
export type ResourceSection =
  | "templates"
  | "documentation"
  | "conversation"
  | "handouts"
  | "appendix"
  | "support";

export type ResourceItem = {
  id: string;
  kind: ResourceKind;
  section: ResourceSection;
  order: number;
  title: string;
  description: string;
  pages: string;
  href: string;
  preview: string;
  driveFileId?: string;
  driveViewUrl?: string;
  driveDownloadUrl?: string;
  keywords: string[];
};

export type NotebookSettings = {
  fullHandoutPacket: {
    id: string;
    title: string;
    href: string;
    driveFileId?: string;
    driveViewUrl?: string;
    driveDownloadUrl?: string;
  };
  googleDriveFolderUrl?: string;
  upcomingTrainingsUrl?: string;
};

type CatalogShape = {
  settings: NotebookSettings;
  handouts: ResourceItem[];
  appendix: ResourceItem[];
};

const typedCatalog = catalog as CatalogShape;

function withDriveUrls<T extends { driveFileId?: string; driveViewUrl?: string; driveDownloadUrl?: string }>(
  item: T,
) {
  const driveFileId = item.driveFileId?.trim();
  if (!driveFileId) {
    return item;
  }

  return {
    ...item,
    driveViewUrl:
      item.driveViewUrl || `https://drive.google.com/file/d/${driveFileId}/view`,
    driveDownloadUrl:
      item.driveDownloadUrl ||
      `https://drive.google.com/uc?export=download&id=${driveFileId}`,
  };
}

export const notebookSettings: NotebookSettings = {
  ...typedCatalog.settings,
  fullHandoutPacket: withDriveUrls(typedCatalog.settings.fullHandoutPacket),
};

export const handoutResources: ResourceItem[] =
  typedCatalog.handouts.map(withDriveUrls);

export const appendixResources: ResourceItem[] =
  typedCatalog.appendix.map(withDriveUrls);

export const allResources = [
  ...handoutResources,
  ...appendixResources,
  {
    ...notebookSettings.fullHandoutPacket,
    kind: "handout" as const,
    description: "Complete presentation handout packet.",
    pages: "Full packet",
    preview: "/previews/handouts/full-handout-packet.png",
    keywords: ["download all", "packet", "handouts"],
  },
];

export function findResource(id: string) {
  return allResources.find((resource) => resource.id === id);
}
