import { useEffect, useState } from 'react';
import api from '../api';

const statusLabel = {
  CONFIRMED: { text: 'Confirmado', color: 'text-green-400 border-green-400/30' },
  CANCELLED: { text: 'Cancelado', color: 'text-red-400 border-red-400/30' },
  COMPLETED: { text: 'Concluído', color: 'text-cream/40 border-cream/20' },
};

export default function MyAppointments() {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api.get('/appointments/me').then((res) => setAppointments(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCancel(id) {
    await api.patch(`/appointments/${id}/cancel`);
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <h1 className="font-display text-3xl text-cream mb-8">Meus horários</h1>

      {loading && <p className="text-cream/50">Carregando...</p>}

      {!loading && appointments.length === 0 && (
        <p className="text-cream/50">Você ainda não tem agendamentos.</p>
      )}

      <div className="space-y-3">
        {appointments.map((appt) => {
          const label = statusLabel[appt.status];
          return (
            <div
              key={appt.id}
              className="border border-charcoal-700 rounded-xl p-5 flex items-center justify-between"
            >
              <div>
                <p className="font-display text-lg text-cream">{appt.service.name}</p>
                <p className="text-sm text-cream/50">
                  {new Date(appt.date).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
                  {' às '}
                  {appt.startTime}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs border rounded-full px-3 py-1 ${label.color}`}>
                  {label.text}
                </span>
                {appt.status === 'CONFIRMED' && (
                  <button
                    onClick={() => handleCancel(appt.id)}
                    className="text-xs text-cream/40 hover:text-red-400 transition-colors"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
