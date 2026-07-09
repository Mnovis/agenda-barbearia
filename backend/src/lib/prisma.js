const { PrismaClient } = require('@prisma/client');

// Evita múltiplas instâncias do PrismaClient em modo de desenvolvimento
// com hot-reload (nodemon), que poderiam esgotar as conexões do banco.
const prisma = new PrismaClient();

module.exports = prisma;
