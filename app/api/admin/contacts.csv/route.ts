import { NextRequest, NextResponse } from "next/server";
import { getAppsScriptWebAppUrl } from "@/db/queries";
import { isAdminAuthorized } from "@/lib/request";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const webAppUrl = getAppsScriptWebAppUrl();
  const key = request.nextUrl.searchParams.get("key") ?? "";

  if (!webAppUrl) {
    return NextResponse.json(
      { error: "Apps Script Web App URL is not configured." },
      { status: 500 },
    );
  }

  const exportUrl = new URL(webAppUrl);
  exportUrl.searchParams.set("action", "csv");
  exportUrl.searchParams.set("key", key);

  return NextResponse.redirect(exportUrl);
}
