ALTER TABLE payment_attempts
  ADD COLUMN country_code CHAR(2);

UPDATE payment_attempts payment_attempt
SET country_code = subscription.country_code
FROM subscriptions subscription
WHERE subscription.id = payment_attempt.subscription_id;

ALTER TABLE payment_attempts
  ALTER COLUMN country_code SET NOT NULL;

CREATE INDEX payment_attempts_country_charged_idx
  ON payment_attempts(country_code, charged_at DESC);

ALTER TABLE auth_sessions
  ADD COLUMN country_code CHAR(2);

UPDATE auth_sessions session
SET country_code = auth_user.country_code
FROM auth_users auth_user
WHERE auth_user.id = session.user_id;

ALTER TABLE auth_sessions
  ALTER COLUMN country_code SET NOT NULL;

CREATE INDEX auth_sessions_country_active_idx
  ON auth_sessions(country_code, expires_at)
  WHERE revoked_at IS NULL;

ALTER TABLE worker_onboarding_notes
  ADD COLUMN country_code CHAR(2);

UPDATE worker_onboarding_notes note
SET country_code = onboarding.country_code
FROM worker_onboarding_cases onboarding
WHERE onboarding.id = note.case_id;

ALTER TABLE worker_onboarding_notes
  ALTER COLUMN country_code SET NOT NULL;

CREATE INDEX worker_onboarding_notes_country_created_idx
  ON worker_onboarding_notes(country_code, created_at DESC);

ALTER TABLE worker_unavailability
  ADD COLUMN country_code CHAR(2);

UPDATE worker_unavailability unavailable
SET country_code = worker.country_code
FROM workers worker
WHERE worker.id = unavailable.worker_id;

ALTER TABLE worker_unavailability
  ALTER COLUMN country_code SET NOT NULL;

CREATE INDEX worker_unavailability_country_date_idx
  ON worker_unavailability(country_code, unavailable_date, worker_id);

ALTER TABLE subscriber_addresses
  ADD COLUMN service_cell_key TEXT;

UPDATE subscriber_addresses
SET service_cell_key = lower(trim(neighborhood));

ALTER TABLE subscriber_addresses
  ALTER COLUMN service_cell_key SET NOT NULL;

CREATE INDEX subscriber_addresses_service_cell_idx
  ON subscriber_addresses(country_code, service_cell_key);

CREATE TABLE service_cells (
  country_code CHAR(2) NOT NULL,
  cell_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (country_code, cell_key),
  CONSTRAINT service_cells_key_check CHECK (cell_key = lower(trim(display_name))),
  CONSTRAINT service_cells_status_check CHECK (status IN ('active', 'inactive'))
);

INSERT INTO service_cells (country_code, cell_key, display_name)
SELECT
  country_code,
  lower(trim(neighborhood)) AS cell_key,
  min(trim(neighborhood)) AS display_name
FROM subscriber_addresses
GROUP BY country_code, lower(trim(neighborhood))
ON CONFLICT (country_code, cell_key) DO NOTHING;

INSERT INTO service_cells (country_code, cell_key, display_name)
SELECT
  worker.country_code,
  lower(trim(service_cell)) AS cell_key,
  min(trim(service_cell)) AS display_name
FROM workers worker
CROSS JOIN LATERAL unnest(worker.service_neighborhoods) AS service_cell
WHERE trim(service_cell) <> ''
GROUP BY worker.country_code, lower(trim(service_cell))
ON CONFLICT (country_code, cell_key) DO NOTHING;

CREATE TABLE worker_service_cells (
  worker_id UUID NOT NULL REFERENCES workers(id),
  country_code CHAR(2) NOT NULL,
  cell_key TEXT NOT NULL,
  max_active_subscriptions INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (worker_id, cell_key),
  FOREIGN KEY (country_code, cell_key) REFERENCES service_cells(country_code, cell_key),
  CONSTRAINT worker_service_cells_capacity_check CHECK (max_active_subscriptions BETWEEN 1 AND 100)
);

INSERT INTO worker_service_cells (
  worker_id,
  country_code,
  cell_key,
  max_active_subscriptions
)
SELECT
  worker.id,
  worker.country_code,
  lower(trim(service_cell)) AS cell_key,
  worker.max_active_subscriptions
FROM workers worker
CROSS JOIN LATERAL unnest(worker.service_neighborhoods) AS service_cell
WHERE trim(service_cell) <> ''
ON CONFLICT (worker_id, cell_key) DO UPDATE
SET
  country_code = EXCLUDED.country_code,
  max_active_subscriptions = EXCLUDED.max_active_subscriptions,
  updated_at = now();

CREATE INDEX worker_service_cells_country_cell_idx
  ON worker_service_cells(country_code, cell_key, worker_id);

CREATE TABLE data_retention_policies (
  country_code CHAR(2) NOT NULL,
  data_class TEXT NOT NULL,
  purpose TEXT NOT NULL,
  default_retention TEXT NOT NULL,
  deletion_rule TEXT NOT NULL,
  counsel_review_required BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (country_code, data_class)
);

INSERT INTO data_retention_policies (
  country_code,
  data_class,
  purpose,
  default_retention,
  deletion_rule
)
VALUES
  (
    'TG',
    'account_profile_and_phone',
    'Auth, support, and subscription service.',
    'Account life plus 24 months.',
    'Anonymize after account deletion unless audit or payment law requires retention.'
  ),
  (
    'TG',
    'address_gps_and_landmarks',
    'Assignment, route planning, and safety.',
    'Account life plus 12 months.',
    'Remove exact pin on deletion; keep neighborhood-level anonymized route statistics.'
  ),
  (
    'TG',
    'visit_photos',
    'Quality proof and disputes.',
    '90 days, or dispute close plus 180 days.',
    'Delete object-storage evidence after the retention window unless legal hold applies.'
  ),
  (
    'TG',
    'notification_logs',
    'Delivery debugging and support.',
    '90 days.',
    'Keep aggregate delivery metrics only after deletion.'
  ),
  (
    'TG',
    'support_disputes_and_safety',
    'Claims, escalation, and blocklists.',
    '36 months.',
    'Redact free-text personal data where possible after closure.'
  );

CREATE TABLE subscriber_privacy_requests (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id),
  country_code CHAR(2) NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'recorded',
  reason TEXT NOT NULL,
  requested_by_operator_user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  handled_by_operator_user_id UUID,
  handled_at TIMESTAMPTZ,
  handling_note TEXT,
  export_bundle JSONB NOT NULL,
  erasure_plan JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriber_privacy_requests_type_check CHECK (request_type IN ('erasure', 'export')),
  CONSTRAINT subscriber_privacy_requests_status_check CHECK (
    status IN ('recorded', 'handled')
  ),
  CONSTRAINT subscriber_privacy_requests_reason_length CHECK (
    char_length(reason) BETWEEN 1 AND 1000
  ),
  CONSTRAINT subscriber_privacy_requests_handled_check CHECK (
    (status = 'recorded' AND handled_by_operator_user_id IS NULL AND handled_at IS NULL)
    OR (status = 'handled' AND handled_by_operator_user_id IS NOT NULL AND handled_at IS NOT NULL)
  )
);

CREATE INDEX subscriber_privacy_requests_subscription_idx
  ON subscriber_privacy_requests(subscription_id, requested_at DESC);

CREATE INDEX subscriber_privacy_requests_country_status_idx
  ON subscriber_privacy_requests(country_code, status, requested_at DESC);

DO $$
DECLARE
  table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'subscribers',
    'subscriber_addresses',
    'subscriptions',
    'visits',
    'outbox_events',
    'workers',
    'worker_earning_ledger',
    'auth_users',
    'auth_otp_challenges',
    'auth_sessions',
    'payment_attempts',
    'support_disputes',
    'visit_ratings',
    'support_credits',
    'worker_issue_reports',
    'worker_swap_requests',
    'worker_advance_requests',
    'worker_payouts',
    'worker_onboarding_cases',
    'worker_onboarding_notes',
    'worker_unavailability',
    'visit_photos',
    'assignment_decisions',
    'audit_events',
    'notification_messages',
    'push_device_tokens',
    'payment_refunds',
    'payment_reconciliation_runs',
    'support_contacts',
    'service_cells',
    'worker_service_cells',
    'data_retention_policies',
    'subscriber_privacy_requests'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', table_name);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', table_name || '_country_policy', table_name);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (country_code = current_setting(''app.country_code'', true)::CHAR(2)) WITH CHECK (country_code = current_setting(''app.country_code'', true)::CHAR(2))',
      table_name || '_country_policy',
      table_name
    );
  END LOOP;
END $$;
