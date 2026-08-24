import express from 'express';

const app = express();
app.use(express.json());

const doctors = [
	{ id: 'doc_1', name: 'Dr. Maya Patel', specialty: 'Family medicine', slotMinutes: 30, leaveDays: [] },
	{ id: 'doc_2', name: 'Dr. Elias Chen', specialty: 'Cardiology', slotMinutes: 45, leaveDays: [] }
];
const appointments = new Map();
const holds = new Map();

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'carepath-api' }));
app.get('/api/doctors', (req, res) => res.json(doctors.filter(doctor => !req.query.specialty || doctor.specialty === req.query.specialty)));

app.post('/api/appointments/hold', (req, res) => {
	const { doctorId, patientId, startsAt } = req.body;
	const doctor = doctors.find(item => item.id === doctorId);
	if (!doctor || !patientId || !startsAt) return res.status(400).json({ message: 'doctorId, patientId, and startsAt are required.' });
	const date = startsAt.slice(0, 10);
	if (doctor.leaveDays.includes(date)) return res.status(409).json({ code: 'DOCTOR_ON_LEAVE', message: 'Doctor is on leave for this date.' });
	const now = Date.now();
	for (const [key, hold] of holds) { if (hold.expiresAt < now) holds.delete(key); }
	const key = `${doctorId}:${startsAt}`;
	if (appointments.has(key) || holds.has(key)) return res.status(409).json({ code: 'SLOT_UNAVAILABLE', message: 'This slot was just taken. Please choose another.' });
	const hold = { id: `hold_${now}`, doctorId, patientId, startsAt, expiresAt: now + 5 * 60 * 1000 };
	holds.set(key, hold);
	res.status(201).json(hold);
});

app.post('/api/appointments/confirm', (req, res) => {
	const { holdId, symptoms = '' } = req.body;
	const entry = [...holds.entries()].find(([, hold]) => hold.id === holdId);
	if (!entry || entry[1].expiresAt < Date.now()) return res.status(409).json({ code: 'HOLD_EXPIRED', message: 'Your slot hold expired. Please select another slot.' });
	const [key, hold] = entry;
	holds.delete(key);
	const appointment = { id: `apt_${Date.now()}`, ...hold, symptoms, status: 'confirmed', preVisitSummary: buildFallbackSummary(symptoms) };
	delete appointment.expiresAt;
	appointments.set(key, appointment);
	res.status(201).json(appointment);
});

app.post('/api/doctors/:id/leave', (req, res) => {
	const doctor = doctors.find(item => item.id === req.params.id);
	const { date } = req.body;
	if (!doctor || !date) return res.status(400).json({ message: 'Doctor and date are required.' });
	doctor.leaveDays.push(date);
	const affected = [...appointments.values()].filter(item => item.doctorId === doctor.id && item.startsAt.startsWith(date));
	res.json({ leaveDate: date, affectedAppointments: affected.map(item => item.id), notificationsQueued: affected.length });
});

app.post('/api/appointments/:id/complete', (req, res) => {
	const appointment = [...appointments.values()].find(item => item.id === req.params.id);
	if (!appointment) return res.status(404).json({ message: 'Appointment not found.' });
	appointment.notes = req.body.notes || '';
	appointment.prescription = req.body.prescription || null;
	appointment.postVisitSummary = buildFallbackSummary(appointment.notes, true);
	appointment.status = 'completed';
	res.json(appointment);
});

function buildFallbackSummary(text, postVisit = false) {
	return postVisit
		? { summary: text ? 'Your clinician documented the visit and follow-up plan.' : 'No clinical notes were provided.', medicationSchedule: [], followUp: 'Contact the clinic if symptoms change.' }
		: { urgency: 'Low', chiefComplaint: text ? text.slice(0, 120) : 'No symptoms provided.', suggestedQuestions: ['What should I watch for?', 'What are the next steps?', 'When should I follow up?'], generatedBy: 'fallback' };
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Carepath API listening on ${port}`));
