export function getAdminExportKey() {
  return process.env.ADMIN_EXPORT_KEY;
}

export function getAppsScriptWebAppUrl() {
  return (
    process.env.APPS_SCRIPT_WEB_APP_URL ||
    process.env.NEXT_PUBLIC_APPS_SCRIPT_WEB_APP_URL ||
    ""
  );
}

export function getPublicGoogleSheetUrl() {
  return process.env.NEXT_PUBLIC_GOOGLE_SHEET_URL || "";
}
