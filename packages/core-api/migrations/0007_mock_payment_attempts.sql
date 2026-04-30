CREATE TABLE payment_attempts (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  amount_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT NOT NULL,
  idempotency_key TEXT NOT NULL UNIQUE,
  charged_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_attempts_status_check CHECK (
    status IN ('succeeded', 'failed')
  ),
  CONSTRAINT payment_attempts_provider_check CHECK (
    provider IN ('mock')
  )
);

CREATE INDEX payment_attempts_subscription_idx
  ON payment_attempts(subscription_id, charged_at);
