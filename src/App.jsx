import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';

import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ToastProvider } from './components/Toast';

import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import FuerzaVentas from './pages/FuerzaVentas';
import Agentes from './pages/Agentes';
import Productos from './pages/Productos';
import Usuarios from './pages/Usuarios';
import Visitas from './pages/Visitas';
import OtrasAplicaciones from './pages/OtrasAplicaciones';

/** Layout autenticado: Sidebar + contenido */
function LayoutPrincipal() {
  const { usuario } = useAuth();
  if (!usuario) return <Navigate to="/login" replace />;
  return (
    <div className="flex w-full h-screen overflow-hidden bg-surface">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
    </div>
  );
}

/** Redirige al módulo de inicio según el rol */
function RutaInicio() {
  const { usuario } = useAuth();
  const destino = usuario?.rol === 'Ventas' ? '/fuerza-ventas' : '/dashboard';
  return <Navigate to={destino} replace />;
}

/** Ruta protegida por permiso de módulo */
function RutaProtegida({ modulo, element }) {
  const { tienePermiso, usuario } = useAuth();
  if (!tienePermiso(modulo)) {
    const inicio = usuario?.rol === 'Ventas' ? '/fuerza-ventas' : '/dashboard';
    return <Navigate to={inicio} replace />;
  }
  return element;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <ToastProvider>
          <DataProvider>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route element={<LayoutPrincipal />}>
                <Route index element={<RutaInicio />} />
                <Route path="/dashboard"     element={<RutaProtegida modulo="dashboard"     element={<Dashboard />} />} />
                <Route path="/fuerza-ventas" element={<RutaProtegida modulo="fuerza-ventas" element={<FuerzaVentas />} />} />
                <Route path="/agentes"       element={<RutaProtegida modulo="agentes"       element={<Agentes />} />} />
                <Route path="/productos"     element={<RutaProtegida modulo="productos"     element={<Productos />} />} />
                <Route path="/usuarios"      element={<RutaProtegida modulo="usuarios"      element={<Usuarios />} />} />
                <Route path="/visitas"            element={<Visitas />} />
                <Route path="/otras-aplicaciones" element={<RutaProtegida modulo="otras-aplicaciones" element={<OtrasAplicaciones />} />} />
              </Route>
              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </DataProvider>
        </ToastProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
