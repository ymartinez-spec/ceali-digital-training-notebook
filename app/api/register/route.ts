import { NextRequest, NextResponse } from "next/server";
import { getLeadWebhookUrl, saveRegistration } from "@/db/queries";
import { getClientDetails } from "@/lib/request";

type RegisterBody = {
  consent?: boolean;
  email?: string;
  firstName?: string;
  lastName?: string;
  organization?: string;
  phone?: string;
  sessionId?: string;
};

function clean(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as RegisterBody;
  const firstName = clean(body.firstName);
  const lastName = clean(body.lastName);
  const email = clean(body.email).toLowerCase();
  const phone = clean(body.phone);
  const organization = clean(body.organization);
  const consent = body.consent === true;

  if (!firstName || !lastName || !email || !phone || !consent) {
    return NextResponse.json(
      { error: "Please complete all required fields and consent." },
      { status: 400 },
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Please enter a valid email address." },
      { status: 400 },
    );
  }

  const { ipAddress, userAgent } = getClientDetails(request);
  const timestamp = new Date().toISOString();
  await saveRegistration({
    consent,
    email,
    firstName,
    ipAddress,
    lastName,
    organization,
    phone,
    sessionId: clean(body.sessionId),
    userAgent,
  });

  const webhookUrl = getLeadWebhookUrl();
  if (webhookUrl) {
    await fetch(webhookUrl, {
      body: JSON.stringify({
        consent,
        email,
        firstName,
        lastName,
        organization,
        phone,
        timestamp,
      }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    }).catch(() => undefined);
  }

  const response = NextResponse.json({ ok: true });
  response.cookies.set("ceali_access", "registered", {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
    sameSite: "lax",
    secure: request.nextUrl.protocol === "https:",
  });
  return response;
}
