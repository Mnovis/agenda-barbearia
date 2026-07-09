const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rota pública: qualquer cliente vê os serviços disponíveis para agendar
router.get('/', async (_req, res) => {
  const services = await prisma.service.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  return res.json(services);
});

const serviceSchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  durationMin: z.number().int().positive(),
  priceCents: z.number().int().nonnegative(),
});

// Apenas ADMIN pode criar, editar ou desativar serviços
router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const service = await prisma.service.create({ data: parsed.data });
  return res.status(201).json(service);
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const parsed = serviceSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const service = await prisma.service.update({ where: { id }, data: parsed.data });
  return res.json(service);
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  // Soft delete: mantém o histórico de agendamentos antigos intacto
  const service = await prisma.service.update({ where: { id }, data: { active: false } });
  return res.json(service);
});

module.exports = router;
