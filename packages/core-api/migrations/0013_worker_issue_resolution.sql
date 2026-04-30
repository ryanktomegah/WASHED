ALTER TABLE worker_issue_reports
  ADD COLUMN handled_by_operator_user_id UUID,
  ADD COLUMN resolution_note TEXT,
  ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

CREATE INDEX worker_issue_reports_worker_status_idx ON worker_issue_reports(worker_id, status, created_at DESC);
