ALTER TABLE subscribers
  ADD COLUMN phone_number_lookup_hash TEXT,
  ADD COLUMN email_lookup_hash TEXT;

CREATE UNIQUE INDEX subscribers_country_phone_lookup_hash_idx
  ON subscribers(country_code, phone_number_lookup_hash)
  WHERE phone_number_lookup_hash IS NOT NULL;

CREATE INDEX subscribers_country_email_lookup_hash_idx
  ON subscribers(country_code, email_lookup_hash)
  WHERE email_lookup_hash IS NOT NULL;

ALTER TABLE auth_users
  ADD COLUMN phone_number_lookup_hash TEXT;

CREATE UNIQUE INDEX auth_users_country_phone_lookup_hash_idx
  ON auth_users(country_code, phone_number_lookup_hash)
  WHERE phone_number_lookup_hash IS NOT NULL;

ALTER TABLE auth_otp_challenges
  ADD COLUMN phone_number_lookup_hash TEXT;

CREATE INDEX auth_otp_challenges_phone_lookup_hash_idx
  ON auth_otp_challenges(country_code, phone_number_lookup_hash, created_at);

ALTER TABLE worker_onboarding_cases
  ADD COLUMN phone_number_lookup_hash TEXT;

CREATE INDEX worker_onboarding_cases_phone_lookup_hash_idx
  ON worker_onboarding_cases(country_code, phone_number_lookup_hash);

ALTER TABLE subscriber_addresses
  ADD COLUMN gps_latitude_ciphertext TEXT,
  ADD COLUMN gps_longitude_ciphertext TEXT;

ALTER TABLE visits
  ADD COLUMN check_in_latitude_ciphertext TEXT,
  ADD COLUMN check_in_longitude_ciphertext TEXT,
  ADD COLUMN check_out_latitude_ciphertext TEXT,
  ADD COLUMN check_out_longitude_ciphertext TEXT;

ALTER TABLE subscriptions
  ADD COLUMN payment_method_phone_number_lookup_hash TEXT,
  DROP CONSTRAINT subscriptions_payment_method_check,
  ADD CONSTRAINT subscriptions_payment_method_check CHECK (
    (
      payment_method_provider IS NULL
      AND payment_method_phone_number IS NULL
    )
    OR (
      payment_method_provider IN ('flooz', 'mixx')
      AND payment_method_phone_number IS NOT NULL
    )
  );

CREATE INDEX subscriptions_payment_method_phone_lookup_hash_idx
  ON subscriptions(country_code, payment_method_phone_number_lookup_hash)
  WHERE payment_method_phone_number_lookup_hash IS NOT NULL;

ALTER TABLE push_device_tokens
  ADD COLUMN device_id_lookup_hash TEXT;

CREATE UNIQUE INDEX push_device_tokens_user_device_lookup_hash_idx
  ON push_device_tokens(user_id, device_id_lookup_hash)
  WHERE device_id_lookup_hash IS NOT NULL;

ALTER TABLE support_contacts
  DROP CONSTRAINT support_contacts_subject_length,
  DROP CONSTRAINT support_contacts_body_length;
