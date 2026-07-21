import { useState, useMemo } from 'react';
import { UserPlus, Search, AlertTriangle } from 'lucide-react';

import Header from '../components/Header';
import DataTable from '../components/DataTable';
import AvatarAgente from '../components/AvatarAgente';
import { useToast } from '../components/Toast';

import { useDatos } from '../context/DataContext';
import { crearAgente, actualizarEstatusAgente } from '../api/appsScriptService';
import { invalidarCache } from '../api/sheetsService';

// Columna real en el Sheet
const COL_NOMBRE = 'Nombre vendedor';

// El Sheet guarda 'ACTIVO' / 'INACTIVO' en mayúsculas
function esActivo(estatus) {
  return String(estatus || 'ACTIVO').toUpperCase() !== 'INACTIVO';
}

const FILTROS_ESTATUS = ['Todos', 'Activo', 'Inactivo'];

export default function Agentes() {
  const { agentes, cargarDatos } = useDatos();
  const mostrarToast = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstatus, setFiltroEstatus] = useState('Todos');
  const [guardando, setGuardando] = useState({});
  const [modalAbierto, setModalAbierto] = useState(false);
  const [confirmacion, setConfirmacion] = useState(null);
  const [nuevoAgente, setNuevoAgente] = useState({ cve_age: '', nombre: '' });
  const [erroresForm, setErroresForm] = useState({});

  const agentesFiltrados = useMemo(() => {
    return agentes.filter((a) => {
      const matchBusqueda =
        !busqueda ||
        String(a.cve_age).toLowerCase().includes(busqueda.toLowerCase()) ||
        String(a[COL_NOMBRE] || '').toLowerCase().includes(busqueda.toLowerCase());
      const activo = esActivo(a.Estatus);
      const matchEstatus =
        filtroEstatus === 'Todos' ||
        (filtroEstatus === 'Activo' && activo) ||
        (filtroEstatus === 'Inactivo' && !activo);
      return matchBusqueda && matchEstatus;
    });
  }, [agentes, busqueda, filtroEstatus]);

  const totalActivos   = agentes.filter((a) =>  esActivo(a.Estatus)).length;
  const totalInactivos = agentes.filter((a) => !esActivo(a.Estatus)).length;

  const cambiarEstatus = async (agente, nuevoEstatus) => {
    setConfirmacion(null);
    setGuardando((g) => ({ ...g, [agente.cve_age]: true }));
    try {
      await actualizarEstatusAgente(agente.cve_age, nuevoEstatus);
      invalidarCache();
      await cargarDatos(true);
      mostrarToast(`Agente "${agente[COL_NOMBRE]}" marcado como ${nuevoEstatus}.`, 'exito');
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, 'error');
    } finally {
      setGuardando((g) => ({ ...g, [agente.cve_age]: false }));
    }
  };

  const solicitarConfirmacion = (agente) => {
    if (esActivo(agente.Estatus)) {
      setConfirmacion(agente);
    } else {
      cambiarEstatus(agente, 'ACTIVO');
    }
  };

  const validarFormulario = () => {
    const errores = {};
    if (!nuevoAgente.cve_age.trim()) errores.cve_age = 'La clave es obligatoria';
    else if (agentes.find((a) => String(a.cve_age).trim() === nuevoAgente.cve_age.trim())) {
      errores.cve_age = 'Ya existe un agente con esta clave';
    }
    if (!nuevoAgente.nombre.trim()) errores.nombre = 'El nombre es obligatorio';
    return errores;
  };

  const handleCrearAgente = async () => {
    const errores = validarFormulario();
    if (Object.keys(errores).length > 0) { setErroresForm(errores); return; }
    setGuardando((g) => ({ ...g, nuevo: true }));
    try {
      await crearAgente(nuevoAgente.cve_age.trim(), nuevoAgente.nombre.trim());
      invalidarCache();
      await cargarDatos(true);
      setModalAbierto(false);
      setNuevoAgente({ cve_age: '', nombre: '' });
      setErroresForm({});
      mostrarToast('Agente creado correctamente.', 'exito');
    } catch (err) {
      mostrarToast(`Error al crear agente: ${err.message}`, 'error');
    } finally {
      setGuardando((g) => ({ ...g, nuevo: false }));
    }
  };

  const columnas = [
    {
      key: 'cve_age', label: 'Clave',
      render: (v) => <span className="font-mono text-sm text-slate-600">{v}</span>,
    },
    {
      key: COL_NOMBRE, label: 'Nombre',
      render: (v, fila) => {
        const esND = !v || v.trim() === '#N/D';
        const display = esND ? String(fila.cve_age || '—') : v;
        return (
          <div className="flex items-center gap-3">
            <AvatarAgente nombre={display} indice={agentes.indexOf(fila)} />
            <span className="font-medium text-gray-800">{display}</span>
          </div>
        );
      },
    },
    {
      key: 'Estatus', label: 'Estatus', align: 'center', sortable: false,
      render: (v) => {
        const activo = esActivo(v);
        return (
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full
            ${activo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
            {activo ? 'Activo' : 'Inactivo'}
          </span>
        );
      },
    },
    {
      key: 'acciones', label: 'Acción', align: 'center', sortable: false,
      render: (_, fila) => {
        const activo = esActivo(fila.Estatus);
        const cargandoEste = guardando[fila.cve_age];
        return (
          <button
            onClick={() => solicitarConfirmacion(fila)}
            disabled={cargandoEste}
            className={`text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-50
              ${activo ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}
          >
            {cargandoEste ? 'Guardando…' : activo ? 'Inactivar' : 'Activar'}
          </button>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header titulo="Catálogo de Agentes" />

      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          {[
            { label: 'Total Agentes', valor: agentes.length },
            { label: 'Activos',       valor: totalActivos   },
            { label: 'Inactivos',     valor: totalInactivos },
          ].map(({ label, valor }) => (
            <div key={label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{valor}</p>
              <p className="text-xs text-slate-400 mt-1">{label}</p>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por clave o nombre…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red"
            />
          </div>

          <div className="flex rounded-xl overflow-hidden border border-gray-200">
            {FILTROS_ESTATUS.map((e) => (
              <button
                key={e}
                onClick={() => setFiltroEstatus(e)}
                className={`px-4 py-2 text-sm font-medium transition-colors
                  ${filtroEstatus === e ? 'bg-brand-red text-white' : 'bg-white text-slate-500 hover:bg-gray-50'}`}
              >
                {e}
              </button>
            ))}
          </div>

          <button
            onClick={() => { setModalAbierto(true); setNuevoAgente({ cve_age: '', nombre: '' }); setErroresForm({}); }}
            className="flex items-center gap-2 bg-brand-red text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Nuevo Agente
          </button>
        </div>

        <DataTable columnas={columnas} datos={agentesFiltrados} pageSize={20} emptyMessage="Sin agentes" />
      </div>

      {/* Modal: Crear agente */}
      {modalAbierto && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Dar de alta agente</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Clave del agente</label>
                <input
                  type="text"
                  value={nuevoAgente.cve_age}
                  onChange={(e) => setNuevoAgente((a) => ({ ...a, cve_age: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
                  placeholder="Ej: AG001"
                />
                {erroresForm.cve_age && <p className="text-xs text-red-500 mt-1">{erroresForm.cve_age}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del vendedor</label>
                <input
                  type="text"
                  value={nuevoAgente.nombre}
                  onChange={(e) => setNuevoAgente((a) => ({ ...a, nombre: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-brand-red"
                  placeholder="Nombre completo"
                />
                {erroresForm.nombre && <p className="text-xs text-red-500 mt-1">{erroresForm.nombre}</p>}
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setModalAbierto(false)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm hover:bg-gray-50">
                Cancelar
              </button>
              <button
                onClick={handleCrearAgente}
                disabled={guardando.nuevo}
                className="flex-1 bg-brand-red text-white py-2 rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                {guardando.nuevo ? 'Guardando…' : 'Crear Agente'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmación inactivar */}
      {confirmacion && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-amber-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
              </div>
              <h2 className="font-bold text-gray-900">¿Inactivar agente?</h2>
            </div>
            <p className="text-sm text-slate-600 mb-2">
              Vas a inactivar a <strong>{confirmacion[COL_NOMBRE]}</strong>.
            </p>
            <p className="text-xs text-slate-400 bg-slate-50 rounded-lg p-3">
              Sus ventas históricas seguirán apareciendo en todos los reportes.
            </p>
            <div className="flex gap-3 mt-5">
              <button onClick={() => setConfirmacion(null)} className="flex-1 border border-gray-200 text-gray-600 py-2 rounded-xl text-sm">
                Cancelar
              </button>
              <button
                onClick={() => cambiarEstatus(confirmacion, 'INACTIVO')}
                className="flex-1 bg-brand-red text-white py-2 rounded-xl text-sm font-medium"
              >
                Inactivar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
