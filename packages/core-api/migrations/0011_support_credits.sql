CREATE TABLE support_credits (
  id UUID PRIMARY KEY,
  dispute_id UUID NOT NULL UNIQUE REFERENCES support_disputes(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  reason TEXT NOT NULL,
  issued_by_operator_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT support_credits_amount_positive_check CHECK (amount_minor > 0)
);

CREATE INDEX support_credits_subscription_created_idx ON support_credits(subscription_id, created_at DESC);
