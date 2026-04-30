ALTER TABLE worker_payouts
  DROP CONSTRAINT worker_payouts_provider_check;

ALTER TABLE worker_payouts
  ADD CONSTRAINT worker_payouts_provider_check CHECK (
    provider IN ('manual', 'mobile_money_http')
  );
