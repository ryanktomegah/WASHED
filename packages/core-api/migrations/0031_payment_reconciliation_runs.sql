CREATE TABLE payment_reconciliation_runs (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  provider TEXT,
  status TEXT NOT NULL,
  total_succeeded_attempts INTEGER NOT NULL,
  total_failed_attempts INTEGER NOT NULL,
  total_collected_minor BIGINT NOT NULL,
  total_refunded_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  issue_count INTEGER NOT NULL,
  issues JSONB NOT NULL,
  checked_by_operator_user_id UUID NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT payment_reconciliation_runs_country_check CHECK (country_code = 'TG'),
  CONSTRAINT payment_reconciliation_runs_currency_check CHECK (currency_code = 'XOF'),
  CONSTRAINT payment_reconciliation_runs_status_check CHECK (status IN ('clean', 'issues_found')),
  CONSTRAINT payment_reconciliation_runs_counts_check CHECK (
    total_succeeded_attempts >= 0
    AND total_failed_attempts >= 0
    AND total_collected_minor >= 0
    AND total_refunded_minor >= 0
    AND issue_count >= 0
  )
);

CREATE INDEX payment_reconciliation_runs_checked_idx
  ON payment_reconciliation_runs(country_code, checked_at DESC);
