CREATE TABLE push_device_tokens (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  user_id UUID NOT NULL REFERENCES auth_users(id),
  role TEXT NOT NULL CHECK (role IN ('operator', 'subscriber', 'worker')),
  app TEXT NOT NULL CHECK (app IN ('operator', 'subscriber', 'worker')),
  platform TEXT NOT NULL CHECK (platform IN ('android', 'ios')),
  environment TEXT NOT NULL CHECK (environment IN ('development', 'production', 'simulator')),
  device_id TEXT NOT NULL,
  token TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked')),
  last_registered_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, device_id)
);

CREATE INDEX push_device_tokens_user_idx
  ON push_device_tokens(user_id, status);

CREATE INDEX push_device_tokens_country_role_idx
  ON push_device_tokens(country_code, role, status);
