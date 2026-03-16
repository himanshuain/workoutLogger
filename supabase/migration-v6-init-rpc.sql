-- ============================================
-- Migration V6: Init RPC
-- ============================================
-- Creates get_user_init_data() - a single RPC that returns all initial
-- data the app needs in one JSONB object, combining 11 queries into one
-- round-trip for faster app load.
-- ============================================

DROP FUNCTION IF EXISTS get_user_init_data(UUID, TEXT);

CREATE FUNCTION get_user_init_data(p_user_id UUID, p_today TEXT)
RETURNS JSONB
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'exercises', COALESCE(
      (SELECT jsonb_agg(to_jsonb(ex.*) ORDER BY ex.name) FROM (
        SELECT * FROM exercises
        WHERE is_predefined = true OR user_id = p_user_id
      ) ex),
      '[]'::jsonb
    ),
    'user_settings', (
      SELECT to_jsonb(us.*) FROM user_settings us WHERE us.user_id = p_user_id LIMIT 1
    ),
    'exercise_history', COALESCE(
      (SELECT jsonb_agg(to_jsonb(eh.*)) FROM exercise_history eh WHERE eh.user_id = p_user_id),
      '[]'::jsonb
    ),
    'trackables', COALESCE(
      (SELECT jsonb_agg(to_jsonb(t.*) ORDER BY t.order_index) FROM (
        SELECT * FROM trackables WHERE user_id = p_user_id
      ) t),
      '[]'::jsonb
    ),
    'today_entries', COALESCE(
      (SELECT jsonb_agg(to_jsonb(te.*)) FROM tracking_entries te
        WHERE te.user_id = p_user_id AND te.date = p_today::date),
      '[]'::jsonb
    ),
    'food_items', COALESCE(
      (SELECT jsonb_agg(to_jsonb(fi.*) ORDER BY fi.order_index) FROM (
        SELECT * FROM food_items WHERE user_id = p_user_id
      ) fi),
      '[]'::jsonb
    ),
    'today_food_entries', COALESCE(
      (SELECT jsonb_agg(to_jsonb(fe.*)) FROM food_entries fe
        WHERE fe.user_id = p_user_id AND fe.date = p_today::date),
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
                'order_index', re.order_index
              ) ORDER BY re.order_index
            ) FROM routine_exercises re WHERE re.routine_id = wr.id),
            '[]'::jsonb
          )
        )
        ORDER BY wr.created_at DESC
      ) FROM workout_routines wr WHERE wr.user_id = p_user_id),
      '[]'::jsonb
    ),
    'active_session', (
      SELECT to_jsonb(ws.*) || jsonb_build_object(
        'set_logs', COALESCE(
          (SELECT jsonb_agg(to_jsonb(sl.*)) FROM set_logs sl WHERE sl.session_id = ws.id),
          '[]'::jsonb
        )
      ) FROM workout_sessions ws
      WHERE ws.user_id = p_user_id
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
      ) FROM event_types et WHERE et.user_id = p_user_id),
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
      ) FROM step_cards sc WHERE sc.user_id = p_user_id),
      '[]'::jsonb
    )
  );
$$;
