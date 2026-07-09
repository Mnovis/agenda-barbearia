export default function TimeSlotPicker({ slots, loading, selected, onSelect }) {
  if (loading) {
    return <p className="text-cream/50 text-sm">Carregando horários disponíveis...</p>;
  }

  if (!slots.length) {
    return (
      <p className="text-cream/50 text-sm border border-charcoal-700 rounded-xl p-4">
        Nenhum horário livre nesta data. Tente outro dia.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
      {slots.map((slot) => (
        <button
          key={slot}
          onClick={() => onSelect(slot)}
          className={`py-2 rounded-lg text-sm font-medium border transition-colors ${
            selected === slot
              ? 'bg-brass-500 border-brass-500 text-charcoal-950'
              : 'border-charcoal-700 text-cream/80 hover:border-brass-500'
          }`}
        >
          {slot}
        </button>
      ))}
    </div>
  );
}
