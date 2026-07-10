const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  const adminPassword = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { email: 'admin@cortecerto.com' },
    update: {},
    create: {
      name: 'Admin',
      email: 'admin@cortecerto.com',
      passwordHash: adminPassword,
      role: 'ADMIN',
    },
  });

  const services = [
    { name: 'Corte Clássico', durationMin: 30, priceCents: 4000, description: 'Corte tradicional na tesoura e máquina.' },
    { name: 'Corte + Barba', durationMin: 50, priceCents: 6500, description: 'Corte completo com barba desenhada na navalha.' },
    { name: 'Barba', durationMin: 25, priceCents: 3000, description: 'Aparo e desenho de barba com toalha quente.' },
    { name: 'Sobrancelha', durationMin: 15, priceCents: 1500, description: 'Design de sobrancelha na navalha.' },
  ];

  for (const s of services) {
    await prisma.service.upsert({
      where: { name: s.name },
      update: {},
      create: s,
    }).catch(async () => {
      // fallback se "name" não for unique no schema atual
      const exists = await prisma.service.findFirst({ where: { name: s.name } });
      if (!exists) await prisma.service.create({ data: s });
    });
  }

  const professionals = [
    { name: 'Carlos Mendes', role: 'Barbeiro' },
    { name: 'Fernanda Lima', role: 'Especialista em barba' },
  ];

  for (const p of professionals) {
    const exists = await prisma.professional.findFirst({ where: { name: p.name } });
    if (!exists) await prisma.professional.create({ data: p });
  }

  console.log('Seed concluído: admin@cortecerto.com / admin123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
