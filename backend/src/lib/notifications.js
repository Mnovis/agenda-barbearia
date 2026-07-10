const nodemailer = require('nodemailer');

/**
 * Serviço de notificação.
 *
 * E-mail: usa Nodemailer. Em desenvolvimento, sem credenciais configuradas,
 * cai automaticamente no transporte "jsonTransport", que não envia nada de
 * verdade — só loga o conteúdo no console. Isso permite testar o fluxo
 * completo sem precisar de uma conta SMTP. Em produção, basta preencher
 * SMTP_HOST / SMTP_USER / SMTP_PASS no .env que o Nodemailer passa a enviar
 * de verdade (Gmail, SendGrid, Resend, etc. todos funcionam via SMTP).
 *
 * WhatsApp: implementado via link "wa.me" com mensagem pré-preenchida.
 * É a abordagem padrão para pequenos negócios, já que a API oficial do
 * WhatsApp Business exige aprovação e conta comercial paga. O link é
 * devolvido para o front-end, que oferece um botão "Enviar confirmação
 * por WhatsApp" — o próprio dono ou o cliente clica e o app do WhatsApp
 * abre com a mensagem pronta.
 */

function buildTransport() {
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
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
