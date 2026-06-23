CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  organization TEXT,
  consent INTEGER NOT NULL,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS registrations_email_idx ON registrations (email);
CREATE INDEX IF NOT EXISTS registrations_created_at_idx ON registrations (created_at);
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  event_type TEXT NOT NULL,
  resource_id TEXT,
  action TEXT,
  session_id TEXT,
  user_agent TEXT,
  ip_address TEXT
);
CREATE INDEX IF NOT EXISTS analytics_events_type_idx ON analytics_events (event_type);
CREATE INDEX IF NOT EXISTS analytics_events_resource_idx ON analytics_events (resource_id, action);
CREATE INDEX IF NOT EXISTS analytics_events_session_idx ON analytics_events (session_id);
