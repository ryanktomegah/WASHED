CREATE TABLE support_disputes (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  visit_id UUID NOT NULL REFERENCES visits(id),
  country_code CHAR(2) NOT NULL,
  issue_type TEXT NOT NULL,
  status TEXT NOT NULL,
  description TEXT NOT NULL,
  opened_by_user_id UUID NOT NULL,
  resolved_by_operator_user_id UUID,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_disputes_issue_type_check CHECK (
    issue_type IN ('damaged_item', 'missing_item', 'other', 'worker_no_show')
  ),
  CONSTRAINT support_disputes_status_check CHECK (
    status IN ('open', 'resolved_for_subscriber', 'resolved_for_worker', 'escalated')
  )
);

CREATE INDEX support_disputes_status_created_idx ON support_disputes(status, created_at DESC);
CREATE INDEX support_disputes_subscription_idx ON support_disputes(subscription_id, created_at DESC);
CREATE INDEX support_disputes_visit_idx ON support_disputes(visit_id);
