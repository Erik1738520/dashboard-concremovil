import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, Package, ShieldCheck,
  ChevronLeft, ChevronRight, LogOut, MapPin, MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { inicial } from '../utils/formatters';

const MENU = [
  { path: '/dashboard',      label: 'Dashboard',        icono: LayoutDashboard, modulo: 'dashboard' },
  { path: '/fuerza-ventas',  label: 'Fuerza de Ventas', icono: Users,           modulo: 'fuerza-ventas' },
  { path: '/visitas',        label: 'Visitas',           icono: MapPin,          modulo: null },
  { path: '/agentes',        label: 'Agentes',           icono: UserCheck,       modulo: 'agentes' },
  { path: '/productos',      label: 'Productos',         icono: Package,         modulo: 'productos' },
  { path: '/usuarios',       label: 'Usuarios',          icono: ShieldCheck,     modulo: 'usuarios' },
];

const BOTTOM_LABELS = {
  '/dashboard':     'Dashboard',
  '/fuerza-ventas': 'Fuerza',
  '/visitas':       'Visitas',
  '/agentes':       'Agentes',
  '/productos':     'Productos',
  '/usuarios':      'Usuarios',
};

/* ─── Tab individual del bottom nav ─────────────────────────── */
function BottomTab({ path, icono: Icono }) {
  const label = BOTTOM_LABELS[path];
  return (
    <NavLink to={path} className="flex-1 min-w-0">
      {({ isActive }) => (
        <div className={`flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 text-[10px] font-medium w-full transition-colors
          ${isActive ? 'text-white' : 'text-slate-400'}`}>
          <div className={`p-1.5 rounded-xl transition-colors ${isActive ? 'bg-brand-red' : ''}`}>
            <Icono className="w-5 h-5" />
          </div>
          <span className="leading-none truncate max-w-[48px] text-center">{label}</span>
        </div>
      )}
    </NavLink>
  );
}

/* ─── Componente principal ───────────────────────────────────── */
export default function Sidebar() {
  const [colapsado,  setColapsado]  = useState(false);
  const [masAbierto, setMasAbierto] = useState(false);
  const { usuario, cerrarSesion, tienePermiso } = useAuth();
  const navigate = useNavigate();

  const handleCerrarSesion = () => { cerrarSesion(); navigate('/login'); };

  const itemsVisibles = MENU.filter(({ modulo }) => modulo === null || tienePermiso(modulo));
  const MAX_TABS    = 4;
  const bottomTabs  = itemsVisibles.slice(0, MAX_TABS);
  const drawerItems = itemsVisibles.slice(MAX_TABS);
  const tieneDrawer = drawerItems.length > 0;

  return (
    <>
      {/* ════════════════ DESKTOP SIDEBAR ════════════════════════ */}
      <aside
        className="hidden md:flex flex-col h-full bg-sidebar text-white transition-all duration-300 shrink-0"
        style={{ width: colapsado ? '72px' : '220px' }}
      >
        {/* Logo */}
        <div className={`flex items-center border-b border-slate-700/60 ${colapsado ? 'justify-center px-3 py-[14px]' : 'px-4 py-[14px]'}`}>
          {colapsado ? (
            <div className="w-9 h-9 bg-brand-red rounded-lg flex items-center justify-center shrink-0">
              <span className="text-white text-xs font-bold">CM</span>
            </div>
          ) : (
            <img src="/logo-nuevo.png" alt="Concremovil" className="h-10 object-contain object-left" />
          )}
        </div>

        {/* Navegación */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
          {MENU.map(({ path, icono: Icono, label, modulo }) => {
            if (modulo !== null && !tienePermiso(modulo)) return null;
            return (
              <NavLink
                key={path}
                to={path}
                title={colapsado ? label : undefined}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm font-medium
                   ${isActive
                     ? 'bg-brand-red text-white'
                     : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`
                }
              >
                <Icono className="w-5 h-5 shrink-0" />
                {!colapsado && <span>{label}</span>}
              </NavLink>
            );
          })}
        </nav>

        {/* Imagen camión */}
        {!colapsado && (
          <div className="px-3 pb-3 camion-contenedor">
            <img src="/CR.png" alt="Concremovil" className="w-full object-contain opacity-90 camion-animado" />
          </div>
        )}

        {/* Botón colapsar */}
        <button
          onClick={() => setColapsado(!colapsado)}
          className={`flex items-center gap-2 border-t border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition-colors
            ${colapsado ? 'justify-center px-3 py-3' : 'px-4 py-3'}`}
        >
          {colapsado
            ? <ChevronRight className="w-4 h-4" />
            : <><ChevronLeft className="w-4 h-4" /><span>Contraer</span></>
          }
        </button>

        {/* Tarjeta de usuario */}
        {usuario && (
          <div className="border-t border-slate-700/60 p-3">
            <div className={`flex items-center gap-2.5 ${colapsado ? 'justify-center' : ''}`}>
              <div className="w-9 h-9 rounded-full bg-brand-red flex items-center justify-center font-semibold text-sm shrink-0">
                {inicial(usuario.nombre)}
              </div>
              {!colapsado && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate leading-snug">{usuario.nombre}</p>
                  <p className="text-xs text-slate-400 truncate leading-snug">{usuario.rol}</p>
                </div>
              )}
            </div>
            <button
              onClick={handleCerrarSesion}
              title="Cerrar sesión"
              className={`mt-3 flex items-center gap-2 text-sm font-medium text-white bg-brand-red hover:bg-red-700 transition-colors rounded-lg px-3 py-2.5
                ${colapsado ? 'justify-center w-full' : 'w-full'}`}
            >
              <LogOut className="w-3.5 h-3.5 shrink-0" />
              {!colapsado && <span>Cerrar sesión</span>}
            </button>
          </div>
        )}
      </aside>

      {/* ════════════════ MOBILE BOTTOM NAV ══════════════════════ */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-sidebar border-t border-slate-700 flex"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        {bottomTabs.map((item) => (
          <BottomTab key={item.path} {...item} />
        ))}

        {tieneDrawer ? (
          <button
            onClick={() => setMasAbierto(true)}
            className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 text-[10px] text-slate-400 font-medium"
          >
            <div className="p-1.5 rounded-xl">
              <MoreHorizontal className="w-5 h-5" />
            </div>
            <span className="leading-none">Más</span>
          </button>
        ) : (
          <button
            onClick={handleCerrarSesion}
            className="flex-1 flex flex-col items-center justify-center pt-2 pb-1 gap-0.5 text-[10px] text-slate-400 font-medium"
          >
            <div className="p-1.5 rounded-xl">
              <LogOut className="w-5 h-5" />
            </div>
            <span className="leading-none">Salir</span>
          </button>
        )}
      </nav>

      {/* ════════════════ MOBILE DRAWER "MÁS" ═══════════════════ */}
      {masAbierto && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMasAbierto(false)} />
          <div
            className="relative bg-sidebar rounded-t-2xl px-4 pt-3 pb-6"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}
          >
            <div className="w-10 h-1 bg-slate-600 rounded-full mx-auto mb-4" />

            {usuario && (
              <div className="flex items-center gap-3 mb-4 bg-slate-800 rounded-xl px-3 py-3">
                <div className="w-10 h-10 rounded-full bg-brand-red flex items-center justify-center font-semibold text-sm shrink-0">
                  {inicial(usuario.nombre)}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{usuario.nombre}</p>
                  <p className="text-xs text-slate-400">{usuario.rol}</p>
                </div>
              </div>
            )}

            <div className="space-y-1 mb-3">
              {drawerItems.map(({ path, icono: Icono, label }) => (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setMasAbierto(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium transition-colors
                     ${isActive ? 'bg-brand-red text-white' : 'text-slate-300 hover:bg-slate-800'}`
                  }
                >
                  <Icono className="w-5 h-5" />
                  {label}
                </NavLink>
              ))}
            </div>

            <button
              onClick={() => { setMasAbierto(false); handleCerrarSesion(); }}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl text-sm font-medium text-red-400 hover:bg-slate-800 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </>
  );
}
