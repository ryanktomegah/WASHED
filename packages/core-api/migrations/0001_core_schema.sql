CREATE TABLE subscribers (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  locale TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (country_code, phone_number)
);

CREATE TABLE subscriber_addresses (
  id UUID PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id),
  country_code CHAR(2) NOT NULL,
  neighborhood TEXT NOT NULL,
  landmark TEXT NOT NULL,
  gps_latitude NUMERIC(9, 6) NOT NULL,
  gps_longitude NUMERIC(9, 6) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  subscriber_id UUID NOT NULL REFERENCES subscribers(id),
  address_id UUID NOT NULL REFERENCES subscriber_addresses(id),
  country_code CHAR(2) NOT NULL,
  currency_code CHAR(3) NOT NULL,
  tier_code TEXT NOT NULL,
  status TEXT NOT NULL,
  visits_per_cycle INTEGER NOT NULL,
  monthly_price_minor BIGINT NOT NULL,
  preferred_day_of_week TEXT NOT NULL,
  preferred_time_window TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriptions_status_check CHECK (
    status IN ('pending_match', 'active', 'payment_overdue', 'paused', 'cancelled')
  ),
  CONSTRAINT subscriptions_tier_check CHECK (tier_code IN ('T1', 'T2'))
);

CREATE TABLE visits (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  status TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  scheduled_time_window TEXT NOT NULL,
  worker_id UUID,
  completed_at TIMESTAMPTZ,
  rating_status TEXT NOT NULL DEFAULT 'not_requested',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT visits_status_check CHECK (
    status IN ('scheduled', 'in_progress', 'completed', 'disputed', 'cancelled', 'no_show')
  ),
  CONSTRAINT visits_rating_status_check CHECK (
    rating_status IN ('not_requested', 'requested', 'rated', 'expired_unrated')
  )
);

CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_role TEXT NOT NULL,
  actor_user_id UUID,
  trace_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ
);

CREATE INDEX subscribers_country_idx ON subscribers(country_code);
CREATE INDEX subscriber_addresses_subscriber_idx ON subscriber_addresses(subscriber_id);
CREATE INDEX subscriptions_country_status_idx ON subscriptions(country_code, status);
CREATE INDEX visits_subscription_idx ON visits(subscription_id);
CREATE INDEX outbox_events_unpublished_idx ON outbox_events(occurred_at) WHERE published_at IS NULL;

