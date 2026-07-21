import { X, Filter } from 'lucide-react';
import { NOMBRES_MESES } from '../utils/formatters';

/**
 * FilterBar — Barra de filtros superior reutilizable.
 * Props:
 *  - filtros: { anio, mes, producto, unidad, desde, hasta }
 *  - onCambio: (campo, valor) => void
 *  - onLimpiar: () => void
 *  - aniosDisponibles: number[]
 *  - productosDisponibles: string[] (descripciones únicas)
 *  - unidadesDisponibles: string[]
 */
export default function FilterBar({
  filtros,
  onCambio,
  onLimpiar,
  aniosDisponibles = [],
  productosDisponibles = [],
  unidadesDisponibles = [],
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4 mb-6">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
          <Filter className="w-4 h-4 text-brand-red" />
          Filtros
        </div>

        {/* Año */}
        <select
          value={filtros.anio || ''}
          onChange={(e) => onCambio('anio', e.target.value || null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:border-brand-red"
        >
          <option value="">Todos los años</option>
          {aniosDisponibles.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>

        {/* Mes */}
        <select
          value={filtros.mes || ''}
          onChange={(e) => onCambio('mes', e.target.value || null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:border-brand-red"
        >
          <option value="">Todos los meses</option>
          {NOMBRES_MESES.map((nombre, i) => (
            <option key={i + 1} value={i + 1}>{nombre}</option>
          ))}
        </select>

        {/* Unidad */}
        {unidadesDisponibles.length > 0 && (
          <select
            value={filtros.unidad || ''}
            onChange={(e) => onCambio('unidad', e.target.value || null)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:border-brand-red"
          >
            <option value="">Todas las unidades</option>
            {unidadesDisponibles.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        )}

        {/* Botón limpiar */}
        <button
          onClick={onLimpiar}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-brand-red transition-colors ml-auto"
        >
          <X className="w-4 h-4" />
          Limpiar
        </button>
      </div>

      {/* Rango de fechas */}
      <div className="flex items-center gap-3 mt-3 pt-3 border-t border-gray-100">
        <span className="text-sm text-slate-500 font-medium">Rango:</span>
        <input
          type="date"
          value={filtros.desde || ''}
          onChange={(e) => onCambio('desde', e.target.value || null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:border-brand-red"
        />
        <span className="text-slate-400">—</span>
        <input
          type="date"
          value={filtros.hasta || ''}
          onChange={(e) => onCambio('hasta', e.target.value || null)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-gray-50 focus:outline-none focus:border-brand-red"
        />
      </div>
    </div>
  );
}
