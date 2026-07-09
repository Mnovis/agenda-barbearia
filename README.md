# Corte Certo — Sistema de Agendamento para Barbearias

Aplicação full-stack de agendamento online, desenvolvida para resolver um problema real: eliminar
a fila de WhatsApp e as ligações para marcar horário em barbearias e salões pequenos.

O cliente escolhe o serviço, vê os horários realmente disponíveis em tempo real e confirma o
agendamento em poucos cliques. O dono do negócio acompanha a agenda do dia e a receita prevista
em um painel dedicado.

## Funcionalidades

**Área do cliente**
- Cadastro e login com autenticação JWT
- Listagem de serviços com duração e preço
- Calendário dos próximos 10 dias
- Grade de horários disponíveis, calculada dinamicamente a partir da duração do serviço
- Confirmação de agendamento com validação de conflito em tempo real
- Histórico de agendamentos com opção de cancelamento

**Painel do parceiro (admin)**
- Agenda do dia com todos os agendamentos confirmados
- Total de agendamentos e receita prevista do dia
- Gestão de serviços (criar, editar, desativar)

## Por que este projeto é tecnicamente interessante

O núcleo do sistema é a **lógica de prevenção de conflito de horários**, que resolvi em duas
camadas:

1. **Na API**, antes de tocar o banco: dado um horário de início e a duração do serviço, o sistema
   verifica se o intervalo `[início, fim)` se sobrepõe a qualquer agendamento já confirmado no
   mesmo dia (`backend/src/utils/conflict.js`). Essa mesma função gera a lista de horários livres
   exibida ao cliente, então o front-end nunca mostra um horário que o back-end recusaria.
2. **No banco**, como rede de segurança: uma constraint `@@unique([date, startTime])` no Prisma
   garante que, mesmo em caso de duas requisições simultâneas passando pela validação da API ao
   mesmo tempo, o banco rejeita a segunda gravação.

Outras decisões técnicas:
- Preços armazenados em **centavos (inteiro)**, não float, para evitar erros de arredondamento.
- Senhas com hash **bcrypt**, nunca armazenadas em texto puro.
- Validação de entrada com **Zod** em todas as rotas que recebem dados do usuário.
- Autorização por papel (`CLIENT` / `ADMIN`) via middleware, não apenas por convenção no front-end.

## Stack

**Back-end:** Node.js · Express · Prisma ORM · PostgreSQL · JWT · bcrypt · Zod
**Front-end:** React · Vite · React Router · Tailwind CSS · Axios

## Estrutura do projeto

```
agenda-barbearia/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma      # modelagem de User, Service e Appointment
│   │   └── seed.js            # dados de exemplo
│   └── src/
│       ├── routes/            # auth, services, appointments
│       ├── middleware/        # autenticação e autorização JWT
│       ├── utils/conflict.js  # lógica de validação de conflito de horário
│       └── server.js
└── frontend/
    └── src/
        ├── pages/              # Landing, Login, Booking, MyAppointments, AdminDashboard
        ├── components/         # Header, ServiceCard, TimeSlotPicker
        └── api.js               # cliente Axios com interceptor de token
```

---

Desenvolvido por Mateus Novis Amolinário de Marins.
