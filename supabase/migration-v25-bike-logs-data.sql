-- ============================================
-- Bike Logs: migrate existing "Bike Logs" Life Log event
-- ============================================
-- IMPORTANT: In the SQL Editor, auth.uid() is often NULL → the UPDATE matches 0 rows.
-- Use section (B) with your email, or (C) with the event row id from Table Editor.

-- (A) Schema
ALTER TABLE event_types
  ADD COLUMN IF NOT EXISTS scope TEXT DEFAULT NULL;

ALTER TABLE event_logs
  ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_event_types_scope ON event_types(user_id, scope)
  WHERE scope IS NOT NULL;

-- (B) Recommended: set scope by your login email (replace the address)
UPDATE event_types et
SET scope = 'bike', updated_at = NOW()
FROM auth.users u
WHERE et.user_id = u.id
  AND u.email = 'YOUR_EMAIL@example.com'
  AND lower(trim(et.name)) IN ('bike logs', 'bike log', 'bikelogs', 'bike-logs');

-- (C) Or set scope by event id (from event_types table)
-- UPDATE event_types
-- SET scope = 'bike', updated_at = NOW()
-- WHERE id = '00000000-0000-0000-0000-000000000000';

-- (D) Only works when SQL runs as the logged-in user (e.g. some RPC contexts)
-- UPDATE event_types et
-- SET scope = 'bike', updated_at = NOW()
-- WHERE et.user_id = auth.uid()
--   AND lower(trim(et.name)) IN ('bike logs', 'bike log', 'bikelogs', 'bike-logs');

-- Verify
SELECT et.id, et.name, et.scope,
       (SELECT count(*) FROM event_logs el WHERE el.event_type_id = et.id) AS log_count
FROM event_types et
JOIN auth.users u ON u.id = et.user_id
WHERE lower(trim(et.name)) LIKE '%bike%'
ORDER BY u.email, et.name;
