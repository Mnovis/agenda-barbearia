const express = require('express');
const { z } = require('zod');
const prisma = require('../lib/prisma');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

// Rota pública: cliente precisa ver os profissionais para escolher com quem agendar
router.get('/', async (_req, res) => {
  const professionals = await prisma.professional.findMany({
    where: { active: true },
    orderBy: { name: 'asc' },
  });
  return res.json(professionals);
});

// Admin: vê todos, inclusive os desativados, para poder reativá-los
router.get('/all', authenticate, authorize('ADMIN'), async (_req, res) => {
  const professionals = await prisma.professional.findMany({ orderBy: { name: 'asc' } });
  return res.json(professionals);
});

const professionalSchema = z.object({
  name: z.string().min(2),
  role: z.string().optional(),
  active: z.boolean().optional(),
});

router.post('/', authenticate, authorize('ADMIN'), async (req, res) => {
  const parsed = professionalSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const professional = await prisma.professional.create({ data: parsed.data });
  return res.status(201).json(professional);
});

router.patch('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  const parsed = professionalSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const professional = await prisma.professional.update({ where: { id }, data: parsed.data });
  return res.json(professional);
});

router.delete('/:id', authenticate, authorize('ADMIN'), async (req, res) => {
  const { id } = req.params;
  // Soft delete: preserva o histórico de agendamentos já feitos com esse profissional
  const professional = await prisma.professional.update({ where: { id }, data: { active: false } });
  return res.json(professional);
});

module.exports = router;
