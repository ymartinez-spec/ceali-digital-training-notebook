const SPREADSHEET_ID = "1VVodUjabJLezHVroiysgnQU2Hte0lPw2nURM8QNHeu8";
const SHEET_NAME = "Registrations";
const HEADERS = [
  "Timestamp",
  "First Name",
  "Last Name",
  "Email",
  "Phone Number",
  "Organization",
  "Consent Status",
  "Consent Text",
  "Session ID",
  "Page URL",
  "Submitted At",
  "User Agent",
];

function doPost(e) {
  const lock = LockService.getScriptLock();

  try {
    const payload = parsePayload_(e);
    const registration = validateRegistration_(payload);

    lock.waitLock(10000);
    const sheet = getRegistrationSheet_();
    ensureHeaderRow_(sheet);
    sheet.appendRow([
      new Date(),
      registration.firstName,
      registration.lastName,
      registration.email,
      registration.phone,
      registration.organization,
      "Yes",
      registration.consentText,
      registration.sessionId,
      registration.pageUrl,
      registration.submittedAt,
      registration.userAgent,
    ]);

    return json_({
      ok: true,
      message: "Registration saved.",
    });
  } catch (error) {
    return json_({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    try {
      lock.releaseLock();
    } catch (error) {
      // Ignore release errors when the lock was never acquired.
    }
  }
}

function doGet(e) {
  const action = String(e && e.parameter && e.parameter.action || "");

  if (action === "csv") {
    return exportCsv_(e);
  }

  return json_({
    ok: true,
    message: "CEALI registration endpoint is running.",
  });
}

function parsePayload_(e) {
  const body = e && e.postData && e.postData.contents
    ? e.postData.contents
    : "";

  if (body) {
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error("Registration payload must be valid JSON.");
    }
  }

  return e && e.parameter ? e.parameter : {};
}

function validateRegistration_(payload) {
  const firstName = clean_(payload.firstName);
  const lastName = clean_(payload.lastName);
  const email = clean_(payload.email).toLowerCase();
  const phone = clean_(payload.phone);
  const organization = clean_(payload.organization);
  const consent = payload.consent === true || payload.consent === "true";

  if (!firstName || !lastName || !email || !phone || !consent) {
    throw new Error("Missing required registration fields.");
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Invalid email address.");
  }

  return {
    consentText: clean_(payload.consentText),
    email,
    firstName,
    lastName,
    organization,
    pageUrl: clean_(payload.pageUrl),
    phone,
    sessionId: clean_(payload.sessionId),
    submittedAt: clean_(payload.submittedAt),
    userAgent: clean_(payload.userAgent),
  };
}

function getRegistrationSheet_() {
  const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    return spreadsheet.insertSheet(SHEET_NAME);
  }

  return sheet;
}

function ensureHeaderRow_(sheet) {
  const firstRow = sheet.getRange(1, 1, 1, HEADERS.length).getValues()[0];
  const hasHeaders = firstRow.some(function (value) {
    return Boolean(value);
  });

  if (!hasHeaders) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  }
}

function exportCsv_(e) {
  const expectedKey = PropertiesService.getScriptProperties()
    .getProperty("ADMIN_EXPORT_KEY");
  const suppliedKey = String(e && e.parameter && e.parameter.key || "");

  if (expectedKey && suppliedKey !== expectedKey) {
    return ContentService
      .createTextOutput("Unauthorized")
      .setMimeType(ContentService.MimeType.TEXT);
  }

  const sheet = getRegistrationSheet_();
  ensureHeaderRow_(sheet);
  const values = sheet.getDataRange().getDisplayValues();
  const csv = values.map(function (row) {
    return row.map(csvEscape_).join(",");
  }).join("\n");

  return ContentService
    .createTextOutput(csv)
    .setMimeType(ContentService.MimeType.CSV);
}

function clean_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function csvEscape_(value) {
  const text = clean_(value);
  return "\"" + text.replace(/"/g, "\"\"") + "\"";
}

function json_(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
