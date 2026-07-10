const nodemailer = require('nodemailer');

function buildTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
      // Timeouts de segurança: sem isso, se o provedor SMTP não responder
      // (porta bloqueada pelo host, rede instável, etc.), a promise de envio
      // fica pendurada para sempre e trava a requisição HTTP inteira.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
    });
  }
  // Modo de desenvolvimento: não envia e-mail de verdade, só imprime no console.
  return nodemailer.createTransport({ jsonTransport: true });
}

const transport = buildTransport();

function formatDate(date) {
  return new Date(date).toLocaleDateString('pt-BR', {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    timeZone: 'UTC',
  });
}

async function sendAppointmentEmail({ to, clientName, serviceName, professionalName, date, startTime, type }) {
  const subject =
    type === 'cancelled'
      ? 'Seu agendamento foi cancelado — Corte Certo'
      : 'Agendamento confirmado — Corte Certo';

  const text =
    type === 'cancelled'
      ? `Olá, ${clientName}. Vimos que seu agendamento de ${serviceName} com ${professionalName} em ${formatDate(date)} às ${startTime} foi cancelado. Quer marcar um novo horário? É só responder este e-mail ou acessar o site.`
      : `Olá, ${clientName}. Seu agendamento de ${serviceName} com ${professionalName} está confirmado para ${formatDate(date)} às ${startTime}. Te esperamos!`;

  try {
    const info = await transport.sendMail({
      from: process.env.SMTP_FROM || 'Corte Certo <no-reply@cortecerto.com>',
      to,
      subject,
      text,
    });
    if (!process.env.SMTP_HOST) {
      console.log(`[email:dev] Para: ${to} | Assunto: ${subject}\n${text}`);
    }
    return info;
  } catch (err) {
    // Falha ao enviar e-mail nunca deve derrubar a criação/cancelamento do agendamento.
    console.error('Falha ao enviar e-mail de notificação:', err.message);
    return null;
  }
}

function buildWhatsAppLink({ phone, clientName, serviceName, professionalName, date, startTime, type }) {
  if (!phone) return null;

  const digits = phone.replace(/\D/g, '');
  const message =
    type === 'cancelled'
      ? `Olá ${clientName}, vimos que seu agendamento de ${serviceName} com ${professionalName} em ${formatDate(date)} às ${startTime} foi cancelado. Quer marcar um novo horário? 😊`
      : `Olá ${clientName}! Seu horário de ${serviceName} com ${professionalName} está confirmado para ${formatDate(date)} às ${startTime}. Te esperamos na Corte Certo!`;

  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

module.exports = { sendAppointmentEmail, buildWhatsAppLink };
