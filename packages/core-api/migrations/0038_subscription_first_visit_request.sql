ALTER TABLE subscriptions
  ALTER COLUMN preferred_day_of_week DROP NOT NULL,
  ALTER COLUMN preferred_time_window DROP NOT NULL,
  DROP CONSTRAINT subscriptions_status_check,
  ADD CONSTRAINT subscriptions_status_check CHECK (
    status IN (
      'ready_no_visit',
      'pending_match',
      'active',
      'payment_overdue',
      'paused',
      'cancelled'
    )
  ),
  ADD CONSTRAINT subscriptions_first_visit_preference_check CHECK (
    (
      status IN ('ready_no_visit', 'cancelled')
      AND preferred_day_of_week IS NULL
      AND preferred_time_window IS NULL
    )
    OR (
      status <> 'ready_no_visit'
      AND preferred_day_of_week IS NOT NULL
      AND preferred_time_window IS NOT NULL
    )
  );

CREATE INDEX subscriptions_subscriber_current_idx
  ON subscriptions(subscriber_id, created_at DESC)
  WHERE status <> 'cancelled';
