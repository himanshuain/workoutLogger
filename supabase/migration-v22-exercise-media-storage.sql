-- App uploads live in bucket `workoutlogger` (public read).
-- Exercise GIFs: workoutlogger/exercise-media/{user_id}/*.gif

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'workoutlogger',
  'workoutlogger',
  true,
  8388608,
  ARRAY['image/gif']::text[]
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS workoutlogger_exercise_media_insert ON storage.objects;
CREATE POLICY workoutlogger_exercise_media_insert
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'workoutlogger'
  AND (storage.foldername(name))[1] = 'exercise-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS workoutlogger_public_read ON storage.objects;
CREATE POLICY workoutlogger_public_read
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'workoutlogger');

DROP POLICY IF EXISTS workoutlogger_exercise_media_update ON storage.objects;
CREATE POLICY workoutlogger_exercise_media_update
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'workoutlogger'
  AND (storage.foldername(name))[1] = 'exercise-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);

DROP POLICY IF EXISTS workoutlogger_exercise_media_delete ON storage.objects;
CREATE POLICY workoutlogger_exercise_media_delete
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'workoutlogger'
  AND (storage.foldername(name))[1] = 'exercise-media'
  AND (storage.foldername(name))[2] = auth.uid()::text
);
