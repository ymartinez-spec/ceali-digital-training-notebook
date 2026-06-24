import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { findResource } from "@/lib/resources";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function fileNameFromHref(href: string) {
  return href.split("/").pop() ?? "ceali-resource.pdf";
}

function localPublicPath(href: string) {
  const cleanHref = href.replace(/^\/+/, "");
  const resolved = normalize(join(process.cwd(), "public", cleanHref));
  const publicRoot = normalize(join(process.cwd(), "public"));

  if (!resolved.startsWith(publicRoot)) {
    throw new Error("Invalid resource path.");
  }

  return resolved;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const resource = findResource(id);
  if (!resource) {
    return NextResponse.json({ error: "Resource not found." }, { status: 404 });
  }

  if (request.cookies.get("ceali_access")?.value !== "registered") {
    return NextResponse.redirect(new URL("/#registration", request.url));
  }

  const action =
    request.nextUrl.searchParams.get("action") === "download"
      ? "download"
      : "view";

  try {
    const bytes = await readFile(localPublicPath(resource.href));
    return new NextResponse(bytes, {
      headers: {
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": `${
          action === "download" ? "attachment" : "inline"
        }; filename="${fileNameFromHref(resource.href)}"`,
        "Content-Type": "application/pdf",
      },
    });
  } catch {
    const driveUrl =
      action === "download" ? resource.driveDownloadUrl : resource.driveViewUrl;
    if (driveUrl) {
      return NextResponse.redirect(driveUrl);
    }

    return NextResponse.json(
      { error: "Resource file is unavailable. Check the Google Drive file ID or local PDF path." },
      { status: 404 },
    );
  }
}
