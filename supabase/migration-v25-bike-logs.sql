-- Migration V25: Bike logs — scope on event types, tags on event logs
-- After running, add `'tags', COALESCE(el.tags, '{}'::text[])` to event_logs in get_user_init_data (optional; client reload fetches tags).

ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT NULL;

ALTER TABLE event_logs
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_event_types_scope ON event_types(user_id, scope)
  WHERE scope IS NOT NULL;
