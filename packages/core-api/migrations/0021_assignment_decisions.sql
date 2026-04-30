CREATE TABLE assignment_decisions (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  operator_user_id UUID NOT NULL,
  country_code CHAR(2) NOT NULL,
  decision TEXT NOT NULL,
  anchor_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT assignment_decisions_decision_check CHECK (decision IN ('assigned'))
);

CREATE INDEX assignment_decisions_subscription_idx ON assignment_decisions(subscription_id, created_at);
CREATE INDEX assignment_decisions_worker_idx ON assignment_decisions(worker_id, created_at);
