# Carepath Clinic Manager

> A calmer way to coordinate appointments, symptoms, and follow-up care.

Carepath is a role-aware healthcare workspace with dedicated experiences for patients, doctors, and clinic administrators. Patients can prepare for visits and book care, doctors can review pre-visit context, and admins can monitor clinic operations.

## What is included

| Workspace | Experience |
| --- | --- |
| Patient | Sign in with a name, view the next appointment, complete preparation tasks, and book a visit with symptoms and a preferred slot. |
| Doctor | Review today’s schedule, open appointment details, and launch a pre-visit review queue. |
| Admin | View clinic metrics, doctor availability, leave status, and recent activity. |

The interface includes dynamic greetings, responsive layouts, role-aware actions, appointment detail dialogs, selected-slot booking, symptom validation, and browser persistence for the signed-in demo profile.

## Quick start

**Requirements:** Node.js 20 or newer.

```bash
npm install
npm run dev
```

Open `http://localhost:5173/`. Enter a name, choose Patient, Doctor, or Admin, and sign in. The demo profile is saved in browser storage, so the name and role survive a refresh.

Run the API reference separately:

```bash
npm run server
```

Check it at `http://localhost:4000/api/health`.

## Deploy

This project can run as one Node service on Render, Railway, or a similar host:

```bash
npm install
npm run build
npm start
```

Use `npm run build` as the build command and `npm start` as the start command. Express serves the generated `dist` frontend and API from the same process. The host supplies `PORT`; local development defaults to `4000`.

Copy `.env.example` to `.env` and configure provider credentials before enabling external services. Never commit `.env` or real patient information.

## API reference

The runnable backend demonstrates the key reliability contracts:

- `GET /api/doctors?specialty=Cardiology` searches doctors.
- `POST /api/appointments/hold` creates a five-minute slot hold.
- `POST /api/appointments/confirm` confirms a hold with symptom context.
- `POST /api/doctors/:id/leave` records leave and reports affected bookings.
- `POST /api/appointments/:id/complete` stores notes and a patient-friendly fallback summary.

Full role and request details are in [docs/api.md](docs/api.md). A production adapter should add JWT authentication and replace the in-memory API maps with the PostgreSQL design in [docs/schema.sql](docs/schema.sql). Clients should treat `409` responses as recoverable slot conflicts.

## AI and notifications

The documented pre-visit prompt returns urgency, chief complaint, and three suggested questions. The post-visit prompt produces a plain-language summary, medication schedule, follow-up, and warning signs. Prompts are included in this README and should be validated against a strict JSON schema in production.

LLM failures use a safe, non-diagnostic fallback and must not block booking or visit completion. Email and Google Calendar are designed as outbox jobs with idempotency keys, retries, and dead-letter visibility. Setup steps and OAuth requirements are documented in [docs/api.md](docs/api.md) and [`.env.example`](.env.example).

## System design highlights

**Double booking:** Production confirmation uses a serializable transaction and a PostgreSQL exclusion constraint on each doctor’s time range. Five-minute holds prevent checkout races; one request succeeds and the other receives `409 SLOT_UNAVAILABLE`.

**Leave conflicts:** Leave creation rechecks overlapping holds and confirmed visits, moves affected visits to `needs_reschedule`, and queues patient and doctor notifications. Booking checks leave again inside its transaction.

**Reliable side effects:** Appointment state is committed before email or calendar work begins. Outbox jobs retry with backoff and idempotency keys, so failed notifications never undo a valid appointment.

**Privacy:** Production deployment should add encrypted storage, audit logs, consent and retention policies, least-privilege role middleware, and real password hashing. The included browser persistence is for demonstration only, not clinical data storage.

## Package the source

From the project root, create an archive without dependencies or generated output:

```powershell
Remove-Item .\carepath-clinic-manager.zip -Force -ErrorAction SilentlyContinue
Get-ChildItem -Recurse -File |
	Where-Object { $_.FullName -notmatch '\\node_modules\\|\\dist\\|carepath-clinic-manager\.zip$' } |
	Compress-Archive -DestinationPath .\carepath-clinic-manager.zip -Force
```
