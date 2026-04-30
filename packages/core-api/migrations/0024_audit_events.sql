CREATE TABLE audit_events (
  id UUID PRIMARY KEY,
  country_code CHAR(2) NOT NULL,
  aggregate_type TEXT NOT NULL,
  aggregate_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  actor_role TEXT NOT NULL,
  actor_user_id UUID,
  trace_id TEXT NOT NULL,
  occurred_at TIMESTAMPTZ NOT NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX audit_events_aggregate_idx
  ON audit_events(aggregate_type, aggregate_id, occurred_at);

CREATE INDEX audit_events_event_type_time_idx
  ON audit_events(event_type, occurred_at DESC);

CREATE OR REPLACE FUNCTION prevent_audit_events_mutation()
RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'audit_events are immutable';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_events_no_update
  BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW
  EXECUTE FUNCTION prevent_audit_events_mutation();
