import { useEffect, useState } from 'react';
import api from '../api';

function toISODate(d) {
  // Mesma correção do Booking.jsx: componentes de data locais, sem UTC shift.
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function AdminDashboard() {
  const [date, setDate] = useState(toISODate(new Date()));
  const [professionals, setProfessionals] = useState([]);
  const [professionalId, setProfessionalId] = useState('');
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/professionals/all').then((res) => setProfessionals(res.data));
  }, []);

  useEffect(() => {
    setLoading(true);
    api
      .get('/appointments', { params: { date, professionalId: professionalId || undefined } })
      .then((res) => setAppointments(res.data))
      .finally(() => setLoading(false));
  }, [date, professionalId]);

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
        <select
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          className="bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-2 text-cream"
        >
          <option value="">Todos os profissionais</option>
          {professionals.map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
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
          .map((appt) => {
            const isCancelled = appt.status === 'CANCELLED';
            return (
              <div
                key={appt.id}
                className={`border rounded-xl p-4 flex items-center justify-between gap-4 ${
                  isCancelled ? 'border-charcoal-800 bg-charcoal-900/40' : 'border-charcoal-700'
                }`}
              >
                <div className="flex items-center gap-4 min-w-0">
                  <span
                    className={`font-display text-lg w-14 shrink-0 ${
                      isCancelled ? 'text-cream/40 line-through' : 'text-brass-400'
                    }`}
                  >
                    {appt.startTime}
                  </span>
                  <div className="min-w-0">
                    <p className={isCancelled ? 'text-cream/60' : 'text-cream'}>{appt.client.name}</p>
                    <p className="text-sm text-cream/50">
                      {appt.service.name} · {appt.professional.name}
                      {isCancelled && <span className="text-red-400/80"> · cancelado</span>}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-cream/60 text-sm">{formatPrice(appt.service.priceCents)}</span>
                  {appt.whatsappLink && (
                    <a
                      href={appt.whatsappLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs border border-brass-600/40 text-brass-400 rounded-full px-3 py-1 hover:bg-brass-500/10 transition-colors whitespace-nowrap"
                    >
                      {isCancelled ? 'Convidar p/ reagendar' : 'Confirmar via WhatsApp'}
                    </a>
                  )}
                </div>
              </div>
            );
          })}
      </div>
    </div>
  );
}
