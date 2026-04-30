CREATE TABLE auth_users (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  phone_number TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT auth_users_role_check CHECK (
    role IN ('subscriber', 'worker', 'operator')
  ),
  UNIQUE (country_code, phone_number)
);

CREATE TABLE auth_otp_challenges (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  phone_number TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE auth_sessions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth_users(id),
  refresh_token_hash TEXT NOT NULL UNIQUE,
  device_id TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX auth_otp_challenges_phone_idx
  ON auth_otp_challenges(country_code, phone_number, created_at);

CREATE INDEX auth_sessions_user_idx ON auth_sessions(user_id);
CREATE INDEX auth_sessions_active_idx
  ON auth_sessions(expires_at)
  WHERE revoked_at IS NULL;
