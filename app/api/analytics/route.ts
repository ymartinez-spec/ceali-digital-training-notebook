import { NextRequest, NextResponse } from "next/server";
import { recordEvent } from "@/db/queries";
import { getClientDetails } from "@/lib/request";

type AnalyticsBody = {
  event?: string;
  sessionId?: string;
};

export async function POST(request: NextRequest) {
  const body = (await request.json()) as AnalyticsBody;
  if (body.event !== "visit") {
    return NextResponse.json({ error: "Unsupported event." }, { status: 400 });
  }

  const { ipAddress, userAgent } = getClientDetails(request);
  await recordEvent({
    eventType: "visit",
    ipAddress,
    sessionId: body.sessionId,
    userAgent,
  });
  return NextResponse.json({ ok: true });
}
