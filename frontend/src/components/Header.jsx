import { Link, useNavigate } from 'react-router-dom';

export default function Header({ user, onLogout }) {
  const navigate = useNavigate();

  return (
    <header className="border-b border-charcoal-700 bg-charcoal-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <span className="font-display text-2xl tracking-tight text-cream">
            Corte<span className="text-brass-500">Certo</span>
          </span>
        </Link>

        <nav className="flex items-center gap-6 text-sm">
          {user?.role === 'ADMIN' && (
            <>
              <Link to="/admin" className="text-cream/70 hover:text-brass-400 transition-colors">
                Agenda
              </Link>
              <Link to="/admin/equipe" className="text-cream/70 hover:text-brass-400 transition-colors">
                Equipe
              </Link>
            </>
          )}
          {user?.role === 'CLIENT' && (
            <Link to="/minha-agenda" className="text-cream/70 hover:text-brass-400 transition-colors">
              Meus horários
            </Link>
          )}
          {user ? (
            <>
              <button
                onClick={() => {
                  onLogout();
                  navigate('/entrar');
                }}
                className="text-cream/70 hover:text-brass-400 transition-colors"
              >
                Sair
              </button>
              <span className="text-brass-400 text-xs uppercase tracking-wider border border-brass-600/40 rounded-full px-3 py-1">
                {user.name.split(' ')[0]}
              </span>
            </>
          ) : (
            <Link
              to="/entrar"
              className="bg-brass-500 text-charcoal-950 font-semibold px-4 py-2 rounded-full hover:bg-brass-400 transition-colors"
            >
              Entrar
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
