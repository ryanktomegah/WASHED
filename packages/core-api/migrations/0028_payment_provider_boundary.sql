ALTER TABLE payment_attempts
  DROP CONSTRAINT payment_attempts_provider_check;

ALTER TABLE payment_attempts
  ADD CONSTRAINT payment_attempts_provider_check CHECK (
    provider IN ('mobile_money_http', 'mock')
  );
