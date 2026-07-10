const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');
const { checkConflict, generateAvailableSlots } = require('../utils/conflict');
const { sendAppointmentEmail, buildWhatsAppLink } = require('../lib/notifications');

const router = express.Router();

// GET /appointments/available-slots?date=2026-07-13&serviceId=xxx&professionalId=yyy
// Retorna os horários livres do dia para um serviço e profissional específicos.
router.get('/available-slots', async (req, res) => {
  const { date, serviceId, professionalId } = req.query;
  if (!date || !serviceId || !professionalId) {
    return res.status(400).json({ error: 'Informe date, serviceId e professionalId.' });
  }

  const service = await prisma.service.findUnique({ where: { id: serviceId } });
  if (!service) return res.status(404).json({ error: 'Serviço não encontrado.' });

  // Conflito é checado apenas contra os agendamentos DESSE profissional nesse dia —
  // dois profissionais podem atender clientes diferentes no mesmo horário.
  const existingAppointments = await prisma.appointment.findMany({
    where: { date: new Date(date), professionalId, status: 'CONFIRMED' },
    select: { startTime: true, endTime: true },
  });

  const slots = generateAvailableSlots({
    durationMin: service.durationMin,
    existingAppointments,
  });

  return res.json({ date, serviceId, professionalId, slots });
});

// Cliente logado: histórico dos próprios agendamentos
router.get('/me', authenticate, async (req, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { clientId: req.user.id },
    include: { service: true, professional: true },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });
  return res.json(appointments);
});

// Admin: agenda completa, opcionalmente filtrada por data e/ou profissional
router.get('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const { date, professionalId } = req.query;
  const appointments = await prisma.appointment.findMany({
    where: {
      ...(date ? { date: new Date(date) } : {}),
      ...(professionalId ? { professionalId } : {}),
    },
    include: {
      service: true,
      professional: true,
      client: { select: { name: true, phone: true, email: true } },
    },
    orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
  });

  // Cada item já sai com o link de WhatsApp pronto, para o admin enviar a
  // confirmação (ou o convite de reagendamento, se cancelado) quando quiser —
  // sem precisar clicar em "cancelar" ou "confirmar" de novo para gerar o link.
  const withWhatsapp = appointments.map((appt) => ({
    ...appt,
    whatsappLink: buildWhatsAppLink({
      phone: appt.client.phone,
      clientName: appt.client.name,
      serviceName: appt.service.name,
      professionalName: appt.professional.name,
      date: appt.date,
      startTime: appt.startTime,
      type: appt.status === 'CANCELLED' ? 'cancelled' : 'confirmed',
    }),
  }));

  return res.json(withWhatsapp);
});

const createSchema = z.object({
  serviceId: z.string().uuid(),
  professionalId: z.string().uuid(),
  date: z.string(), // "2026-07-13"
  startTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Horário inválido, use HH:mm.'),
  notes: z.string().optional(),
});

router.post('/', authenticate, async (req, res) => {
  const parsed = createSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const { serviceId, professionalId, date, startTime, notes } = parsed.data;

  const [service, professional] = await Promise.all([
    prisma.service.findUnique({ where: { id: serviceId } }),
    prisma.professional.findUnique({ where: { id: professionalId } }),
  ]);
  if (!service || !service.active) {
    return res.status(404).json({ error: 'Serviço não encontrado ou indisponível.' });
  }
  if (!professional || !professional.active) {
    return res.status(404).json({ error: 'Profissional não encontrado ou indisponível.' });
  }

  const existingAppointments = await prisma.appointment.findMany({
    where: { date: new Date(date), professionalId, status: 'CONFIRMED' },
    select: { startTime: true, endTime: true },
  });

  const { hasConflict, endTime } = checkConflict(startTime, service.durationMin, existingAppointments);
  if (hasConflict) {
    return res.status(409).json({ error: 'Este horário acabou de ser reservado. Escolha outro.' });
  }

  let appointment;
  try {
    appointment = await prisma.appointment.create({
      data: { clientId: req.user.id, serviceId, professionalId, date: new Date(date), startTime, endTime, notes },
      include: { service: true, professional: true, client: true },
    });
  } catch (err) {
    // Proteção extra: duas requisições simultâneas passando pela checagem acima
    // ao mesmo tempo são barradas pela constraint @@unique do banco.
    if (err.code === 'P2002') {
      return res.status(409).json({ error: 'Este horário acabou de ser reservado. Escolha outro.' });
    }
    throw err;
  }

  // Notificação: e-mail sempre disparado; link de WhatsApp devolvido para o
  // front-end oferecer um botão de envio (não bloqueia a resposta em caso de falha).
  await sendAppointmentEmail({
    to: appointment.client.email,
    clientName: appointment.client.name,
    serviceName: appointment.service.name,
    professionalName: appointment.professional.name,
    date: appointment.date,
    startTime: appointment.startTime,
    type: 'confirmed',
  });

  const whatsappLink = buildWhatsAppLink({
    phone: appointment.client.phone,
    clientName: appointment.client.name,
    serviceName: appointment.service.name,
    professionalName: appointment.professional.name,
    date: appointment.date,
    startTime: appointment.startTime,
    type: 'confirmed',
  });

  return res.status(201).json({ ...appointment, whatsappLink });
});

router.patch('/:id/cancel', authenticate, async (req, res) => {
  const { id } = req.params;
  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true, professional: true, client: true },
  });

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

  await sendAppointmentEmail({
    to: appointment.client.email,
    clientName: appointment.client.name,
    serviceName: appointment.service.name,
    professionalName: appointment.professional.name,
    date: appointment.date,
    startTime: appointment.startTime,
    type: 'cancelled',
  });

  const whatsappLink = buildWhatsAppLink({
    phone: appointment.client.phone,
    clientName: appointment.client.name,
    serviceName: appointment.service.name,
    professionalName: appointment.professional.name,
    date: appointment.date,
    startTime: appointment.startTime,
    type: 'cancelled',
  });

  return res.json({ ...updated, whatsappLink });
});

module.exports = router;
