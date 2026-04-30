CREATE TABLE worker_swap_requests (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id),
  country_code CHAR(2) NOT NULL,
  current_worker_id UUID NOT NULL REFERENCES workers(id),
  replacement_worker_id UUID REFERENCES workers(id),
  status TEXT NOT NULL,
  reason TEXT NOT NULL,
  resolved_by_operator_user_id UUID,
  resolution_note TEXT,
  requested_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT worker_swap_requests_status_check CHECK (
    status IN ('approved', 'declined', 'open')
  )
);

CREATE INDEX worker_swap_requests_status_requested_idx
  ON worker_swap_requests(status, requested_at DESC);

CREATE INDEX worker_swap_requests_subscription_requested_idx
  ON worker_swap_requests(subscription_id, requested_at DESC);

CREATE UNIQUE INDEX worker_swap_requests_one_open_per_subscription_idx
  ON worker_swap_requests(subscription_id)
  WHERE status = 'open';
