CREATE TABLE subscriber_address_change_requests (
  id UUID PRIMARY KEY,
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending_review',
  address_neighborhood TEXT NOT NULL,
  address_landmark TEXT NOT NULL,
  gps_latitude_ciphertext TEXT NOT NULL,
  gps_longitude_ciphertext TEXT NOT NULL,
  requested_by_user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL,
  reviewed_by_operator_user_id UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT subscriber_address_change_requests_status_check CHECK (
    status IN ('pending_review', 'approved', 'declined')
  )
);

CREATE INDEX subscriber_address_change_requests_subscription_idx
  ON subscriber_address_change_requests(subscription_id, requested_at DESC);

CREATE TABLE subscriber_notification_preferences (
  subscription_id UUID PRIMARY KEY REFERENCES subscriptions(id),
  subscriber_id UUID NOT NULL REFERENCES subscribers(id),
  country_code CHAR(2) NOT NULL,
  sms_reminder BOOLEAN NOT NULL DEFAULT true,
  push_route BOOLEAN NOT NULL DEFAULT true,
  push_reveal BOOLEAN NOT NULL DEFAULT true,
  email_recap BOOLEAN NOT NULL DEFAULT true,
  updated_by_user_id UUID NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX subscriber_notification_preferences_subscriber_idx
  ON subscriber_notification_preferences(subscriber_id);

CREATE TABLE support_contact_messages (
  id UUID PRIMARY KEY,
  contact_id UUID NOT NULL REFERENCES support_contacts(id),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id),
  country_code CHAR(2) NOT NULL,
  author_role TEXT NOT NULL,
  author_user_id UUID NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CONSTRAINT support_contact_messages_author_role_check CHECK (
    author_role IN ('operator', 'subscriber')
  )
);

CREATE INDEX support_contact_messages_contact_idx
  ON support_contact_messages(contact_id, created_at ASC);
