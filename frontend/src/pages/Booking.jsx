import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import ServiceCard from '../components/ServiceCard';
import TimeSlotPicker from '../components/TimeSlotPicker';

function nextDays(count) {
  const days = [];
  const today = new Date();
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toISODate(d) {
  // Usa os componentes de data LOCAIS, nunca toISOString() (que converte para UTC
  // e pode "empurrar" a data para o dia seguinte dependendo do fuso e da hora).
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export default function Booking({ user }) {
  const [services, setServices] = useState([]);
  const [professionals, setProfessionals] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [selectedProfessional, setSelectedProfessional] = useState(null);
  const [selectedDate, setSelectedDate] = useState(toISODate(new Date()));
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const navigate = useNavigate();

  const days = nextDays(10);

  useEffect(() => {
    api.get('/services').then((res) => setServices(res.data));
    api.get('/professionals').then((res) => setProfessionals(res.data));
  }, []);

  useEffect(() => {
    if (!selectedService || !selectedProfessional) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    api
      .get('/appointments/available-slots', {
        params: { date: selectedDate, serviceId: selectedService.id, professionalId: selectedProfessional.id },
      })
      .then((res) => setSlots(res.data.slots))
      .finally(() => setLoadingSlots(false));
  }, [selectedService, selectedProfessional, selectedDate]);

  async function handleConfirm() {
    if (!user) {
      navigate('/entrar');
      return;
    }
    setConfirming(true);
    setFeedback(null);
    try {
      const { data } = await api.post('/appointments', {
        serviceId: selectedService.id,
        professionalId: selectedProfessional.id,
        date: selectedDate,
        startTime: selectedSlot,
      });
      setFeedback({
        type: 'success',
        message: 'Horário confirmado! Te esperamos na barbearia. Você vai receber um e-mail de confirmação.',
      });
      setSelectedSlot(null);
      // Atualiza a lista de horários (o que acabou de ser reservado some da lista)
      const res = await api.get('/appointments/available-slots', {
        params: { date: selectedDate, serviceId: selectedService.id, professionalId: selectedProfessional.id },
      });
      setSlots(res.data.slots);
    } catch (err) {
      setFeedback({
        type: 'error',
        message: err.response?.data?.error || 'Não foi possível confirmar. Tente outro horário.',
      });
    } finally {
      setConfirming(false);
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <p className="text-brass-400 text-xs uppercase tracking-[0.2em] mb-2">Agendamento</p>
      <h1 className="font-display text-4xl text-cream mb-3">Marque seu horário</h1>
      <p className="text-cream/50 mb-10">
        Escolha o serviço, o dia e o horário que preferir. Confirmação na hora, sem espera.
      </p>

      {/* Passo 1: serviço */}
      <section className="mb-10">
        <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-4">1. Serviço</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {services.map((s) => (
            <ServiceCard
              key={s.id}
              service={s}
              selected={selectedService?.id === s.id}
              onSelect={setSelectedService}
            />
          ))}
        </div>
      </section>

      {/* Passo 2: profissional */}
      {selectedService && (
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-4">2. Profissional</h2>
          <div className="grid sm:grid-cols-2 gap-3">
            {professionals.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedProfessional(p)}
                className={`text-left rounded-2xl border p-5 transition-all duration-200 ${
                  selectedProfessional?.id === p.id
                    ? 'border-brass-500 bg-brass-500/10 shadow-[0_0_0_1px_rgba(193,147,78,0.4)]'
                    : 'border-charcoal-700 bg-charcoal-900 hover:border-brass-600/60'
                }`}
              >
                <h3 className="font-display text-lg text-cream">{p.name}</h3>
                {p.role && <p className="text-sm text-cream/60 mt-1">{p.role}</p>}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Passo 3: dia */}
      {selectedService && selectedProfessional && (
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-4">3. Dia</h2>
          <div className="flex gap-2 overflow-x-auto pb-2">
            {days.map((d) => {
              const iso = toISODate(d);
              const isSelected = iso === selectedDate;
              return (
                <button
                  key={iso}
                  onClick={() => setSelectedDate(iso)}
                  className={`flex-shrink-0 w-16 rounded-xl border py-3 text-center transition-colors ${
                    isSelected
                      ? 'bg-brass-500 border-brass-500 text-charcoal-950'
                      : 'border-charcoal-700 text-cream/70 hover:border-brass-500'
                  }`}
                >
                  <div className="text-[10px] uppercase">
                    {d.toLocaleDateString('pt-BR', { weekday: 'short' })}
                  </div>
                  <div className="font-display text-lg">{d.getDate()}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* Passo 4: horário */}
      {selectedService && selectedProfessional && (
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-4">4. Horário</h2>
          <TimeSlotPicker
            slots={slots}
            loading={loadingSlots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
        </section>
      )}

      {feedback && (
        <p className={`text-sm mb-4 ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}>
          {feedback.message}
        </p>
      )}

      {selectedService && selectedProfessional && selectedSlot && (
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full sm:w-auto bg-brass-500 text-charcoal-950 font-semibold px-8 py-3 rounded-full hover:bg-brass-400 transition-colors disabled:opacity-50"
        >
          {confirming
            ? 'Confirmando...'
            : `Confirmar ${selectedService.name} com ${selectedProfessional.name} às ${selectedSlot}`}
        </button>
      )}
    </div>
  );
}
