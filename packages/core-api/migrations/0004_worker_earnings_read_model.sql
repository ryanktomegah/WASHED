CREATE INDEX visits_worker_completed_at_idx
  ON visits(worker_id, completed_at)
  WHERE completed_at IS NOT NULL;
