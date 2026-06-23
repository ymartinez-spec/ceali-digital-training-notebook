import { NextRequest, NextResponse } from "next/server";
import { getRegistrationsForCsv } from "@/db/queries";
import { isAdminAuthorized } from "@/lib/request";

function csvEscape(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const rows = await getRegistrationsForCsv();
  const header = [
    "Timestamp",
    "First Name",
    "Last Name",
    "Email",
    "Phone Number",
    "Organization",
    "Consent",
  ];
  const csv = [
    header.map(csvEscape).join(","),
    ...rows.map((row) =>
      [
        row.timestamp,
        row.firstName,
        row.lastName,
        row.email,
        row.phone,
        row.organization ?? "",
        row.consent ? "Yes" : "No",
      ]
        .map(csvEscape)
        .join(","),
    ),
  ].join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Disposition": "attachment; filename=\"ceali-registrations.csv\"",
      "Content-Type": "text/csv; charset=utf-8",
    },
  });
}
