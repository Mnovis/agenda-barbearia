require('dotenv').config();
const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const serviceRoutes = require('./routes/services.routes');
const professionalRoutes = require('./routes/professionals.routes');
const appointmentRoutes = require('./routes/appointments.routes');

const app = express();

const allowedOrigin = process.env.FRONTEND_URL || '*';
app.use(cors({ origin: allowedOrigin }));
app.use(express.json());

app.get('/health', (_req, res) => res.json({ status: 'ok' }));

app.use('/auth', authRoutes);
app.use('/services', serviceRoutes);
app.use('/professionals', professionalRoutes);
app.use('/appointments', appointmentRoutes);

// Handler de erro central — evita expor stack trace ao cliente em produção
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor.' });
});

const PORT = process.env.PORT || 3333;
app.listen(PORT, () => {
  console.log(`Corte Certo API rodando em http://localhost:${PORT}`);
});
