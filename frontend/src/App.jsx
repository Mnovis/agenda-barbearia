import { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import Header from './components/Header';
import Login from './pages/Login';
import Booking from './pages/Booking';
import MyAppointments from './pages/MyAppointments';
import AdminDashboard from './pages/AdminDashboard';
import ManageProfessionals from './pages/ManageProfessionals';

function Landing() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-24 text-center">
      <p className="text-brass-400 text-xs uppercase tracking-[0.3em] mb-4">Barbearia · Agendamento online</p>
      <h1 className="font-display text-5xl sm:text-6xl text-cream leading-tight mb-6">
        Seu horário garantido,<br />sem fila de espera.
      </h1>
      <p className="text-cream/50 max-w-xl mx-auto mb-10">
        Escolha o serviço, veja os horários livres em tempo real e confirme em segundos.
        Sem ligação, sem grupo de WhatsApp lotado.
      </p>
      <Link
        to="/agendar"
        className="inline-block bg-brass-500 text-charcoal-950 font-semibold px-8 py-3 rounded-full hover:bg-brass-400 transition-colors"
      >
        Agendar agora
      </Link>
    </div>
  );
}

function ProtectedRoute({ user, role, clientOnly, children }) {
  const location = useLocation();

  // Guarda para onde o usuário queria ir, para o Login redirecionar de volta
  // depois de autenticar — sem isso, a escolha de serviço/dia/horário se perdia.
  if (!user) return <Navigate to="/entrar" replace state={{ from: location }} />;
  if (role && user.role !== role) return <Navigate to="/agendar" replace />;
  // Páginas de cliente (landing, agendar, meus horários) não fazem sentido para
  // o admin — ele não marca horário para si mesmo, ele gerencia a agenda.
  if (clientOnly && user.role === 'ADMIN') return <Navigate to="/admin" replace />;
  return children;
}

export default function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (stored) setUser(JSON.parse(stored));
  }, []);

  function handleLogin(userData, token) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    setUser(userData);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }

  return (
    <div className="min-h-screen bg-charcoal-950">
      <Header user={user} onLogout={handleLogout} />
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute user={user} clientOnly>
              <Landing />
            </ProtectedRoute>
          }
        />
        <Route path="/entrar" element={<Login onLogin={handleLogin} />} />
        <Route
          path="/agendar"
          element={
            <ProtectedRoute user={user} clientOnly>
              <Booking user={user} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/minha-agenda"
          element={
            <ProtectedRoute user={user} clientOnly>
              <MyAppointments />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute user={user} role="ADMIN">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/equipe"
          element={
            <ProtectedRoute user={user} role="ADMIN">
              <ManageProfessionals />
            </ProtectedRoute>
          }
        />
      </Routes>
    </div>
  );
}
