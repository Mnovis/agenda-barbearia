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
 * Gera os horários disponíveis de um dia dado um expediente e a duração do serviço,
 * removendo os que colidem com agendamentos existentes.
 */
function generateAvailableSlots({
  openTime = '09:00',
  closeTime = '19:00',
  stepMin = 30,
  durationMin,
  existingAppointments,
}) {
  const slots = [];
  let cursor = toMinutes(openTime);
  const close = toMinutes(closeTime);

  while (cursor + durationMin <= close) {
    const startTime = minutesToHHMM(cursor);
    const { hasConflict } = checkConflict(startTime, durationMin, existingAppointments);
    if (!hasConflict) slots.push(startTime);
    cursor += stepMin;
  }

  return slots;
}

module.exports = { checkConflict, generateAvailableSlots, toMinutes, minutesToHHMM };
