CREATE UNIQUE INDEX payment_attempts_provider_reference_idx
  ON payment_attempts(provider, provider_reference);
