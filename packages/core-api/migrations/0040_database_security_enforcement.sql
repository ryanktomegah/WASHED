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
    EXECUTE format('ALTER TABLE %I FORCE ROW LEVEL SECURITY', table_name);
  END LOOP;
END $$;
