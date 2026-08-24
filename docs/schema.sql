CREATE EXTENSION IF NOT EXISTS btree_gist;

CREATE TYPE user_role AS ENUM ('patient', 'doctor', 'admin');
CREATE TYPE appointment_status AS ENUM ('held', 'confirmed', 'needs_reschedule', 'cancelled', 'completed');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role user_role NOT NULL,
  full_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE doctor_profiles (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  specialty TEXT NOT NULL,
  slot_minutes INTEGER NOT NULL CHECK (slot_minutes BETWEEN 10 AND 180),
  timezone TEXT NOT NULL DEFAULT 'UTC'
);

CREATE TABLE doctor_availability (
  id BIGSERIAL PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id),
  weekday SMALLINT NOT NULL CHECK (weekday BETWEEN 0 AND 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL CHECK (end_time > start_time)
);

CREATE TABLE doctor_leave (
  id BIGSERIAL PRIMARY KEY,
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id),
  leave_date DATE NOT NULL,
  reason TEXT,
  UNIQUE (doctor_id, leave_date)
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id UUID NOT NULL REFERENCES doctor_profiles(user_id),
  patient_id UUID NOT NULL REFERENCES users(id),
  starts_at TIMESTAMPTZ NOT NULL,
  ends_at TIMESTAMPTZ NOT NULL,
  slot_range TSTZRANGE GENERATED ALWAYS AS (tstzrange(starts_at, ends_at, '[)')) STORED,
  status appointment_status NOT NULL DEFAULT 'held',
  hold_expires_at TIMESTAMPTZ,
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  EXCLUDE USING gist (doctor_id WITH =, slot_range WITH &&)
    WHERE (status IN ('held', 'confirmed', 'needs_reschedule'))
);

CREATE TABLE symptom_intakes (
  appointment_id UUID PRIMARY KEY REFERENCES appointments(id),
  symptoms TEXT NOT NULL,
  urgency TEXT,
  chief_complaint TEXT,
  suggested_questions JSONB,
  raw_output JSONB,
  model_version TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE clinical_notes (
  appointment_id UUID PRIMARY KEY REFERENCES appointments(id),
  notes TEXT NOT NULL,
  patient_summary JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE prescriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id),
  medication TEXT NOT NULL,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  starts_on DATE,
  ends_on DATE,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'calendar', 'sms')),
  event_type TEXT NOT NULL,
  recipient TEXT NOT NULL,
  idempotency_key TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  attempts INTEGER NOT NULL DEFAULT 0,
  next_attempt_at TIMESTAMPTZ,
  provider_id TEXT,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE calendar_connections (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  provider TEXT NOT NULL DEFAULT 'google',
  encrypted_refresh_token BYTEA NOT NULL,
  calendar_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX appointments_doctor_time_idx ON appointments (doctor_id, starts_at);
CREATE INDEX notifications_retry_idx ON notifications (status, next_attempt_at);
