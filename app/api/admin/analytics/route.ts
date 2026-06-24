import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthorized } from "@/lib/request";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json({
    provider: "Google Analytics",
    events: [
      "registration_complete",
      "resource_view",
      "resource_download",
      "download_all_handouts",
    ],
    message:
      "Use Google Analytics reports to view visitors, registrations, and most viewed or downloaded resources.",
    url: "https://analytics.google.com/",
  });
}
