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
  return d.toISOString().split('T')[0];
}

export default function Booking({ user }) {
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
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
  }, []);

  useEffect(() => {
    if (!selectedService) return;
    setSelectedSlot(null);
    setLoadingSlots(true);
    api
      .get('/appointments/available-slots', {
        params: { date: selectedDate, serviceId: selectedService.id },
      })
      .then((res) => setSlots(res.data.slots))
      .finally(() => setLoadingSlots(false));
  }, [selectedService, selectedDate]);

  async function handleConfirm() {
    if (!user) {
      navigate('/entrar');
      return;
    }
    setConfirming(true);
    setFeedback(null);
    try {
      await api.post('/appointments', {
        serviceId: selectedService.id,
        date: selectedDate,
        startTime: selectedSlot,
      });
      setFeedback({ type: 'success', message: 'Horário confirmado! Te esperamos na barbearia.' });
      setSelectedSlot(null);
      // Atualiza a lista de horários (o que acabou de ser reservado some da lista)
      const res = await api.get('/appointments/available-slots', {
        params: { date: selectedDate, serviceId: selectedService.id },
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

      {/* Passo 2: dia */}
      {selectedService && (
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-4">2. Dia</h2>
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

      {/* Passo 3: horário */}
      {selectedService && (
        <section className="mb-10">
          <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-4">3. Horário</h2>
          <TimeSlotPicker
            slots={slots}
            loading={loadingSlots}
            selected={selectedSlot}
            onSelect={setSelectedSlot}
          />
        </section>
      )}

      {feedback && (
        <p
          className={`text-sm mb-4 ${feedback.type === 'success' ? 'text-green-400' : 'text-red-400'}`}
        >
          {feedback.message}
        </p>
      )}

      {selectedService && selectedSlot && (
        <button
          onClick={handleConfirm}
          disabled={confirming}
          className="w-full sm:w-auto bg-brass-500 text-charcoal-950 font-semibold px-8 py-3 rounded-full hover:bg-brass-400 transition-colors disabled:opacity-50"
        >
          {confirming
            ? 'Confirmando...'
            : `Confirmar ${selectedService.name} às ${selectedSlot}`}
        </button>
      )}
    </div>
  );
}
