import { useState, useMemo } from 'react';
import { X, Search, DollarSign, Users, Receipt, ChevronUp } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { formatoMoneda, formatoNumero } from '../utils/formatters';

const COLORS = ['#C8102E', '#3B82F6', '#06B6D4', '#8B5CF6', '#10B981'];
const AVATAR_COLORS = ['#3B82F6','#10B981','#F97316','#8B5CF6','#06B6D4','#EC4899'];

function fmtShort(v) {
  if (!v) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

function fmtKg(v) {
  if (!v) return '0 KG';
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(2)}M KG`;
  return `${formatoNumero(v)} KG`;
}

function PctBadge({ pct, color }) {
  const [bg, fg] =
    color === 'green' ? ['#ECFDF5','#059669'] :
    color === 'blue'  ? ['#EFF6FF','#3B82F6'] :
                        ['#F1F5F9','#94A3B8'];
  return (
    <span style={{ background: bg, color: fg, fontWeight: 700, fontSize: 12,
      padding: '2px 10px', borderRadius: 20, whiteSpace: 'nowrap' }}>
      {pct.toFixed(1)}%
    </span>
  );
}

/* Panel expandido al seleccionar un cliente */
function ClienteDetalle({ cliente, onClose }) {
  const productos = useMemo(() =>
    [...(cliente.productos || [])].sort((a, b) => b.ventas - a.ventas).slice(0, 5)
  , [cliente]);

  const maxVentasProd = productos[0]?.ventas || 1;

  return (
    <div className="rounded-xl border border-blue-100 bg-slate-50 p-4 space-y-4">
      {/* Sub-header */}
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-bold text-gray-900">{cliente.nombre}</p>
          <p className="text-xs text-slate-400 mt-0.5">
            {cliente.facturas} facturas · {fmtShort(cliente.ventas)}
          </p>
        </div>
        <button onClick={onClose} className="p-1 hover:bg-gray-200 rounded-lg transition-colors">
          <X className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      {/* Top 5 productos */}
      {productos.length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">
            Top 5 Productos
          </p>
          <div className="space-y-2.5">
            {productos.map((p, i) => {
              const pct = cliente.ventas > 0 ? (p.ventas / cliente.ventas) * 100 : 0;
              const barW = maxVentasProd > 0 ? (p.ventas / maxVentasProd) * 100 : 0;
              return (
                <div key={p.cve_prod || i}>
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs text-slate-400 w-4 shrink-0">{i + 1}</span>
                    <span className="text-sm font-medium text-gray-800 flex-1 truncate">
                      {p.desc_prod || p.cve_prod}
                    </span>
                    <span className="text-xs text-slate-400 shrink-0">{fmtKg(p.cantidad)}</span>
                    <span className="text-sm font-bold text-gray-900 shrink-0">{fmtShort(p.ventas)}</span>
                    <span className="text-xs font-semibold text-blue-500 shrink-0 w-10 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  <div className="ml-6 mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: `${barW}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Agentes */}
      {(cliente.agentes || []).length > 0 && (
        <div>
          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wide mb-2">
            Agentes que le atienden
          </p>
          <div className="flex flex-wrap gap-2">
            {(cliente.agentes || []).map((a, i) => {
              const pct = cliente.ventas > 0 ? (a.ventas / cliente.ventas) * 100 : 0;
              const inicial = (a.nombre || '?')[0].toUpperCase();
              const color = AVATAR_COLORS[i % AVATAR_COLORS.length];
              return (
                <div key={i}
                  className="flex items-center gap-2 bg-white rounded-xl px-3 py-2 border border-gray-100 shadow-sm">
                  <span className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0"
                    style={{ background: color }}>
                    {inicial}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-gray-800 leading-tight">{a.nombre}</p>
                    <p className="text-xs text-slate-400">{fmtShort(a.ventas)}</p>
                  </div>
                  <span className="ml-1 bg-green-100 text-green-700 text-[11px] font-bold px-2 py-0.5 rounded-full">
                    {pct.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ModalClientesDetalle({ clientes, onClose }) {
  const [busqueda, setBusqueda] = useState('');
  const [clienteSel, setClienteSel] = useState(null);

  const totalVentas   = useMemo(() => (clientes || []).reduce((s, c) => s + c.ventas, 0), [clientes]);
  const totalClientes  = (clientes || []).length;
  const totalFacturas  = useMemo(() => (clientes || []).reduce((s, c) => s + (c.facturas || 0), 0), [clientes]);
  const ticketProm    = totalFacturas > 0 ? totalVentas / totalFacturas : 0;

  const top5 = useMemo(() =>
    (clientes || []).slice(0, 5).map((c) => ({
      ...c,
      label: c.nombre.length > 24 ? c.nombre.slice(0, 22) + '…' : c.nombre,
    }))
  , [clientes]);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return q ? (clientes || []).filter((c) => c.nombre.toLowerCase().includes(q)) : (clientes || []);
  }, [clientes, busqueda]);

  const toggleCliente = (c) => setClienteSel((prev) => prev?.nombre === c.nombre ? null : c);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.45)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm text-slate-500">Clientes</span>
            <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-2.5 py-0.5 rounded-full">
              {totalClientes} en el período
            </span>
          </div>
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Análisis de Ventas por Cliente</h2>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">

          {/* KPI cards */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <DollarSign className="w-3.5 h-3.5 text-brand-red" />
                <span className="text-[10px] font-bold text-brand-red uppercase tracking-wide">Ventas Totales</span>
              </div>
              <p className="text-2xl font-bold text-brand-red">{fmtShort(totalVentas)}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Users className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-bold text-blue-600 uppercase tracking-wide">Total Clientes</span>
              </div>
              <p className="text-2xl font-bold text-blue-600">{totalClientes}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-1.5 mb-2">
                <Receipt className="w-3.5 h-3.5 text-purple-600" />
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wide">Ticket Promedio</span>
              </div>
              <p className="text-2xl font-bold text-purple-600">{fmtShort(ticketProm)}</p>
            </div>
          </div>

          {/* Top 5 chart */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-3">Top 5 por Ventas</p>
            <ResponsiveContainer width="100%" height={175}>
              <BarChart data={top5} layout="vertical"
                margin={{ top: 0, right: 80, left: 0, bottom: 0 }} barCategoryGap="22%">
                <XAxis type="number" tickFormatter={fmtShort}
                  tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="label" width={145}
                  tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip formatter={(v) => [formatoMoneda(v), 'Ventas']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }} />
                <Bar dataKey="ventas" radius={[0, 4, 4, 0]} maxBarSize={22}>
                  {top5.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  <LabelList dataKey="ventas" position="right" formatter={fmtShort}
                    style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar cliente..."
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-brand-red" />
          </div>

          {/* Cliente expandido */}
          {clienteSel && (
            <ClienteDetalle cliente={clienteSel} onClose={() => setClienteSel(null)} />
          )}

          {/* Table */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase px-4 py-2.5 w-8">#</th>
                  <th className="text-left text-[10px] font-semibold text-slate-400 uppercase px-4 py-2.5">Cliente</th>
                  <th className="text-right text-[10px] font-semibold text-slate-400 uppercase px-4 py-2.5">Ventas</th>
                  <th className="text-right text-[10px] font-semibold text-slate-400 uppercase px-4 py-2.5 pr-5">%</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((c, i) => {
                  const seleccionado = clienteSel?.nombre === c.nombre;
                  return (
                    <tr key={c.nombre}
                      onClick={() => toggleCliente(c)}
                      className={`border-b border-gray-50 last:border-0 cursor-pointer transition-colors
                        ${seleccionado ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                      <td className="px-4 py-3">
                        <p className={`text-sm font-bold leading-tight ${seleccionado ? 'text-blue-600' : 'text-gray-900'}`}>
                          {c.nombre}
                        </p>
                        <p className="text-xs text-slate-400">{c.facturas}</p>
                      </td>
                      <td className="px-4 py-3 text-right text-sm font-semibold text-gray-900">
                        {fmtShort(c.ventas)}
                      </td>
                      <td className="px-4 py-3 text-right pr-5">
                        <PctBadge pct={c.pctTotal || 0}
                          color={c.pctTotal >= 5 ? 'green' : c.pctTotal >= 2 ? 'blue' : 'gray'} />
                      </td>
                    </tr>
                  );
                })}
                {filtrados.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-slate-400">
                      Sin resultados para "{busqueda}"
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
