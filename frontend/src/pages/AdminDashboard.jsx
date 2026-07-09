import { useEffect, useState } from 'react';
import api from '../api';

function toISODate(d) {
  return d.toISOString().split('T')[0];
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminDashboard() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get('/appointments', { params: { date } })
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }, [date]);

  const confirmed = appointments.filter((a) => a.status === 'CONFIRMED');
  const revenue = confirmed.reduce((sum, a) => sum + a.service.priceCents, 0);

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <p className="text-brass-400 text-xs uppercase tracking-[0.2em] mb-2">Painel do Parceiro</p>
      <h1 className="font-display text-3xl text-cream mb-8">Agenda do dia</h1>

      <div className="flex items-center gap-4 mb-8">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-2 text-cream"
        />
        <div className="flex gap-6 ml-auto">
          <div className="text-right">
            <p className="text-xs text-cream/40 uppercase tracking-wider">Agendamentos</p>
            <p className="font-display text-2xl text-cream">{confirmed.length}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-cream/40 uppercase tracking-wider">Receita prevista</p>
            <p className="font-display text-2xl text-brass-400">{formatPrice(revenue)}</p>
          </div>
        </div>
      </div>

      {loading && <p className="text-cream/50">Carregando...</p>}

      {!loading && appointments.length === 0 && (
        <p className="text-cream/50 border border-charcoal-700 rounded-xl p-6 text-center">
          Nenhum agendamento para este dia.
        </p>
      )}

      <div className="space-y-2">
        {appointments
          .sort((a, b) => a.startTime.localeCompare(b.startTime))
          .map((appt) => (
            <div
              key={appt.id}
              className={`border rounded-xl p-4 flex items-center justify-between ${
                appt.status === 'CANCELLED' ? 'border-charcoal-800 opacity-40' : 'border-charcoal-700'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="font-display text-brass-400 text-lg w-14">{appt.startTime}</span>
                <div>
                  <p className="text-cream">{appt.client.name}</p>
                  <p className="text-sm text-cream/50">{appt.service.name}</p>
                </div>
              </div>
              <span className="text-cream/60 text-sm">{formatPrice(appt.service.priceCents)}</span>
            </div>
          ))}
      </div>
    </div>
  );
}
