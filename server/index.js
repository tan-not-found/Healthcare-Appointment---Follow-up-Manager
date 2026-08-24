import express from 'express';

const app = express();
app.use(express.json());

app.get('/api/health', (_req, res) => res.json({ status: 'ok', service: 'carepath-api' }));
app.post('/api/appointments/hold', (_req, res) => res.status(501).json({ message: 'Connect the transactional repository before enabling booking.' }));
app.post('/api/appointments/:id/complete', (_req, res) => res.status(501).json({ message: 'Connect the clinical notes repository before enabling completion.' }));

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`Carepath API listening on ${port}`));
