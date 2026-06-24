import { createSign } from "node:crypto";

export type RegistrationInput = {
  consent: boolean;
  email: string;
  firstName: string;
  lastName: string;
  organization?: string;
  phone: string;
};

export type RegistrationRow = {
  consent: number;
  email: string;
  firstName: string;
  lastName: string;
  organization: string | null;
  phone: string;
  timestamp: string;
};

type GoogleTokenResponse = {
  access_token?: string;
  error?: string;
  error_description?: string;
};

const sheetsScope = "https://www.googleapis.com/auth/spreadsheets";

function base64Url(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function getGoogleConfig() {
  const clientEmail =
    process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  const sheetId = process.env.GOOGLE_SHEET_ID;
  const tabName = process.env.GOOGLE_SHEET_TAB_NAME || "Registrations";

  if (!clientEmail || !privateKey || !sheetId) {
    throw new Error(
      "Google Sheets is not configured. Add GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_PRIVATE_KEY, and GOOGLE_SHEET_ID in Vercel.",
    );
  }

  return { clientEmail, privateKey, sheetId, tabName };
}

async function getGoogleAccessToken() {
  const { clientEmail, privateKey } = getGoogleConfig();
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(
    JSON.stringify({
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
      iss: clientEmail,
      scope: sheetsScope,
    }),
  );
  const unsignedJwt = `${header}.${claim}`;
  const signature = createSign("RSA-SHA256")
    .update(unsignedJwt)
    .sign(privateKey);
  const jwt = `${unsignedJwt}.${base64Url(signature)}`;

  const response = await fetch("https://oauth2.googleapis.com/token", {
    body: new URLSearchParams({
      assertion: jwt,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    method: "POST",
  });
  const data = (await response.json()) as GoogleTokenResponse;

  if (!response.ok || !data.access_token) {
    throw new Error(
      data.error_description || data.error || "Could not authenticate with Google.",
    );
  }

  return data.access_token;
}

function valuesRange(tabName: string) {
  return `${encodeURIComponent(`'${tabName}'!A:G`)}`;
}

export function getAdminExportKey() {
  return process.env.ADMIN_EXPORT_KEY;
}

export function getPublicGoogleSheetUrl() {
  return process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || "";
}

export async function saveRegistration(input: RegistrationInput) {
  const { sheetId, tabName } = getGoogleConfig();
  const accessToken = await getGoogleAccessToken();
  const timestamp = new Date().toISOString();

  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${valuesRange(
      tabName,
    )}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      body: JSON.stringify({
        values: [
          [
            timestamp,
            input.firstName,
            input.lastName,
            input.email,
            input.phone,
            input.organization || "",
            input.consent ? "Yes" : "No",
          ],
        ],
      }),
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      method: "POST",
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not save registration to Google Sheets. ${text}`);
  }

  return { timestamp };
}

export async function getRegistrationsForCsv(): Promise<RegistrationRow[]> {
  const { sheetId, tabName } = getGoogleConfig();
  const accessToken = await getGoogleAccessToken();
  const response = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${valuesRange(
      tabName,
    )}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    },
  );

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Could not read registrations from Google Sheets. ${text}`);
  }

  const data = (await response.json()) as { values?: string[][] };
  const rows = data.values ?? [];
  const withoutHeader =
    rows[0]?.[0]?.toLowerCase() === "timestamp" ? rows.slice(1) : rows;

  return withoutHeader
    .filter((row) => row.some(Boolean))
    .map((row) => ({
      consent: row[6]?.toLowerCase() === "yes" ? 1 : 0,
      email: row[3] ?? "",
      firstName: row[1] ?? "",
      lastName: row[2] ?? "",
      organization: row[5] || null,
      phone: row[4] ?? "",
      timestamp: row[0] ?? "",
    }))
    .reverse();
}
