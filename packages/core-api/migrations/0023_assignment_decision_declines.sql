ALTER TABLE assignment_decisions
  DROP CONSTRAINT assignment_decisions_decision_check,
  ADD CONSTRAINT assignment_decisions_decision_check CHECK (
    decision IN ('assigned', 'rejected', 'declined')
  );
