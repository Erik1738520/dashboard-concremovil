/**
 * GraficaBarrasHorizontales — Ranking horizontal (agentes, sucursales, etc.)
 */
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';
import { COLORES_CICLICOS, formatoMoneda } from '../utils/formatters';

export default function GraficaBarrasHorizontales({ datos = [], titulo, subtitulo, modoMonto = true }) {
  const top10 = datos.slice(0, 10);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
      </div>

      <ResponsiveContainer width="100%" height={Math.max(200, top10.length * 42)}>
        <BarChart
          data={top10}
          layout="vertical"
          margin={{ top: 0, right: 60, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => modoMonto ? `$${(v / 1000).toFixed(0)}k` : v.toLocaleString('es-MX')}
            tick={{ fontSize: 10, fill: '#94A3B8' }}
            axisLine={false} tickLine={false}
          />
          <YAxis
            type="category" dataKey="nombre"
            tick={{ fontSize: 11, fill: '#374151' }}
            axisLine={false} tickLine={false} width={120}
          />
          <Tooltip
            formatter={(v) => [modoMonto ? formatoMoneda(v) : v.toLocaleString('es-MX')]}
            contentStyle={{ borderRadius: '12px', border: '1px solid #E7EBF0', fontSize: 12 }}
          />
          <Bar dataKey="valor" radius={[0, 4, 4, 0]} maxBarSize={24}>
            {top10.map((_, i) => (
              <Cell key={i} fill={COLORES_CICLICOS[i % COLORES_CICLICOS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
