import { useState } from 'react';
import { ChevronLeft, ChevronRight, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

/**
 * DataTable — Tabla paginada y ordenable.
 * Props:
 *  - columnas: [{ key, label, render?, sortable?, align? }]
 *  - datos: []
 *  - pageSize: número (default 15)
 *  - emptyMessage: string
 */
export default function DataTable({ columnas = [], datos = [], pageSize = 15, emptyMessage = 'Sin datos' }) {
  const [pagina, setPagina] = useState(1);
  const [ordenCol, setOrdenCol] = useState(null);
  const [ordenDir, setOrdenDir] = useState('desc');

  const mostrarTodos = pageSize === 0;

  const handleOrdenar = (key) => {
    if (ordenCol === key) {
      setOrdenDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrdenCol(key);
      setOrdenDir('desc');
    }
    setPagina(1);
  };

  // Ordenar datos
  const datosOrdenados = ordenCol
    ? [...datos].sort((a, b) => {
        const va = a[ordenCol] ?? '';
        const vb = b[ordenCol] ?? '';
        const num = typeof va === 'number' && typeof vb === 'number';
        const cmp = num ? va - vb : String(va).localeCompare(String(vb), 'es');
        return ordenDir === 'asc' ? cmp : -cmp;
      })
    : datos;

  const totalPaginas = mostrarTodos ? 1 : Math.max(1, Math.ceil(datosOrdenados.length / pageSize));
  const paginaActual = Math.min(pagina, totalPaginas);
  const inicio = mostrarTodos ? 0 : (paginaActual - 1) * pageSize;
  const datosPagina = mostrarTodos ? datosOrdenados : datosOrdenados.slice(inicio, inicio + pageSize);

  const IconoOrden = ({ col }) => {
    if (ordenCol !== col) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return ordenDir === 'asc'
      ? <ChevronUp className="w-3.5 h-3.5 text-brand-red" />
      : <ChevronDown className="w-3.5 h-3.5 text-brand-red" />;
  };

  // Números de página a mostrar
  const paginas = () => {
    const rango = [];
    const delta = 2;
    for (let i = Math.max(1, paginaActual - delta); i <= Math.min(totalPaginas, paginaActual + delta); i++) {
      rango.push(i);
    }
    return rango;
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-table-header border-b border-gray-100">
              {columnas.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap
                    ${col.sortable !== false ? 'cursor-pointer select-none hover:text-gray-700' : ''}
                    ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                  onClick={col.sortable !== false ? () => handleOrdenar(col.key) : undefined}
                >
                  <div className={`flex items-center gap-1 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : ''}`}>
                    {col.label}
                    {col.sortable !== false && <IconoOrden col={col.key} />}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {datosPagina.length === 0 ? (
              <tr>
                <td colSpan={columnas.length} className="px-4 py-12 text-center text-slate-400">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              datosPagina.map((fila, i) => (
                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  {columnas.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-3 text-gray-800
                        ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : ''}`}
                    >
                      {col.render ? col.render(fila[col.key], fila) : (fila[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      {!mostrarTodos && totalPaginas > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <p className="text-xs text-slate-400">
            {inicio + 1}–{Math.min(inicio + pageSize, datosOrdenados.length)} de {datosOrdenados.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPagina((p) => Math.max(1, p - 1))}
              disabled={paginaActual === 1}
              className="p-1.5 rounded-lg text-slate-400 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            {paginas().map((p) => (
              <button
                key={p}
                onClick={() => setPagina(p)}
                className={`w-7 h-7 rounded-full text-xs font-medium transition-colors
                  ${p === paginaActual ? 'bg-brand-red text-white' : 'text-slate-500 hover:bg-gray-100'}`}
              >
                {p}
              </button>
            ))}
            <button
              onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))}
              disabled={paginaActual === totalPaginas}
              className="p-1.5 rounded-lg text-slate-400 hover:text-gray-700 disabled:opacity-30"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
