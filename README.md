# Carepath Clinic Manager

A calm, role-aware healthcare appointment workspace for patients, doctors, and clinic admins. The included UI is a runnable demo with local state; `server/index.js` is an executable API reference for the booking reliability rules.

## Run locally

Requirements: Node.js 20+.

```bash
npm install
npm run dev
```

Open the Vite URL shown in the terminal. The role switcher in the top-right lets you inspect Patient, Doctor, and Admin portals. The booking flow captures symptoms and confirms a slot with a success notification.

Run the API separately with `npm run server`; health check: `GET http://localhost:4000/api/health`.

Copy `.env.example` to `.env` for production integrations. The demo intentionally keeps frontend data in memory so it can be reviewed without credentials or a database.

## API

- `GET /api/doctors?specialty=Cardiology` searches available doctors.
- `POST /api/appointments/hold` accepts `{ doctorId, patientId, startsAt }`. Holds last five minutes.
- `POST /api/appointments/confirm` accepts `{ holdId, symptoms }`, creates the appointment, and returns a fallback-safe pre-visit summary.
- `POST /api/doctors/:id/leave` accepts `{ date }`, records leave, and returns affected bookings plus notification count.
- `POST /api/appointments/:id/complete` accepts `{ notes, prescription }` and returns a patient-friendly post-visit summary.

A production adapter should add JWT middleware and replace the in-memory maps with the schema below. All clients should treat `409` as a recoverable slot conflict and refresh availability.

## Database schema

See `docs/schema.sql`. Important constraints are the exclusion constraint on doctor/time ranges, a unique active hold per doctor/time, and an idempotency key for webhook and notification retries.

Core tables: `users`, `doctor_profiles`, `doctor_availability`, `doctor_leave`, `appointments`, `symptom_intakes`, `clinical_notes`, `prescriptions`, `notifications`, and `calendar_connections`.

## LLM prompts

### Pre-visit

System: `You are a clinical documentation assistant. Summarize patient-reported symptoms without diagnosing. Return strict JSON only: urgency (Low, Medium, or High), chiefComplaint, and suggestedQuestions (exactly three strings). Escalate urgency only for symptoms that may need prompt clinical review. Include a disclaimer that a clinician must make medical decisions.`

User: `Symptoms: {{symptoms}}. Appointment type: {{appointmentType}}.`

### Post-visit

System: `You are a patient education assistant. Convert clinician notes into plain, warm language without adding facts or changing dosage. Return strict JSON only: summary, medicationSchedule, followUp, and warningSigns. Keep medicationSchedule tied exactly to the prescription. Remind the patient to contact the clinic with questions.`

User: `Clinical notes: {{notes}}. Prescription: {{prescription}}.`

LLM output is stored with model/version metadata. On timeout, malformed JSON, rate limit, or provider outage, the appointment still completes: the API stores a safe template fallback and queues a retry for staff review.

## Email and Google Calendar

1. Create a SendGrid sender identity and set `SENDGRID_API_KEY`.
2. Create a Google Cloud project, enable Google Calendar API, configure OAuth consent screen, and create a Web application OAuth client.
3. Add `http://localhost:4000/api/calendar/callback` (and the deployed callback) to authorized redirect URIs.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, and `GOOGLE_REDIRECT_URI`.
5. Request `https://www.googleapis.com/auth/calendar.events` during consent. Encrypt refresh tokens at rest.

Booking sends one email to the patient and doctor and creates two attendees on one calendar event. Reschedule updates the event; cancellation deletes it. Email and calendar operations are queue jobs with exponential retry, a dead-letter state, and an admin-visible failure record. They never roll back a successfully committed appointment.

## System design

**Double booking.** Availability is calculated from recurring working hours minus leave and existing appointments. The client may request a five-minute hold for a candidate slot, but the server is authoritative. In production, confirmation runs in a database transaction at `SERIALIZABLE` isolation and inserts a time range protected by a PostgreSQL exclusion constraint (`doctor_id WITH =`, `tstzrange WITH &&`). A unique active-hold index prevents two holds for the same doctor and start time. One request commits; the other receives `409 SLOT_UNAVAILABLE`. A hold has a TTL and is released by expiry or confirmation.

**Leave conflicts.** Admin leave creation is transactional. It first locks the doctor row, records the date, and queries overlapping confirmed or held appointments. Existing appointments are not silently deleted: they move to `needs_reschedule`, and one notification job is enqueued for each patient and doctor. Patients receive replacement slots; staff can bulk reschedule. A booking transaction checks leave again, so a race between leave creation and booking cannot create a new conflict.

**Notification reliability.** Appointment state is committed before side effects. An outbox row is written in the same transaction, then a worker sends email and calendar commands. Each job has an idempotency key, exponential backoff, a maximum retry count, and a dead-letter status. Calendar event IDs are stored per participant connection, making update and delete operations repeatable. Admins see delivery state and can retry failed jobs. Medication reminders are scheduled from prescription frequency and are suppressed when a prescription is discontinued.

**LLM and privacy.** Prompts contain only the minimum clinical context needed. Outputs are validated against a JSON schema and stored separately from the source notes. Failures fall back to a non-diagnostic template and never block booking or visit completion. Production deployment should enforce encryption at rest, audit logs, consent, retention rules, and least-privilege role middleware.

## Packaging

Create a source archive from the project root with:

```powershell
Compress-Archive -Path .\* -DestinationPath .\carepath-clinic-manager.zip -Force
```
