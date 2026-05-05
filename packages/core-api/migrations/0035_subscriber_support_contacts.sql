CREATE TABLE support_contacts (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  opened_by_user_id UUID NOT NULL,
  resolved_by_operator_user_id UUID,
  resolution_note TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  resolved_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT support_contacts_category_check CHECK (
    category IN ('visit', 'plan', 'payment', 'worker', 'other')
  ),
  CONSTRAINT support_contacts_status_check CHECK (
    status IN ('open', 'resolved')
  ),
  CONSTRAINT support_contacts_subject_length CHECK (char_length(subject) BETWEEN 1 AND 120),
  CONSTRAINT support_contacts_body_length CHECK (char_length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX support_contacts_subscription_idx ON support_contacts(subscription_id, created_at DESC);
CREATE INDEX support_contacts_status_idx ON support_contacts(status, created_at DESC);
