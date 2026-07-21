import { useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { Users } from 'lucide-react';
import { formatoMoneda } from '../utils/formatters';
import ModalClientesDetalle from './ModalClientesDetalle';

const TOP_N = 5;
const COLORS = ['#C8102E', '#3B82F6', '#06B6D4', '#8B5CF6', '#10B981'];

function fmtShort(v) {
  if (!v) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000) return `$${(v / 1_000).toFixed(0)}k`;
  return `$${v}`;
}

function truncarNombre(nombre, max = 22) {
  return nombre.length > max ? nombre.slice(0, max - 1) + '…' : nombre;
}

export default function GraficaVentasCliente({ clientes }) {
  const [modalAbierto, setModalAbierto] = useState(false);
  const top = useMemo(() => (clientes || []).slice(0, TOP_N), [clientes]);

  const dataChart = useMemo(() =>
    top.map((c) => ({ ...c, label: truncarNombre(c.nombre) }))
  , [top]);

  if (!top.length) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400 text-sm">Sin datos de clientes</p>
      </div>
    );
  }

  return (
    <>
    {modalAbierto && (
      <ModalClientesDetalle clientes={clientes} onClose={() => setModalAbierto(false)} />
    )}
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Top 5 Clientes</h3>
          <p className="text-xs text-slate-400 mt-0.5">Por monto de ventas en el período</p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors">
          ver todos →
          <Users className="w-4 h-4" />
        </button>
      </div>

      {/* Horizontal bar chart */}
      <ResponsiveContainer width="100%" height={175}>
        <BarChart data={dataChart} layout="vertical"
          margin={{ top: 0, right: 72, left: 0, bottom: 0 }}
          barCategoryGap="22%">
          <XAxis type="number" tickFormatter={fmtShort}
            tick={{ fontSize: 10, fill: '#CBD5E1' }} axisLine={false} tickLine={false} />
          <YAxis type="category" dataKey="label" width={130}
            tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
          <Tooltip formatter={(v) => [formatoMoneda(v), 'Ventas']}
            contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }} />
          <Bar dataKey="ventas" radius={[0, 4, 4, 0]} maxBarSize={22}>
            {dataChart.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            <LabelList dataKey="ventas" position="right" formatter={fmtShort}
              style={{ fontSize: 11, fontWeight: 700, fill: '#1e293b' }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Ranking list */}
      <div className="mt-3 space-y-0">
        <div className="grid grid-cols-[24px_1fr_auto_auto] gap-x-3 px-1 pb-1 border-b border-gray-100">
          <span />
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Cliente</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase">Ventas</span>
          <span className="text-[10px] font-semibold text-slate-400 uppercase w-10 text-right">%</span>
        </div>
        {top.map((c, i) => (
          <div key={c.nombre}
            className="grid grid-cols-[24px_1fr_auto_auto] gap-x-3 items-center px-1 py-2 border-b border-gray-50 last:border-0">
            <span className="w-6 h-6 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
              style={{ background: COLORS[i % COLORS.length] }}>
              {i + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-800 truncate leading-tight">{c.nombre}</p>
              <p className="text-xs text-slate-400">{c.facturas} facturas</p>
            </div>
            <span className="text-sm font-bold text-gray-900">{fmtShort(c.ventas)}</span>
            <span className="text-sm text-slate-500 w-10 text-right">{c.pctTotal?.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}
