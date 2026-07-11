/**
 * Serviço de notificação.
 *
 * E-mail: enviado via API HTTPS da Brevo (https://api.brevo.com), não por SMTP.
 * Isso é proposital — provedores de hospedagem como o Railway bloqueiam as
 * portas SMTP (465/587/25) em planos gratuitos/hobby para evitar abuso, então
 * qualquer solução baseada em SMTP (Gmail, etc.) trava com "Connection
 * timeout" nesses planos. A API da Brevo usa HTTPS normal (porta 443), que
 * nunca é bloqueada, e tem um plano gratuito de 300 e-mails/dia para sempre,
 * sem precisar de domínio próprio (só verificar um e-mail remetente).
 *
 * Sem BREVO_API_KEY configurada, cai em modo de desenvolvimento: não envia
 * nada de verdade, só imprime o conteúdo no console.
 *
 * WhatsApp: implementado via link "wa.me" com mensagem pré-preenchida.
 * É a abordagem padrão para pequenos negócios, já que a API oficial do
 * WhatsApp Business exige aprovação e conta comercial paga. O link é
 * devolvido para o front-end, que oferece um botão "Enviar confirmação
 * por WhatsApp" — o próprio dono ou o cliente clica e o app do WhatsApp
 * abre com a mensagem pronta.
 */

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

  if (!process.env.BREVO_API_KEY) {
    // Modo de desenvolvimento: sem chave configurada, só loga no console.
    console.log(`[email:dev] Para: ${to} | Assunto: ${subject}\n${text}`);
    return null;
  }

  try {
    // Timeout manual: sem isso, uma API fora do ar poderia travar a requisição
    // indefinidamente (o fetch nativo não tem timeout embutido por padrão).
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'api-key': process.env.BREVO_API_KEY,
      },
      body: JSON.stringify({
        sender: {
          name: process.env.BREVO_SENDER_NAME || 'Corte Certo',
          email: process.env.BREVO_SENDER_EMAIL,
        },
        to: [{ email: to, name: clientName }],
        subject,
        textContent: text,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Brevo respondeu ${response.status}: ${body}`);
    }

    return await response.json();
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
