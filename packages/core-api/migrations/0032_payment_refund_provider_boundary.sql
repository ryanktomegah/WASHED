ALTER TABLE payment_refunds
  DROP CONSTRAINT payment_refunds_provider_check;

ALTER TABLE payment_refunds
  ADD CONSTRAINT payment_refunds_provider_check CHECK (
    provider IN ('manual', 'mobile_money_http')
  );
