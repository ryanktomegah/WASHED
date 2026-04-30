CREATE TABLE IF NOT EXISTS worker_onboarding_cases (
  id UUID PRIMARY KEY,
  worker_id UUID NOT NULL UNIQUE REFERENCES workers(id),
  country_code CHAR(2) NOT NULL,
  phone_number TEXT NOT NULL,
  stage TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  CHECK (country_code = 'TG'),
  CHECK (
    stage IN (
      'activated',
      'application_received',
      'casier_received',
      'cni_uploaded',
      'references_called',
      'rejected',
      'training_scheduled',
      'uniform_issued'
    )
  )
);

CREATE TABLE IF NOT EXISTS worker_onboarding_notes (
  id UUID PRIMARY KEY,
  case_id UUID NOT NULL REFERENCES worker_onboarding_cases(id),
  stage TEXT NOT NULL,
  note TEXT NOT NULL,
  operator_user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  CHECK (
    stage IN (
      'activated',
      'application_received',
      'casier_received',
      'cni_uploaded',
      'references_called',
      'rejected',
      'training_scheduled',
      'uniform_issued'
    )
  )
);

CREATE INDEX IF NOT EXISTS worker_onboarding_cases_stage_updated_idx
  ON worker_onboarding_cases(stage, updated_at DESC);

CREATE INDEX IF NOT EXISTS worker_onboarding_notes_case_created_idx
  ON worker_onboarding_notes(case_id, created_at ASC);
