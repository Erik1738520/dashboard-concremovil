import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { cargarUsuarios, invalidarCacheHoja } from '../api/sheetsService';
import { crearUsuarioSheet, actualizarUsuarioSheet, eliminarUsuarioSheet } from '../api/appsScriptService';

const AuthContext = createContext(null);
const LS_SESION = 'mm_sesion';

export function AuthProvider({ children }) {
  const [usuario, setUsuario]             = useState(null);
  const [usuariosSheet, setUsuariosSheet] = useState([]);
  const [cargandoUsuarios, setCargandoUsuarios] = useState(true);

  // Migración: eliminar delta localStorage de versión anterior
  useEffect(() => { localStorage.removeItem('mm_usuarios_delta'); }, []);

  useEffect(() => {
    cargarUsuarios()
      .then(setUsuariosSheet)
      .catch(() => setUsuariosSheet([]))
      .finally(() => setCargandoUsuarios(false));
  }, []);

  useEffect(() => {
    try {
      const sesion = localStorage.getItem(LS_SESION);
      if (sesion) setUsuario(JSON.parse(sesion));
    } catch { /* sesión inválida */ }
  }, []);

  const recargarUsuarios = useCallback(async () => {
    invalidarCacheHoja('Usuarios');
    try {
      const data = await cargarUsuarios();
      setUsuariosSheet(data);
    } catch (err) {
      console.error('Error recargando usuarios:', err);
    }
  }, []);

  const iniciarSesion = (correo, password) => {
    if (cargandoUsuarios) return { exito: false, mensaje: 'Cargando usuarios, intenta en un momento.' };

    const correoBusq = correo.trim().toLowerCase();
    const passBusq   = password.trim();

    const encontrado = usuariosSheet.find(u => u.correo === correoBusq);
    if (!encontrado)   return { exito: false, mensaje: `Correo no encontrado. (${usuariosSheet.length} usuarios cargados)` };
    if (String(encontrado.estatus).toLowerCase() !== 'activo') return { exito: false, mensaje: 'Usuario inactivo.' };
    if (encontrado.password !== passBusq) return { exito: false, mensaje: 'Contraseña incorrecta.' };

    const sesion = { ...encontrado, ultimoAcceso: new Date().toISOString() };
    localStorage.setItem(LS_SESION, JSON.stringify(sesion));
    setUsuario(sesion);
    return { exito: true, usuario: sesion };
  };

  const cerrarSesion = () => {
    localStorage.removeItem(LS_SESION);
    setUsuario(null);
  };

  const crearUsuario = async (form) => {
    const correoNorm = form.correo.trim().toLowerCase();
    if (usuariosSheet.find(u => u.correo === correoNorm)) {
      return { exito: false, mensaje: 'Ya existe un usuario con ese correo.' };
    }
    try {
      await crearUsuarioSheet({
        nombre:   form.nombre.trim(),
        correo:   correoNorm,
        password: form.password.trim(),
        rol:      form.rol || 'Administrador',
        cve_age:  form.cve_age || '',
      });
      await recargarUsuarios();
      return { exito: true };
    } catch (err) {
      return { exito: false, mensaje: err.message || 'Error al crear usuario.' };
    }
  };

  const actualizarUsuario = async (id, cambios) => {
    // Actualización optimista inmediata en UI
    setUsuariosSheet(prev => prev.map(u => u.id === id ? { ...u, ...cambios } : u));
    try {
      await actualizarUsuarioSheet({ id, ...cambios });
      await recargarUsuarios();
    } catch (err) {
      console.warn('Apps Script: no se pudo actualizar en la hoja:', err.message);
    }
    return { exito: true };
  };

  const eliminarUsuario = async (id) => {
    // Eliminación optimista inmediata en UI
    setUsuariosSheet(prev => prev.filter(u => u.id !== id));
    try {
      await eliminarUsuarioSheet(id);
      await recargarUsuarios();
      return { exito: true };
    } catch (err) {
      await recargarUsuarios(); // restaurar si falló
      return { exito: false, mensaje: err.message || 'Error al eliminar usuario.' };
    }
  };

  const PERMISOS = {
    Administrador:    ['dashboard', 'fuerza-ventas', 'agentes', 'productos', 'usuarios', 'visitas', 'otras-aplicaciones'],
    Dirección:        ['dashboard', 'fuerza-ventas', 'visitas', 'productos', 'otras-aplicaciones'],
    'Gerente ventas': ['dashboard', 'fuerza-ventas', 'visitas', 'otras-aplicaciones'],
    Ventas:           ['fuerza-ventas', 'visitas', 'otras-aplicaciones'],
  };

  const tienePermiso = (modulo) => {
    if (!usuario) return false;
    return (PERMISOS[usuario.rol] || []).includes(modulo);
  };

  return (
    <AuthContext.Provider value={{
      usuario,
      usuarios: usuariosSheet,
      cargandoUsuarios,
      iniciarSesion,
      cerrarSesion,
      tienePermiso,
      crearUsuario,
      actualizarUsuario,
      eliminarUsuario,
      recargarUsuarios,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider');
  return ctx;
}
