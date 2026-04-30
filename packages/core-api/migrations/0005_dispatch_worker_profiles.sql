ALTER TABLE workers
  ADD COLUMN service_neighborhoods TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN max_active_subscriptions INTEGER NOT NULL DEFAULT 12,
  ADD CONSTRAINT workers_max_active_subscriptions_check CHECK (
    max_active_subscriptions BETWEEN 1 AND 100
  );

CREATE INDEX workers_service_neighborhoods_idx ON workers USING GIN(service_neighborhoods);
