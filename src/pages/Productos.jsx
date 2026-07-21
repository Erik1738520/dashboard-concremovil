import { useState, useMemo } from 'react';
import { Search, Loader, Download, ShieldOff, X, AlertTriangle } from 'lucide-react';

function IosToggle({ checked, onChange, disabled, colorOn = 'bg-green-500' }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? colorOn : 'bg-slate-300'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

import Header from '../components/Header';
import DataTable from '../components/DataTable';
import { useToast } from '../components/Toast';

import { useDatos } from '../context/DataContext';
import { actualizarEstatusProducto, desactivarProductosExcepto } from '../api/appsScriptService';
import { invalidarCache } from '../api/sheetsService';
import { truncar } from '../utils/formatters';

function normalizar(v) { return String(v || '').trim().toUpperCase(); }
function esDesactivado(v) { return normalizar(v) === 'INACTIVO'; }
function esNoContar(v)    { return normalizar(v) === 'INACTIVO'; }

export default function Productos() {
  const { productos, cargarDatos } = useDatos();
  const mostrarToast = useToast();

  const [busqueda, setBusqueda] = useState('');
  const [filtroUnidad, setFiltroUnidad] = useState('');
  const [filtroEstProd, setFiltroEstProd] = useState('');
  const [filtroEstCant, setFiltroEstCant] = useState('');
  const [porPagina, setPorPagina] = useState(25);
  const [guardando, setGuardando] = useState({});
  const [modalDesactivar, setModalDesactivar] = useState(false);
  const [procesandoMasivo, setProcesandoMasivo] = useState(false);

  const unidades = useMemo(
    () => [...new Set(productos.map((p) => p.unidad).filter(Boolean))].sort(),
    [productos]
  );

  const productosFiltrados = useMemo(() => {
    return productos.filter((p) => {
      const matchBusq =
        !busqueda ||
        String(p.cve_prod).toLowerCase().includes(busqueda.toLowerCase()) ||
        String(p.desc_prod || '').toLowerCase().includes(busqueda.toLowerCase());
      const matchUnid = !filtroUnidad || p.unidad === filtroUnidad;
      const matchEstProd =
        !filtroEstProd ||
        (filtroEstProd === 'activo' && !esDesactivado(p['Estatus producto'])) ||
        (filtroEstProd === 'inactivo' && esDesactivado(p['Estatus producto']));
      const matchEstCant =
        !filtroEstCant ||
        (filtroEstCant === 'contar' && !esNoContar(p['Estatus cantidad'])) ||
        (filtroEstCant === 'no_contar' && esNoContar(p['Estatus cantidad']));
      return matchBusq && matchUnid && matchEstProd && matchEstCant;
    });
  }, [productos, busqueda, filtroUnidad, filtroEstProd, filtroEstCant]);

  // Productos que se desactivarían = los que NO están en el filtro actual
  const productosADesactivar = useMemo(
    () => productos.filter((p) => !productosFiltrados.includes(p) && normalizar(p['Estatus producto']) !== 'INACTIVO'),
    [productos, productosFiltrados]
  );

  const ejecutarDesactivacionMasiva = async () => {
    setProcesandoMasivo(true);
    try {
      const clavesMantener = productosFiltrados.map((p) => String(p.cve_prod));
      const res = await desactivarProductosExcepto(clavesMantener);
      invalidarCache();
      await cargarDatos(true);
      setModalDesactivar(false);
      mostrarToast(res.mensaje || 'Productos desactivados.', 'exito');
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, 'error');
    } finally {
      setProcesandoMasivo(false);
    }
  };

  const exportarCSV = () => {
    const columnas = [
      { key: 'cve_prod',          label: 'Clave' },
      { key: 'desc_prod',         label: 'Producto' },
      { key: 'unidad',            label: 'Unidad' },
      { key: 'Estatus producto',  label: 'Estado Producto' },
      { key: 'Estatus cantidad',  label: 'Contar Cantidad' },
    ];
    const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const header = columnas.map((c) => escape(c.label)).join(',');
    const filas  = productosFiltrados.map((p) =>
      columnas.map((c) => escape(p[c.key] ?? '')).join(',')
    );
    const csv  = [header, ...filas].join('\n');
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `productos_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totales = useMemo(() => ({
    activos: productos.filter((p) => !esDesactivado(p['Estatus producto'])).length,
    inactivos: productos.filter((p) => esDesactivado(p['Estatus producto'])).length,
    noContarCant: productos.filter((p) => esNoContar(p['Estatus cantidad'])).length,
  }), [productos]);

  const toggleEstatus = async (prod, campo, valorActual) => {
    const key = `${prod.cve_prod}_${campo}`;
    const esBool = campo === 'Estatus producto'
      ? !esDesactivado(valorActual)  // true = activo ahora → pasar a desactivado
      : !esNoContar(valorActual);    // true = contar ahora → pasar a no contar

    const nuevoValor = esBool ? 'INACTIVO' : 'ACTIVO';

    setGuardando((g) => ({ ...g, [key]: true }));
    try {
      await actualizarEstatusProducto(prod.cve_prod, campo, nuevoValor);
      invalidarCache();
      await cargarDatos(true);
      mostrarToast(`"${truncar(prod.desc_prod, 30)}" actualizado.`, 'exito');
    } catch (err) {
      mostrarToast(`Error: ${err.message}`, 'error');
    } finally {
      setGuardando((g) => ({ ...g, [key]: false }));
    }
  };

  const columnas = [
    {
      key: 'cve_prod', label: 'Clave',
      render: (v) => <span className="font-mono text-xs text-slate-600">{v}</span>,
    },
    {
      key: 'desc_prod', label: 'Producto',
      render: (v) => <span className="font-medium text-gray-800">{v || '—'}</span>,
    },
    { key: 'unidad', label: 'Unidad', align: 'center' },
    {
      key: 'Estatus producto', label: 'Estado Producto', align: 'center', sortable: false,
      render: (v, fila) => {
        const key = `${fila.cve_prod}_Estatus producto`;
        const activo = !esDesactivado(v);
        return (
          <div className="flex items-center justify-center gap-2.5">
            {guardando[key]
              ? <Loader className="w-5 h-5 animate-spin text-slate-400" />
              : <IosToggle
                  checked={activo}
                  onChange={() => toggleEstatus(fila, 'Estatus producto', v)}
                  colorOn="bg-green-500"
                />
            }
            <span className={`text-xs font-mono font-medium w-16 ${activo ? 'text-green-700' : 'text-slate-400'}`}>
              {String(v || 'ACTIVO').toUpperCase()}
            </span>
          </div>
        );
      },
    },
    {
      key: 'Estatus cantidad', label: 'Contar Cantidad', align: 'center', sortable: false,
      render: (v, fila) => {
        const key = `${fila.cve_prod}_Estatus cantidad`;
        const contar = !esNoContar(v);
        return (
          <div className="flex items-center justify-center gap-2.5">
            {guardando[key]
              ? <Loader className="w-5 h-5 animate-spin text-slate-400" />
              : <IosToggle
                  checked={contar}
                  onChange={() => toggleEstatus(fila, 'Estatus cantidad', v)}
                  colorOn="bg-blue-500"
                />
            }
            <span className={`text-xs font-mono font-medium w-16 ${contar ? 'text-blue-700' : 'text-slate-400'}`}>
              {String(v || 'ACTIVO').toUpperCase()}
            </span>
          </div>
        );
      },
    },
  ];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header titulo="Listado de Productos" />

      <div className="flex-1 overflow-y-auto p-3 md:p-6">
        {/* Tarjetas-filtro */}
        <div className="grid grid-cols-3 gap-3 md:gap-4 mb-4 md:mb-6">
          {/* Activos */}
          <button
            onClick={() => setFiltroEstProd((v) => v === 'activo' ? '' : 'activo')}
            className={`rounded-2xl border p-4 text-center transition-all duration-150 shadow-sm
              ${filtroEstProd === 'activo'
                ? 'bg-green-50 border-green-400 ring-2 ring-green-300'
                : 'bg-white border-gray-100 hover:border-green-300 hover:bg-green-50'}`}
          >
            <p className="text-2xl font-bold text-green-600">{totales.activos}</p>
            <p className="text-xs text-slate-400 mt-1">Productos activos</p>
            {filtroEstProd === 'activo' && (
              <span className="inline-block mt-1.5 text-xs font-medium text-green-600 bg-green-100 px-2 py-0.5 rounded-full">Filtrando</span>
            )}
          </button>

          {/* Desactivados */}
          <button
            onClick={() => setFiltroEstProd((v) => v === 'inactivo' ? '' : 'inactivo')}
            className={`rounded-2xl border p-4 text-center transition-all duration-150 shadow-sm
              ${filtroEstProd === 'inactivo'
                ? 'bg-red-50 border-red-400 ring-2 ring-red-300'
                : 'bg-white border-gray-100 hover:border-red-300 hover:bg-red-50'}`}
          >
            <p className="text-2xl font-bold text-red-500">{totales.inactivos}</p>
            <p className="text-xs text-slate-400 mt-1">Productos desactivados</p>
            {filtroEstProd === 'inactivo' && (
              <span className="inline-block mt-1.5 text-xs font-medium text-red-600 bg-red-100 px-2 py-0.5 rounded-full">Filtrando</span>
            )}
          </button>

          {/* No cuentan en cantidad */}
          <button
            onClick={() => setFiltroEstCant((v) => v === 'no_contar' ? '' : 'no_contar')}
            className={`rounded-2xl border p-4 text-center transition-all duration-150 shadow-sm
              ${filtroEstCant === 'no_contar'
                ? 'bg-amber-50 border-amber-400 ring-2 ring-amber-300'
                : 'bg-white border-gray-100 hover:border-amber-300 hover:bg-amber-50'}`}
          >
            <p className="text-2xl font-bold text-amber-500">{totales.noContarCant}</p>
            <p className="text-xs text-slate-400 mt-1">No cuentan en cantidad</p>
            {filtroEstCant === 'no_contar' && (
              <span className="inline-block mt-1.5 text-xs font-medium text-amber-600 bg-amber-100 px-2 py-0.5 rounded-full">Filtrando</span>
            )}
          </button>
        </div>

        {/* Controles */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por clave o descripción…"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-xl bg-white focus:outline-none focus:border-brand-red"
            />
          </div>

          <select
            value={filtroUnidad}
            onChange={(e) => setFiltroUnidad(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="">Todas las unidades</option>
            {unidades.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>

          <select
            value={filtroEstProd}
            onChange={(e) => setFiltroEstProd(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="">Estado producto: Todos</option>
            <option value="activo">Activo</option>
            <option value="inactivo">Desactivado</option>
          </select>

          <select
            value={filtroEstCant}
            onChange={(e) => setFiltroEstCant(e.target.value)}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value="">Cantidad: Todos</option>
            <option value="contar">Sí cuenta</option>
            <option value="no_contar">No cuenta</option>
          </select>

          <button
            onClick={exportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-gray-200 rounded-xl text-slate-600 hover:bg-gray-50 hover:border-brand-red hover:text-brand-red transition-colors"
          >
            <Download className="w-4 h-4" />
            Exportar CSV
          </button>

          {productosADesactivar.length > 0 && (
            <button
              onClick={() => setModalDesactivar(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-red-50 border border-red-200 rounded-xl text-red-600 hover:bg-red-100 transition-colors"
            >
              <ShieldOff className="w-4 h-4" />
              Desactivar los demás ({productosADesactivar.length})
            </button>
          )}

          <select
            value={porPagina}
            onChange={(e) => setPorPagina(Number(e.target.value))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2 bg-white focus:outline-none focus:border-brand-red"
          >
            <option value={25}>25 por página</option>
            <option value={50}>50 por página</option>
            <option value={100}>100 por página</option>
            <option value={0}>Todos</option>
          </select>
        </div>

        <div className="text-xs text-slate-400 mb-3">
          Mostrando {productosFiltrados.length} de {productos.length} productos.
          Los cambios se guardan directamente en Google Sheets vía Apps Script.
        </div>

        <DataTable
          columnas={columnas}
          datos={productosFiltrados}
          pageSize={porPagina}
          emptyMessage="Sin productos que coincidan"
        />
      </div>

      {/* Modal confirmación desactivación masiva */}
      {modalDesactivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="w-5 h-5" />
                <span className="font-bold text-gray-900">Desactivar productos</span>
              </div>
              <button onClick={() => setModalDesactivar(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="px-6 py-4 space-y-3">
              <p className="text-sm text-slate-600">
                Se marcarán como <strong>INACTIVO</strong> los{' '}
                <span className="font-bold text-red-600">{productosADesactivar.length} productos</span>{' '}
                que <strong>no</strong> están en la lista filtrada actual.
              </p>
              <p className="text-xs text-slate-400">
                Los {productosFiltrados.length} productos visibles permanecerán ACTIVO.
              </p>

              {/* Preview de los que se desactivarán */}
              <div className="bg-red-50 border border-red-100 rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-red-700 mb-2">Se desactivarán:</p>
                <div className="space-y-1">
                  {productosADesactivar.map((p) => (
                    <div key={p.cve_prod} className="flex items-center gap-2 text-xs text-red-800">
                      <span className="font-mono font-bold w-28 shrink-0">{p.cve_prod}</span>
                      <span className="truncate text-red-600">{p.desc_prod}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50">
              <button
                onClick={() => setModalDesactivar(false)}
                disabled={procesandoMasivo}
                className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={ejecutarDesactivacionMasiva}
                disabled={procesandoMasivo}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors disabled:opacity-60"
              >
                {procesandoMasivo
                  ? <><Loader className="w-4 h-4 animate-spin" /> Procesando…</>
                  : <><ShieldOff className="w-4 h-4" /> Confirmar desactivación</>
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
