import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, AlertCircle, Eye, EyeOff, Loader } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { iniciarSesion, cargandoUsuarios } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ correo: '', password: '' });
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);
  const [verPassword, setVerPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setCargando(true);
    const res = iniciarSesion(form.correo, form.password);
    setCargando(false);
    if (res.exito) {
      navigate(res.usuario?.rol === 'Ventas' ? '/fuerza-ventas' : '/dashboard');
    } else {
      setError(res.mensaje);
    }
  };

  return (
    <div
      className="relative flex-1 w-full min-h-screen flex items-center justify-center px-4"
      style={{ background: '#0F172A' }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">

          {/* Logo + títulos */}
          <div className="px-8 pt-8 pb-6 text-center border-b border-gray-100">
            <img
              src="/logo.png"
              alt="Concremovil"
              className="h-16 mx-auto object-contain mb-4"
            />
            <h1 className="text-xl font-bold text-gray-900">Dashboard de Ventas</h1>
            <p className="text-sm text-slate-400 mt-1">
              Concremovil — Inicia sesión para continuar
            </p>
          </div>

          {/* Formulario */}
          <form onSubmit={handleSubmit} className="px-8 pt-6 pb-8 space-y-5">

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 text-sm text-red-600">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Correo Electrónico
              </label>
              <input
                type="email"
                required
                value={form.correo}
                onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                placeholder="correo@empresa.com"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-800 placeholder:text-slate-300 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-colors"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={verPassword ? 'text' : 'password'}
                  required
                  value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 pr-11 text-sm text-gray-800 focus:outline-none focus:border-brand-red focus:ring-2 focus:ring-brand-red/10 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setVerPassword((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {verPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {cargandoUsuarios ? (
              <div className="flex items-center justify-center gap-2 py-3 text-sm text-slate-400">
                <Loader className="w-4 h-4 animate-spin" />
                Cargando usuarios…
              </div>
            ) : (
              <button
                type="submit"
                disabled={cargando}
                className="w-full flex items-center justify-center gap-2 bg-brand-red text-white py-3 rounded-xl text-sm font-semibold tracking-wide hover:bg-red-700 active:scale-[0.98] transition-all disabled:opacity-60 mt-1"
              >
                {cargando
                  ? <><Loader className="w-4 h-4 animate-spin" /> Entrando…</>
                  : <><LogIn className="w-4 h-4" /> Iniciar Sesión</>
                }
              </button>
            )}
          </form>

        </div>
      </div>

      {/* Barra roja en el fondo */}
      <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-brand-red" />
    </div>
  );
}
