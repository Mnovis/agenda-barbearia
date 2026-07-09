const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { checkConflict, generateAvailableSlots } = require('../utils/conflict');

const router = express.Router();

// GET /appointments/available-slots?date=2026-07-10&serviceId=xxx
// Retorna os horários livres do dia para um serviço específico.
router.get('/available-slots', async (req, res) => {
  const { date, serviceId } = req.query;
  if (!date || !serviceId) {
    return res.status(400).json({ error: 'Informe date e serviceId.' });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado.' });

  const existingAppointments = await prisma.appointment.findMany({
    where: { date: new Date(date), status: 'CONFIRMED' },
    select: { startTime: true, endTime: true },
  });

  const slots = generateAvailableSlots({
    durationMin: service.durationMin,
    existingAppointments,
  });

  return res.json({ date, serviceId, slots });
});

// Cliente logado: histórico dos próprios agendamentos
router.get('/me', authenticate, async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { clientId: req.user.id },
    include: { service: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  return res.json(appointments);
});

// Admin: agenda completa, opcionalmente filtrada por data
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { date } = req.query;
  const appointments = await prisma.appointment.findMany({
    where: date ? { date: new Date(date) } : undefined,
    include: { service: true, client: { select: { name: true, phone: true, email: true } } },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  return res.json(appointments);
});

const createSchema = z.object({
  serviceId: z.string().uuid(),
  date: z.string(), // "2026-07-10"
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido, use HH:mm.'),
  notes: z.string().optional(),
});

router.post('/', authenticate, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { serviceId, date, startTime, notes } = parsed.data;

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service || !service.active) {
    return res.status(404).json({ error: 'Serviço não encontrado ou indisponível.' });
  }

  const existingAppointments = await prisma.appointment.findMany({
    where: { date: new Date(date), status: 'CONFIRMED' },
    select: { startTime: true, endTime: true },
  });

  // Validação de conflito feita na API, ANTES de tocar o banco — dá uma
  // mensagem de erro clara ao cliente em vez de estourar a constraint @@unique.
  const { hasConflict, endTime } = checkConflict(startTime, service.durationMin, existingAppointments);
  if (hasConflict) {
    return res.status(409).json({ error: 'Este horário acabou de ser reservado. Escolha outro.' });
  }

  try {
    const appointment = await prisma.appointment.create({
      data: {
        clientId: req.user.id,
        serviceId,
        date: new Date(date),
        startTime,
        endTime,
        notes,
      },
      include: { service: true },
    });
    return res.status(201).json(appointment);
  } catch (err) {
    // Proteção extra: se dois pedidos simultâneos passarem pela checagem acima
    // ao mesmo tempo, a constraint @@unique([date, startTime]) do banco barra o segundo.
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Este horário acabou de ser reservado. Escolha outro.' });
    }
    throw err;
  }
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  const appointment = await prisma.appointment.findUnique({ where: { id } });

  if (!appointment) return res.status(404).json({ error: 'Agendamento não encontrado.' });

  const isOwner = appointment.clientId === req.user.id;
  const isAdmin = req.user.role === 'ADMIN';
  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'Você não pode cancelar este agendamento.' });
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: 'CANCELLED' },
  });
  return res.json(updated);
});

module.exports = router;
