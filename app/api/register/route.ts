import { NextRequest, NextResponse } from "next/server";
import { saveRegistration } from "@/db/queries";

export const runtime = "nodejs";

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

  try {
    await saveRegistration({
      consent,
      email,
      firstName,
      lastName,
      organization,
      phone,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Registration could not be saved.",
      },
      { status: 500 },
    );
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
