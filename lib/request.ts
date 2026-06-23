import type { NextRequest } from "next/server";
import { getAdminExportKey } from "@/db/queries";

export function getClientDetails(request: NextRequest) {
  return {
    ipAddress:
      request.headers.get("cf-connecting-ip") ??
      request.headers.get("x-forwarded-for") ??
      "",
    userAgent: request.headers.get("user-agent") ?? "",
  };
}

export function isAdminAuthorized(request: NextRequest) {
  const configuredKey = getAdminExportKey();
  if (!configuredKey) {
    return true;
  }
  const suppliedKey =
    request.headers.get("x-admin-key") ??
    request.nextUrl.searchParams.get("key") ??
    "";
  return suppliedKey === configuredKey;
}
