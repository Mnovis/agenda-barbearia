function formatPrice(cents) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export default function ServiceCard({ service, selected, onSelect }) {
  return (
    <button
      onClick={() => onSelect(service)}
      className={`text-left w-full rounded-2xl border p-5 transition-all duration-200 ${
        selected
          ? 'border-brass-500 bg-brass-500/10 shadow-[0_0_0_1px_rgba(193,147,78,0.4)]'
          : 'border-charcoal-700 bg-charcoal-900 hover:border-brass-600/60'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-lg text-cream">{service.name}</h3>
          {service.description && (
            <p className="text-sm text-cream/60 mt-1">{service.description}</p>
          )}
        </div>
        <span className="font-display text-brass-400 text-lg whitespace-nowrap">
          {formatPrice(service.priceCents)}
        </span>
      </div>
      <p className="text-xs text-cream/40 mt-3 uppercase tracking-wider">
        {service.durationMin} min
      </p>
    </button>
  );
}
