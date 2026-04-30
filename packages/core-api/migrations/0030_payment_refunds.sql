CREATE TABLE payment_refunds (
  id UUID PRIMARY KEY,
  payment_attempt_id UUID NOT NULL UNIQUE REFERENCES payment_attempts(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  reason TEXT NOT NULL,
  issued_by_operator_user_id UUID NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_refunds_country_check CHECK (country_code = 'TG'),
  CONSTRAINT payment_refunds_currency_check CHECK (currency_code = 'XOF'),
  CONSTRAINT payment_refunds_amount_positive_check CHECK (amount_minor > 0),
  CONSTRAINT payment_refunds_status_check CHECK (status = 'issued'),
  CONSTRAINT payment_refunds_provider_check CHECK (provider = 'manual')
);

CREATE INDEX payment_refunds_subscription_issued_idx
  ON payment_refunds(subscription_id, issued_at DESC);
