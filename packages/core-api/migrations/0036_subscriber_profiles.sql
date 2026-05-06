ALTER TABLE subscribers
  ADD COLUMN first_name TEXT,
  ADD COLUMN last_name TEXT,
  ADD COLUMN email TEXT,
  ADD COLUMN avatar_object_key TEXT,
  ADD COLUMN is_adult_confirmed BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX subscribers_profile_email_idx
  ON subscribers(country_code, email)
  WHERE email IS NOT NULL;
