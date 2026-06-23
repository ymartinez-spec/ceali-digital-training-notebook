import { NextRequest, NextResponse } from "next/server";
import { getAnalytics } from "@/db/queries";
import { allResources } from "@/lib/resources";
import { isAdminAuthorized } from "@/lib/request";

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const analytics = await getAnalytics();
  return NextResponse.json({
    ...analytics,
    topDownloads: analytics.topDownloads.map((item) => ({
      ...item,
      title:
        allResources.find((resource) => resource.id === item.resourceId)?.title ??
        item.resourceId,
    })),
  });
}
