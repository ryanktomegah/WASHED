CREATE TABLE IF NOT EXISTS worker_advance_requests (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  country_code CHAR(2) NOT NULL,
  month TEXT NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  resolved_by_operator_user_id UUID,
  resolution_note TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (country_code = 'TG'),
  CHECK (currency_code = 'XOF'),
  CHECK (month ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  CHECK (amount_minor > 0),
  CHECK (status IN ('approved', 'declined', 'open'))
);

CREATE UNIQUE INDEX IF NOT EXISTS worker_advance_requests_worker_month_idx
  ON worker_advance_requests(worker_id, month);

CREATE INDEX IF NOT EXISTS worker_advance_requests_status_requested_idx
  ON worker_advance_requests(status, requested_at DESC);
