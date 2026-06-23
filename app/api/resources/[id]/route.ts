import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/db/queries";
import { findResource } from "@/lib/resources";
import { getClientDetails } from "@/lib/request";

type RouteContext = {
  params: Promise<{ id: string }>;
};

function fileNameFromHref(href: string) {
  return href.split("/").pop() ?? "ceali-resource.pdf";
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
  const { ipAddress, userAgent } = getClientDetails(request);
  await recordEvent({
    action,
    eventType: "resource",
    ipAddress,
    resourceId: resource.id,
    sessionId: request.nextUrl.searchParams.get("sessionId") ?? undefined,
    userAgent,
  });

  const assetResponse = await fetch(new URL(resource.href, request.url));
  if (!assetResponse.ok || !assetResponse.body) {
    return NextResponse.json(
      { error: "Resource file is unavailable." },
      { status: 404 },
    );
  }

  return new NextResponse(assetResponse.body, {
    headers: {
      "Cache-Control": "public, max-age=3600",
      "Content-Disposition": `${action === "download" ? "attachment" : "inline"}; filename="${fileNameFromHref(resource.href)}"`,
      "Content-Type": "application/pdf",
    },
  });
}
