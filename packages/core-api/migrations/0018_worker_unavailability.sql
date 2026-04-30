CREATE TABLE IF NOT EXISTS worker_unavailability (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL REFERENCES workers(id),
  unavailable_date DATE NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (worker_id, unavailable_date)
);

CREATE INDEX IF NOT EXISTS worker_unavailability_worker_date_idx
  ON worker_unavailability(worker_id, unavailable_date);
