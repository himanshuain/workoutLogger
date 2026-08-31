-- ============================================
-- Migration V19: Routine exercise pinning
-- ============================================

ALTER TABLE routine_exercises
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN routine_exercises.is_pinned IS
  'When true, exercise appears in pinned section at top of split before order_index sort within each group.';

CREATE INDEX IF NOT EXISTS idx_routine_exercises_pinned_order
  ON routine_exercises (routine_id, is_pinned DESC, order_index ASC);

CREATE OR REPLACE FUNCTION replace_routine_exercises(
  p_routine_id UUID,
  p_exercises JSONB
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM workout_routines
    WHERE id = p_routine_id AND user_id = v_uid
  ) THEN
    RAISE EXCEPTION 'Routine not found';
  END IF;

  DELETE FROM routine_exercises WHERE routine_id = p_routine_id;

  IF p_exercises IS NOT NULL
     AND jsonb_typeof(p_exercises) = 'array'
     AND jsonb_array_length(p_exercises) > 0
  THEN
    INSERT INTO routine_exercises (
      routine_id,
      exercise_id,
      exercise_name,
      category,
      target_sets,
      order_index,
      notes,
      is_pinned
    )
    SELECT
      p_routine_id,
      CASE
        WHEN nullif(trim(e->>'exercise_id'), '') IS NOT NULL
          THEN (nullif(trim(e->>'exercise_id'), ''))::uuid
        ELSE NULL
      END,
      e->>'exercise_name',
      COALESCE(nullif(trim(e->>'category'), ''), 'other'),
      COALESCE((e->>'target_sets')::integer, 3),
      (t.ord - 1)::integer,
      NULLIF(trim(e->>'notes'), ''),
      COALESCE((e->>'is_pinned')::boolean, false)
    FROM jsonb_array_elements(p_exercises) WITH ORDINALITY AS t(e, ord);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION replace_routine_exercises(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_routine_exercises(UUID, JSONB) TO authenticated;

DROP FUNCTION IF EXISTS get_user_init_data(TEXT);

CREATE OR REPLACE FUNCTION get_user_init_data(p_today TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  RETURN (
    SELECT jsonb_build_object(
      'exercises', COALESCE(
        (SELECT jsonb_agg(to_jsonb(ex.*) ORDER BY ex.name) FROM (
          SELECT * FROM exercises
          WHERE is_predefined = true OR user_id = v_user_id
        ) ex),
        '[]'::jsonb
      ),
      'user_settings', (
        SELECT to_jsonb(us.*) FROM user_settings us WHERE us.user_id = v_user_id LIMIT 1
      ),
      'exercise_history', COALESCE(
        (SELECT jsonb_agg(to_jsonb(eh.*)) FROM exercise_history eh WHERE eh.user_id = v_user_id),
        '[]'::jsonb
      ),
      'trackables', COALESCE(
        (SELECT jsonb_agg(to_jsonb(t.*) ORDER BY t.order_index) FROM (
          SELECT * FROM trackables WHERE user_id = v_user_id
        ) t),
        '[]'::jsonb
      ),
      'today_entries', COALESCE(
        (SELECT jsonb_agg(to_jsonb(te.*)) FROM tracking_entries te
          WHERE te.user_id = v_user_id AND te.date = p_today::date),
        '[]'::jsonb
      ),
      'food_items', COALESCE(
        (SELECT jsonb_agg(to_jsonb(fi.*) ORDER BY fi.order_index) FROM (
          SELECT * FROM food_items WHERE user_id = v_user_id
        ) fi),
        '[]'::jsonb
      ),
      'today_food_entries', COALESCE(
        (SELECT jsonb_agg(to_jsonb(fe.*)) FROM food_entries fe
          WHERE fe.user_id = v_user_id AND fe.date = p_today::date),
        '[]'::jsonb
      ),
      'routines', COALESCE(
        (SELECT jsonb_agg(
          to_jsonb(wr.*) || jsonb_build_object(
            'routine_exercises', COALESCE(
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', re.id,
                  'exercise_id', re.exercise_id,
                  'exercise_name', re.exercise_name,
                  'category', re.category,
                  'target_sets', re.target_sets,
                  'order_index', re.order_index,
                  'notes', re.notes,
                  'is_pinned', COALESCE(re.is_pinned, false)
                ) ORDER BY COALESCE(re.is_pinned, false) DESC, re.order_index
              ) FROM routine_exercises re WHERE re.routine_id = wr.id),
              '[]'::jsonb
            )
          )
          ORDER BY wr.created_at DESC
        ) FROM workout_routines wr WHERE wr.user_id = v_user_id),
        '[]'::jsonb
      ),
      'active_session', (
        SELECT to_jsonb(ws.*) || jsonb_build_object(
          'set_logs', COALESCE(
            (SELECT jsonb_agg(to_jsonb(sl.*)) FROM set_logs sl WHERE sl.session_id = ws.id),
            '[]'::jsonb
          )
        ) FROM workout_sessions ws
        WHERE ws.user_id = v_user_id
          AND ws.date = p_today::date
          AND ws.status = 'active'
        LIMIT 1
      ),
      'event_types', COALESCE(
        (SELECT jsonb_agg(
          to_jsonb(et.*) || jsonb_build_object(
            'event_logs', COALESCE(
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', el.id,
                  'date', el.date,
                  'notes', el.notes,
                  'cost', el.cost,
                  'created_at', el.created_at
                )
              ) FROM event_logs el WHERE el.event_type_id = et.id),
              '[]'::jsonb
            )
          )
          ORDER BY et.order_index
        ) FROM event_types et WHERE et.user_id = v_user_id),
        '[]'::jsonb
      ),
      'step_cards', COALESCE(
        (SELECT jsonb_agg(
          to_jsonb(sc.*) || jsonb_build_object(
            'step_items', COALESCE(
              (SELECT jsonb_agg(
                jsonb_build_object(
                  'id', si.id,
                  'text', si.text,
                  'order_index', si.order_index,
                  'created_at', si.created_at
                ) ORDER BY si.order_index
              ) FROM step_items si WHERE si.card_id = sc.id),
              '[]'::jsonb
            )
          )
          ORDER BY sc.order_index
        ) FROM step_cards sc WHERE sc.user_id = v_user_id),
        '[]'::jsonb
      ),
      'notification_schedules', COALESCE(
        (SELECT jsonb_agg(to_jsonb(ns.*) ORDER BY ns.created_at)
          FROM notification_schedules ns WHERE ns.user_id = v_user_id),
        '[]'::jsonb
      )
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION get_user_init_data(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_user_init_data(TEXT) TO authenticated;
