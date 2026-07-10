/**
 * Regras de conflito de horário.
 *
 * Um novo agendamento é inválido se o intervalo [novoInicio, novoFim)
 * se sobrepõe a qualquer agendamento CONFIRMED já existente no mesmo dia.
 * Comparação feita em minutos desde 00:00 para evitar bugs de string.
 */

function toMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function minutesToHHMM(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
  const m = String(totalMinutes % 60).padStart(2, '0');
  return `${h}:${m}`;
}

/**
 * @param {string} startTime - "HH:mm" do novo agendamento
 * @param {number} durationMin - duração do serviço em minutos
 * @param {Array<{startTime: string, endTime: string}>} existingAppointments - agendamentos já confirmados no mesmo dia
 * @returns {{ hasConflict: boolean, endTime: string }}
 */
function checkConflict(startTime, durationMin, existingAppointments) {
  const newStart = toMinutes(startTime);
  const newEnd = newStart + durationMin;
  const endTime = minutesToHHMM(newEnd);

  const hasConflict = existingAppointments.some((appt) => {
    const existingStart = toMinutes(appt.startTime);
    const existingEnd = toMinutes(appt.endTime);
    // Sobreposição clássica de intervalos: começa antes do outro terminar
    // E termina depois do outro começar.
    return newStart < existingEnd && newEnd > existingStart;
  });

  return { hasConflict, endTime };
}

/**
 * Retorna a data e a hora atuais no fuso de Brasília, independente de em qual
 * fuso o servidor está rodando (containers em nuvem costumam rodar em UTC).
 * Sem isso, "horário passado" seria calculado errado sempre que o fuso do
 * servidor divergir do fuso real da barbearia.
 */
function nowInBrazil() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const map = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return { date: `${map.year}-${map.month}-${map.day}`, time: `${map.hour}:${map.minute}` };
}

/**
 * Gera os horários disponíveis de um dia dado um expediente e a duração do serviço,
 * removendo os que colidem com agendamentos existentes E os que já passaram
 * (quando a data pedida é hoje) — não faz sentido oferecer 09:00 se já são 15h.
 *
 * @param {string} [date] - "YYYY-MM-DD" do dia consultado; se for hoje, filtra horários já passados
 * @param {number} [minLeadMinutes] - antecedência mínima exigida para o horário mais próximo (padrão 30min)
 */
function generateAvailableSlots({
  openTime = '09:00',
  closeTime = '19:00',
  stepMin = 30,
  durationMin,
  existingAppointments,
  date,
  minLeadMinutes = 30,
}) {
  const slots = [];
  let cursor = toMinutes(openTime);
  const close = toMinutes(closeTime);

  const { date: today, time: nowTime } = nowInBrazil();
  const isToday = date === today;
  const minAllowedMinutes = isToday ? toMinutes(nowTime) + minLeadMinutes : -Infinity;

  while (cursor + durationMin <= close) {
    const startTime = minutesToHHMM(cursor);
    const { hasConflict } = checkConflict(startTime, durationMin, existingAppointments);
    if (!hasConflict && cursor >= minAllowedMinutes) slots.push(startTime);
    cursor += stepMin;
  }

  return slots;
}

module.exports = { checkConflict, generateAvailableSlots, toMinutes, minutesToHHMM, nowInBrazil };
