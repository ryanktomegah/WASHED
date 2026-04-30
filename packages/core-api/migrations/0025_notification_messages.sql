CREATE TABLE notification_messages (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  channel TEXT NOT NULL CHECK (channel IN ('in_app', 'push', 'sms', 'whatsapp')),
  template_key TEXT NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('operator', 'subscriber', 'worker')),
  recipient_user_id UUID,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_id UUID NOT NULL REFERENCES audit_events(id),
  payload JSONB NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (
    status IN ('failed', 'pending', 'sent', 'suppressed_quiet_hours')
  ),
  available_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  failure_reason TEXT
);

CREATE INDEX notification_messages_status_available_idx
  ON notification_messages(country_code, status, available_at, created_at);

CREATE INDEX notification_messages_aggregate_idx
  ON notification_messages(aggregate_type, aggregate_id, created_at);

CREATE INDEX notification_messages_event_idx
  ON notification_messages(event_id);
