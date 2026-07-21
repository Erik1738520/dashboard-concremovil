import { useState, useMemo } from 'react';
import { UserPlus, Search, Edit2, Trash2, RefreshCw } from 'lucide-react';

import Header from '../components/Header';
import DataTable from '../components/DataTable';
import AvatarAgente from '../components/AvatarAgente';
import { useToast } from '../components/Toast';
import { useAuth } from '../context/AuthContext';
import { useDatos } from '../context/DataContext';

const ROLES = ['Administrador', 'Dirección', 'Gerente ventas', 'Ventas'];

const FORMULARIO_VACIO = { nombre: '', correo: '', password: '', rol: 'Administrador', cve_age: '', estatus: 'Activo' };

export default function Usuarios() {
  const { usuarios, crearUsuario, actualizarUsuario, eliminarUsuario, recargarUsuarios, usuario: usuarioActual } = useAuth();
  const { agentes } = useDatos();
  const mostrarToast = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState(FORMULARIO_VACIO);
  const [errores, setErrores] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [recargando, setRecargando] = useState(false);

  const usuariosFiltrados = useMemo(() =>
    usuarios.filter((u) =>
      !busqueda ||
      u.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo.toLowerCase().includes(busqueda.toLowerCase())
    ), [usuarios, busqueda]
  );

  const validar = () => {
    const e = {};
    if (!form.nombre.trim()) e.nombre = 'El nombre es obligatorio';
    if (!form.correo.includes('@')) e.correo = 'Correo inválido';
    if (!editando && !form.password.trim()) e.password = 'La contraseña es obligatoria';
    if (!form.rol) e.rol = 'Selecciona un rol';
    if (form.rol === 'Ventas' && !form.cve_age.trim()) e.cve_age = 'La clave de agente es obligatoria para el rol Ventas';
    return e;
  };

  const handleGuardar = async () => {
    const e = validar();
    if (Object.keys(e).length > 0) { setErrores(e); return; }

    setGuardando(true);
    if (editando) {
      const cambios = {
        nombre:  form.nombre,
        rol:     form.rol,
        cve_age: form.rol === 'Ventas' ? form.cve_age.trim() : '',
        estatus: form.estatus,
      };
      if (form.password.trim()) cambios.password = form.password;
      const res = await actualizarUsuario(editando, cambios);
      if (res.exito) { mostrarToast('Usuario actualizado.', 'exito'); cerrarModal(); }
    } else {
      const res = await crearUsuario(form);
      if (res.exito) { mostrarToast('Usuario creado.', 'exito'); cerrarModal(); }
      else mostrarToast(res.mensaje, 'error');
    }
    setGuardando(false);
  };

  const handleEliminar = async (u) => {
    if (u.id === usuarioActual?.id) {
      mostrarToast('No puedes eliminar tu propia cuenta.', 'aviso');
      return;
    }
    if (!window.confirm(`¿Eliminar al usuario "${u.nombre}"? Esta acción no se puede deshacer.`)) return;

    const res = await eliminarUsuario(u.id);
    if (res.exito) mostrarToast('Usuario eliminado.', 'exito');
    else mostrarToast(res.mensaje || 'Error al eliminar.', 'error');
  };

  const handleRecargar = async () => {
    setRecargando(true);
    await recargarUsuarios();
    setRecargando(false);
    mostrarToast('Lista actualizada desde Google Sheets.', 'exito');
  };

  const abrirEditar = (u) => {
    setEditando(u.id);
    setForm({ nombre: u.nombre, correo: u.correo, password: '', rol: u.rol, cve_age: u.cve_age || '', estatus: u.estatus || 'Activo' });
    setErrores({});
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setEditando(null);
    setForm(FORMULARIO_VACIO);
    setErrores({});
  };

  const columnas = [
    {
      key: 'nombre', label: 'Usuario',
      render: (v, fila) => (
        <div className="flex items-center gap-3">
          <AvatarAgente nombre={v} indice={usuarios.indexOf(fila)} />
          <div>
            <p className="font-medium text-gray-800">{v}</p>
            <p className="text-xs text-slate-400">{fila.correo}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'rol', label: 'Rol', align: 'center',
      render: (v) => (
        <span className="text-xs font-medium bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full">{v}</span>
      ),
    },
    {
      key: 'estatus', label: 'Estatus', align: 'center',
      render: (v) => (
        <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
          ${v === 'Activo' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
          {v}
        </span>
      ),
    },
    {
      key: 'cve_age', label: 'Clave agente',
      render: (v) => v ? <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded">{v}</span> : <span className="text-slate-300">—</span>,
    },
    {
      key: 'acciones', label: 'Acciones', align: 'center', sortable: false,
      render: (_, fila) => (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => abrirEditar(fila)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
            title="Editar"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleEliminar(fila)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Eliminar"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header titulo="Usuarios y Accesos" />

      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4 mb-4 md:mb-6">
          {ROLES.map((rol) => {
            const count = usuarios.filter((u) => u.rol === rol).length;
            return (
              <div key={rol} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
                <p className="text-2xl font-bold text-gray-900">{count}</p>
                <p className="text-xs text-slate-400 mt-1">{rol}</p>
              </div>
            );
          })}
        </div>

        {/* Controles */}
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar usuario…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red"
            />
          </div>
          <button
            onClick={handleRecargar}
            disabled={recargando}
            className="p-2 border border-gray-200 rounded-xl text-slate-400 hover:text-brand-red hover:border-brand-red transition-colors disabled:opacity-50"
            title="Sincronizar con Google Sheets"
          >
            <RefreshCw className={`w-4 h-4 ${recargando ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => { setModalAbierto(true); setEditando(null); setForm(FORMULARIO_VACIO); setErrores({}); }}
            className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Usuario
          </button>
        </div>

        <DataTable columnas={columnas} datos={usuariosFiltrados} pageSize={15} emptyMessage="Sin usuarios" />
      </div>

      {/* Modal crear/editar */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {editando ? 'Editar usuario' : 'Nuevo usuario'}
            </h2>
            <div className="space-y-4">
              {[
                { key: 'nombre', label: 'Nombre', type: 'text', placeholder: 'Nombre completo' },
                { key: 'correo', label: 'Correo', type: 'email', placeholder: 'correo@empresa.com', disabled: !!editando },
                { key: 'password', label: editando ? 'Nueva contraseña (dejar vacío para no cambiar)' : 'Contraseña', type: 'password', placeholder: '••••••••' },
              ].map(({ key, label, type, placeholder, disabled }) => (
                <div key={key}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                  <input
                    type={type}
                    value={form[key]}
                    onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                    disabled={disabled}
                    placeholder={placeholder}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-red disabled:bg-gray-50 disabled:text-slate-400"
                  />
                  {errores[key] && <p className="text-xs text-red-500 mt-1">{errores[key]}</p>}
                </div>
              ))}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                <select
                  value={form.rol}
                  onChange={(e) => setForm((f) => ({ ...f, rol: e.target.value, cve_age: '' }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
                >
                  {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
                </select>
                {errores.rol && <p className="text-xs text-red-500 mt-1">{errores.rol}</p>}
              </div>

              {form.rol === 'Ventas' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Agente <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={form.cve_age}
                    onChange={(e) => setForm((f) => ({ ...f, cve_age: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
                  >
                    <option value="">— Seleccionar agente —</option>
                    {agentes
                      .filter((a) => a.cve_age)
                      .sort((a, b) => String(a.cve_age).localeCompare(String(b.cve_age), 'es', { numeric: true }))
                      .map((a) => (
                        <option key={a.cve_age} value={String(a.cve_age)}>
                          {a.cve_age} — {a['Nombre vendedor'] || a['Nombre'] || ''}
                        </option>
                      ))
                    }
                  </select>
                  {errores.cve_age && <p className="text-xs text-red-500 mt-1">{errores.cve_age}</p>}
                </div>
              )}

              {editando && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estatus</label>
                  <select
                    value={form.estatus}
                    onChange={(e) => setForm((f) => ({ ...f, estatus: e.target.value }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
                  >
                    <option value="Activo">Activo</option>
                    <option value="Inactivo">Inactivo</option>
                  </select>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={cerrarModal} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={handleGuardar}
                disabled={guardando}
                className="flex-1 bg-brand-red text-white py-2 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-60"
              >
                {guardando ? 'Guardando…' : editando ? 'Guardar cambios' : 'Crear usuario'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
