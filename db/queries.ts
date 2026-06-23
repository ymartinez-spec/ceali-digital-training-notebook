import { env } from "cloudflare:workers";
import {
  createEventsSql,
  createIndexesSql,
  createRegistrationsSql,
} from "@/db/schema";

type RuntimeEnv = {
  ADMIN_EXPORT_KEY?: string;
  DB?: D1Database;
  LEAD_WEBHOOK_URL?: string;
};

type RegistrationInput = {
  consent: boolean;
  email: string;
  firstName: string;
  ipAddress: string;
  lastName: string;
  organization?: string;
  phone: string;
  sessionId?: string;
  userAgent: string;
};

type EventInput = {
  action?: string;
  eventType: string;
  ipAddress: string;
  resourceId?: string;
  sessionId?: string;
  userAgent: string;
};

const runtimeEnv = env as RuntimeEnv;

export function getAdminExportKey() {
  return runtimeEnv.ADMIN_EXPORT_KEY;
}

export function getLeadWebhookUrl() {
  return runtimeEnv.LEAD_WEBHOOK_URL;
}

function getDatabase() {
  if (!runtimeEnv.DB) {
    throw new Error("D1 database binding DB is not available.");
  }
  return runtimeEnv.DB;
}

export async function ensureTables() {
  const db = getDatabase();
  await db.batch([
    db.prepare(createRegistrationsSql),
    db.prepare(createEventsSql),
    ...createIndexesSql.map((statement) => db.prepare(statement)),
  ]);
  return db;
}

export async function saveRegistration(input: RegistrationInput) {
  const db = await ensureTables();
  await db
    .prepare(
      `INSERT INTO registrations (
        id,
        first_name,
        last_name,
        email,
        phone,
        organization,
        consent,
        session_id,
        user_agent,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.firstName,
      input.lastName,
      input.email,
      input.phone,
      input.organization || null,
      input.consent ? 1 : 0,
      input.sessionId || null,
      input.userAgent,
      input.ipAddress,
    )
    .run();
}

export async function recordEvent(input: EventInput) {
  const db = await ensureTables();
  await db
    .prepare(
      `INSERT INTO analytics_events (
        id,
        event_type,
        resource_id,
        action,
        session_id,
        user_agent,
        ip_address
      ) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      input.eventType,
      input.resourceId || null,
      input.action || null,
      input.sessionId || null,
      input.userAgent,
      input.ipAddress,
    )
    .run();
}

export async function getAnalytics() {
  const db = await ensureTables();
  const [visitors, registrations, downloads, views, topDownloads] =
    await Promise.all([
      db
        .prepare(
          "SELECT COUNT(DISTINCT COALESCE(session_id, ip_address, id)) AS count FROM analytics_events WHERE event_type = ?",
        )
        .bind("visit")
        .first<{ count: number }>(),
      db
        .prepare("SELECT COUNT(*) AS count FROM registrations")
        .first<{ count: number }>(),
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = ? AND action = ?",
        )
        .bind("resource", "download")
        .first<{ count: number }>(),
      db
        .prepare(
          "SELECT COUNT(*) AS count FROM analytics_events WHERE event_type = ? AND action = ?",
        )
        .bind("resource", "view")
        .first<{ count: number }>(),
      db
        .prepare(
          `SELECT resource_id AS resourceId, COUNT(*) AS count
           FROM analytics_events
           WHERE event_type = ? AND action = ? AND resource_id IS NOT NULL
           GROUP BY resource_id
           ORDER BY count DESC
           LIMIT 8`,
        )
        .bind("resource", "download")
        .all<{ resourceId: string; count: number }>(),
    ]);

  return {
    downloads: downloads?.count ?? 0,
    registrations: registrations?.count ?? 0,
    topDownloads: topDownloads.results ?? [],
    views: views?.count ?? 0,
    visitors: visitors?.count ?? 0,
  };
}

export async function getRegistrationsForCsv() {
  const db = await ensureTables();
  const rows = await db
    .prepare(
      `SELECT
        created_at AS timestamp,
        first_name AS firstName,
        last_name AS lastName,
        email,
        phone,
        organization,
        consent
       FROM registrations
       ORDER BY created_at DESC`,
    )
    .all<{
      consent: number;
      email: string;
      firstName: string;
      lastName: string;
      organization: string | null;
      phone: string;
      timestamp: string;
    }>();
  return rows.results ?? [];
}
