import { useEffect, useState } from 'react';
import api from '../api';

export default function ManageProfessionals() {
  const [professionals, setProfessionals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', role: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    setLoading(true);
    api.get('/professionals/all').then((res) => setProfessionals(res.data)).finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleAdd(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await api.post('/professionals', form);
      setForm({ name: '', role: '' });
      load();
    } catch (err) {
      setError(err.response?.data?.error || 'Não foi possível adicionar.');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(professional) {
    if (professional.active) {
      // Remover = soft delete (desativa), preserva o histórico de agendamentos antigos
      await api.delete(`/professionals/${professional.id}`);
    } else {
      await api.patch(`/professionals/${professional.id}`, { active: true });
    }
    load();
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-14">
      <p className="text-brass-400 text-xs uppercase tracking-[0.2em] mb-2">Painel do Parceiro</p>
      <h1 className="font-display text-3xl text-cream mb-8">Equipe</h1>

      <form onSubmit={handleAdd} className="border border-charcoal-700 rounded-xl p-5 mb-10 space-y-3">
        <h2 className="text-sm uppercase tracking-wider text-cream/40 mb-1">Adicionar funcionário</h2>
        <div className="flex gap-3">
          <input
            required
            placeholder="Nome"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="flex-1 bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-brass-500"
          />
          <input
            placeholder="Função (opcional)"
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="flex-1 bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-2 text-cream focus:outline-none focus:border-brass-500"
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-brass-500 text-charcoal-950 font-semibold px-5 py-2 rounded-lg hover:bg-brass-400 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
      </form>

      {loading && <p className="text-cream/50">Carregando...</p>}

      <div className="space-y-2">
        {professionals.map((p) => (
          <div
            key={p.id}
            className={`border rounded-xl p-4 flex items-center justify-between ${
              p.active ? 'border-charcoal-700' : 'border-charcoal-800 bg-charcoal-900/40'
            }`}
          >
            <div>
              <p className={p.active ? 'text-cream' : 'text-cream/50'}>{p.name}</p>
              {p.role && <p className="text-sm text-cream/50">{p.role}</p>}
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`text-xs rounded-full px-3 py-1 border ${
                  p.active ? 'text-green-400 border-green-400/30' : 'text-cream/40 border-cream/20'
                }`}
              >
                {p.active ? 'Ativo' : 'Inativo'}
              </span>
              <button
                onClick={() => toggleActive(p)}
                className="text-xs text-cream/40 hover:text-brass-400 transition-colors"
              >
                {p.active ? 'Remover' : 'Reativar'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
