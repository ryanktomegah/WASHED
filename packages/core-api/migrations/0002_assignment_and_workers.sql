CREATE TABLE workers (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT workers_status_check CHECK (
    status IN ('applicant', 'onboarding', 'active', 'suspended', 'inactive')
  )
);

ALTER TABLE subscriptions
  ADD COLUMN assigned_worker_id UUID REFERENCES workers(id),
  ADD COLUMN assigned_at TIMESTAMPTZ;

CREATE INDEX workers_country_status_idx ON workers(country_code, status);
CREATE INDEX subscriptions_assigned_worker_idx ON subscriptions(assigned_worker_id);

