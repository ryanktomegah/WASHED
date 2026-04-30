CREATE TABLE IF NOT EXISTS worker_payouts (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  country_code CHAR(2) NOT NULL,
  payout_type TEXT NOT NULL,
  period_month TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  status TEXT NOT NULL,
  provider TEXT NOT NULL,
  provider_reference TEXT,
  note TEXT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL,
  created_by_operator_user_id UUID NOT NULL,
  advance_request_id UUID REFERENCES worker_advance_requests(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (country_code = 'TG'),
  CHECK (currency_code = 'XOF'),
  CHECK (payout_type IN ('advance', 'monthly_settlement')),
  CHECK (period_month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CHECK (amount_minor > 0),
  CHECK (status = 'paid'),
  CHECK (provider = 'manual')
);

CREATE UNIQUE INDEX IF NOT EXISTS worker_payouts_advance_request_idx
  ON worker_payouts(advance_request_id)
  WHERE advance_request_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS worker_payouts_worker_period_idx
  ON worker_payouts(worker_id, period_month, paid_at DESC);
