ALTER TABLE subscriptions
  ADD COLUMN payment_method_provider text,
  ADD COLUMN payment_method_phone_number text,
  ADD CONSTRAINT subscriptions_payment_method_check CHECK (
    (
      payment_method_provider IS NULL
      AND payment_method_phone_number IS NULL
    )
    OR (
      payment_method_provider IN ('flooz', 'mixx')
      AND payment_method_phone_number ~ '^\+[1-9][0-9]{7,14}$'
    )
  );

CREATE INDEX subscriptions_payment_method_provider_idx
  ON subscriptions(country_code, payment_method_provider)
  WHERE payment_method_provider IS NOT NULL;
