ALTER TABLE worker_payouts
  ADD COLUMN failure_reason TEXT;

ALTER TABLE worker_payouts
  DROP CONSTRAINT worker_payouts_status_check;

ALTER TABLE worker_payouts
  ADD CONSTRAINT worker_payouts_status_check CHECK (
    status IN ('paid', 'failed')
  );

ALTER TABLE worker_payouts
  ADD CONSTRAINT worker_payouts_failure_reason_check CHECK (
    (status = 'failed' AND failure_reason IS NOT NULL)
    OR (status = 'paid' AND failure_reason IS NULL)
  );
