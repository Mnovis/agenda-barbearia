import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../api';

export default function Login({ onLogin }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const endpoint = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload =
        mode === 'login'
          ? { email: form.email, password: form.password }
          : form;
      const { data } = await api.post(endpoint, payload);
      onLogin(data.user, data.token);
      const fallback = data.user.role === 'ADMIN' ? '/admin' : '/agendar';
      navigate(location.state?.from?.pathname || fallback, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Algo deu errado. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="font-display text-3xl text-cream mb-1">
        {mode === 'login' ? 'Bem-vindo de volta' : 'Criar conta'}
      </h1>
      <p className="text-cream/50 text-sm mb-8">
        {mode === 'login'
          ? 'Entre para gerenciar seus agendamentos.'
          : 'Cadastre-se para marcar seu horário em segundos.'}
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'register' && (
          <div>
            <label className="text-xs uppercase tracking-wider text-cream/50">Nome completo</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="mt-1 w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-brass-500"
            />
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wider text-cream/50">E-mail</label>
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="mt-1 w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-brass-500"
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wider text-cream/50">Senha</label>
          <input
            required
            type="password"
            minLength={6}
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="mt-1 w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-brass-500"
          />
        </div>

        {mode === 'register' && (
          <div>
            <label className="text-xs uppercase tracking-wider text-cream/50">Telefone (opcional)</label>
            <input
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="mt-1 w-full bg-charcoal-900 border border-charcoal-700 rounded-lg px-4 py-3 text-cream focus:outline-none focus:border-brass-500"
            />
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-brass-500 text-charcoal-950 font-semibold py-3 rounded-lg hover:bg-brass-400 transition-colors disabled:opacity-50"
        >
          {loading ? 'Enviando...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
        </button>
      </form>

      <button
        onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
        className="text-sm text-cream/50 hover:text-brass-400 mt-6 block mx-auto"
      >
        {mode === 'login' ? 'Ainda não tem conta? Cadastre-se' : 'Já tem conta? Entrar'}
      </button>
    </div>
  );
}
