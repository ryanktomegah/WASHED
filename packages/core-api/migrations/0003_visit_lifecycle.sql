ALTER TABLE visits
  ADD COLUMN check_in_at TIMESTAMPTZ,
  ADD COLUMN check_in_latitude NUMERIC(9, 6),
  ADD COLUMN check_in_longitude NUMERIC(9, 6),
  ADD COLUMN check_out_at TIMESTAMPTZ,
  ADD COLUMN check_out_latitude NUMERIC(9, 6),
  ADD COLUMN check_out_longitude NUMERIC(9, 6);

CREATE TABLE worker_earning_ledger (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  country_code CHAR(2) NOT NULL,
  amount_minor BIGINT NOT NULL,
  currency_code CHAR(3) NOT NULL,
  reason TEXT NOT NULL,
  source_event_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT worker_earning_ledger_reason_check CHECK (
    reason IN ('completed_visit_bonus')
  ),
  UNIQUE (visit_id, reason)
);

CREATE INDEX worker_earning_ledger_worker_idx ON worker_earning_ledger(worker_id, created_at);

