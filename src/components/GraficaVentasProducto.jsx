import { useState, useMemo } from 'react';
import { ChevronUp, ChevronDown, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { formatoMoneda } from '../utils/formatters';
import ModalProductoDetalle from './ModalProductoDetalle';

function fmtCantidad(v) {
  if (v === null || v === undefined) return '—';
  const n = Number(v);
  // Muestra hasta 3 decimales si los tiene, sin decimales si es entero
  if (n % 1 === 0) return n.toLocaleString('es-MX');
  return n.toLocaleString('es-MX', { minimumFractionDigits: 0, maximumFractionDigits: 3 });
}

const PER_PAGE = 10;

function SortBtn({ col, sortCol, sortDir, onClick, right, children }) {
  const active = sortCol === col;
  return (
    <button onClick={onClick}
      className={`flex items-center gap-1 uppercase tracking-wider hover:text-slate-600 transition-colors ${right ? 'ml-auto' : ''}`}>
      {children}
      {active
        ? (sortDir === 'asc'
            ? <ChevronUp className="w-3 h-3 text-slate-500" />
            : <ChevronDown className="w-3 h-3 text-slate-500" />)
        : <ChevronsUpDown className="w-3 h-3 text-slate-400" />}
    </button>
  );
}

export default function GraficaVentasProducto({ productos, ventas, mapaAgentes }) {
  const [sortCol, setSortCol]       = useState('ventas');
  const [sortDir, setSortDir]       = useState('desc');
  const [pagina, setPagina]         = useState(1);
  const [productoSel, setProductoSel] = useState(null);

  const sorted = useMemo(() => {
    if (!productos?.length) return [];
    return [...productos].sort((a, b) => {
      const va = a[sortCol] ?? 0;
      const vb = b[sortCol] ?? 0;
      if (typeof va === 'string') return sortDir === 'asc' ? va.localeCompare(vb) : vb.localeCompare(va);
      return sortDir === 'asc' ? va - vb : vb - va;
    });
  }, [productos, sortCol, sortDir]);

  const totalPaginas = Math.max(1, Math.ceil(sorted.length / PER_PAGE));
  const pag          = Math.min(pagina, totalPaginas);
  const slice        = sorted.slice((pag - 1) * PER_PAGE, pag * PER_PAGE);
  const maxPct       = sorted[0]?.pctTotal || 1;

  const toggleSort = (col) => {
    if (sortCol === col) setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('desc'); }
    setPagina(1);
  };

  const pageNums = useMemo(() => {
    const nums = [];
    for (let i = Math.max(1, pag - 2); i <= Math.min(totalPaginas, pag + 2); i++) nums.push(i);
    return nums;
  }, [pag, totalPaginas]);

  if (!sorted.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400 text-sm">Sin datos de productos</p>
      </div>
    );
  }

  return (
    <>
    {productoSel && (
      <ModalProductoDetalle
        producto={productoSel}
        ventas={ventas || []}
        mapaAgentes={mapaAgentes || {}}
        onClose={() => setProductoSel(null)}
      />
    )}
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="mb-4">
        <h3 className="font-bold text-gray-900">Top Productos</h3>
        <p className="text-xs text-slate-400 mt-0.5">
          {sorted.length} productos · Haz clic en un producto para ver su análisis
        </p>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 pr-3 w-8">#</th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 px-3">
                <SortBtn col="desc_prod" sortCol={sortCol} sortDir={sortDir} onClick={() => toggleSort('desc_prod')}>
                  Producto
                </SortBtn>
              </th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 px-3">
                <SortBtn col="ventas" sortCol={sortCol} sortDir={sortDir} right onClick={() => toggleSort('ventas')}>
                  Ventas
                </SortBtn>
              </th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 px-3">
                <SortBtn col="cantidad" sortCol={sortCol} sortDir={sortDir} right onClick={() => toggleSort('cantidad')}>
                  Cantidad
                </SortBtn>
              </th>
              <th className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 px-3">Unidad</th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 px-3">
                <SortBtn col="precioPromedio" sortCol={sortCol} sortDir={sortDir} right onClick={() => toggleSort('precioPromedio')}>
                  $/Unidad
                </SortBtn>
              </th>
              <th className="text-right text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3.5 px-3">
                <SortBtn col="pctTotal" sortCol={sortCol} sortDir={sortDir} right onClick={() => toggleSort('pctTotal')}>
                  % Total
                </SortBtn>
              </th>
              <th className="w-6" />
            </tr>
          </thead>
          <tbody>
            {slice.map((p, i) => {
              const rank = (pag - 1) * PER_PAGE + i + 1;
              const barW = Math.min((p.pctTotal / maxPct) * 100, 100);
              return (
                <tr key={p.cve_prod}
                  onClick={() => setProductoSel(p)}
                  className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group">
                  <td className="py-4 pr-3 text-[13px] text-slate-400 tabular-nums">{rank}</td>
                  <td className="py-4 px-3">
                    <p className="text-[13px] text-gray-900">{p.desc_prod || p.cve_prod}</p>
                  </td>
                  <td className="py-4 px-3 text-right text-[13px] font-medium text-brand-red whitespace-nowrap tabular-nums">
                    {formatoMoneda(p.ventas)}
                  </td>
                  <td className="py-4 px-3 text-right text-[13px] text-gray-700 whitespace-nowrap tabular-nums">
                    {fmtCantidad(p.cantidad)}
                  </td>
                  <td className="py-4 px-3 text-[13px] text-slate-400">{p.unidad || '—'}</td>
                  <td className="py-4 px-3 text-right text-[13px] text-slate-600 whitespace-nowrap tabular-nums">
                    {p.precioPromedio > 0
                      ? '$' + Math.round(p.precioPromedio).toLocaleString('es-MX')
                      : '—'}
                  </td>
                  <td className="py-4 px-3">
                    <div className="flex items-center justify-end gap-3">
                      <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden shrink-0">
                        <div className="h-full bg-brand-red rounded-full" style={{ width: `${barW}%` }} />
                      </div>
                      <span className="text-[13px] text-slate-500 w-14 text-right whitespace-nowrap tabular-nums">
                        {p.pctTotal?.toFixed(2)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 pl-1">
                    <ChevronRight className="w-4 h-4 text-slate-200 group-hover:text-slate-400 transition-colors" />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginación */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
        <span className="text-xs text-slate-400">
          Mostrando {(pag - 1) * PER_PAGE + 1}–{Math.min(pag * PER_PAGE, sorted.length)} de {sorted.length}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={() => setPagina((p) => Math.max(1, p - 1))} disabled={pag === 1}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
            «
          </button>
          {pageNums.map((n) => (
            <button key={n} onClick={() => setPagina(n)}
              className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                ${n === pag ? 'bg-brand-red text-white' : 'text-slate-500 hover:bg-gray-100'}`}>
              {n}
            </button>
          ))}
          <button onClick={() => setPagina((p) => Math.min(totalPaginas, p + 1))} disabled={pag === totalPaginas}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 disabled:opacity-30 transition-colors">
            »
          </button>
        </div>
      </div>
    </div>
    </>
  );
}
