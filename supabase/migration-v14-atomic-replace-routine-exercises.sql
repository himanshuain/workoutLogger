-- ============================================
-- Migration V14: Atomic replace for routine exercises (prevents data loss)
-- ============================================
-- Previously the app deleted all routine_exercises then inserted new rows in two
-- round-trips. If the insert failed (e.g. schema mismatch, network), exercises
-- were already deleted → empty routine.
-- This runs DELETE + INSERT in a single transaction.

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
      notes
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
      NULLIF(trim(e->>'notes'), '')
    FROM jsonb_array_elements(p_exercises) WITH ORDINALITY AS t(e, ord);
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION replace_routine_exercises(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION replace_routine_exercises(UUID, JSONB) TO authenticated;
