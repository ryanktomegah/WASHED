CREATE TABLE worker_issue_reports (
  id UUID PRIMARY KEY,
  visit_id UUID NOT NULL REFERENCES visits(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  worker_id UUID NOT NULL REFERENCES workers(id),
  country_code CHAR(2) NOT NULL,
  issue_type TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  CONSTRAINT worker_issue_reports_issue_type_check CHECK (
    issue_type IN ('access_issue', 'client_unavailable', 'other', 'safety_concern', 'supplies_missing')
  ),
  CONSTRAINT worker_issue_reports_status_check CHECK (
    status IN ('acknowledged', 'open', 'resolved')
  )
);

CREATE INDEX worker_issue_reports_status_created_idx ON worker_issue_reports(status, created_at DESC);
CREATE INDEX worker_issue_reports_visit_idx ON worker_issue_reports(visit_id, created_at DESC);
CREATE INDEX worker_issue_reports_worker_idx ON worker_issue_reports(worker_id, created_at DESC);
