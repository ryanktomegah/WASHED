ALTER TABLE visits
  ADD COLUMN IF NOT EXISTS fallback_code CHAR(4),
  ADD COLUMN IF NOT EXISTS check_in_verification_method TEXT,
  ADD COLUMN IF NOT EXISTS check_out_verification_method TEXT,
  ADD CONSTRAINT visits_fallback_code_check CHECK (
    fallback_code IS NULL OR fallback_code ~ '^[0-9]{4}$'
  ),
  ADD CONSTRAINT visits_check_in_verification_method_check CHECK (
    check_in_verification_method IS NULL OR check_in_verification_method IN ('fallback_code', 'gps')
  ),
  ADD CONSTRAINT visits_check_out_verification_method_check CHECK (
    check_out_verification_method IS NULL OR check_out_verification_method IN ('fallback_code', 'gps')
  );
