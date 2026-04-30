ALTER TABLE notification_messages
  ADD COLUMN provider TEXT,
  ADD COLUMN provider_reference TEXT,
  ADD COLUMN attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  ADD COLUMN last_attempt_at TIMESTAMPTZ;

CREATE INDEX notification_messages_due_delivery_idx
  ON notification_messages(country_code, available_at, id)
  WHERE status = 'pending';
