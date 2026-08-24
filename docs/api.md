# API contract

All protected endpoints require `Authorization: Bearer <jwt>`. The role matrix is enforced in middleware: patients manage their own appointments, doctors manage assigned clinical notes, and admins manage profiles, availability, and leave.

| Method | Route | Role | Purpose |
| --- | --- | --- | --- |
| POST | `/auth/register` | Public | Create patient account |
| POST | `/auth/login` | Public | Return JWT |
| GET | `/doctors` | Any signed-in user | Search specialty and slots |
| POST | `/appointments/hold` | Patient | Atomic five-minute slot hold |
| POST | `/appointments/confirm` | Patient | Save symptoms and confirm |
| PATCH | `/appointments/:id` | Patient/Admin | Reschedule or cancel |
| POST | `/appointments/:id/complete` | Doctor | Save notes and prescription |
| POST | `/doctors/:id/leave` | Admin | Add leave and queue conflict notices |
| GET | `/calendar/connect` | Patient/Doctor | Start Google OAuth |
| GET | `/calendar/callback` | Google | Store encrypted refresh token |

Errors use `{ "code": "...", "message": "..." }`. Clients should retry `429` and transient `5xx`, refresh availability after `409`, and never retry a request without its idempotency key.
