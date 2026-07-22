/**
 * GraficaCrecimiento — Crecimiento mensual % en $ y en Cant.
 */
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, LabelList,
} from 'recharts';
import { NOMBRES_MESES, variacionPct } from '../utils/formatters';

export default function GraficaCrecimiento({
  ventasMensuales,
  unidadesMensuales,
  anioBase,
  anioComparacion,
}) {
  const [modo, setModo] = useState('dinero');

  const fuente = modo === 'dinero' ? ventasMensuales : unidadesMensuales;

  const data = NOMBRES_MESES.map((nombre, idx) => {
    const mes    = idx + 1;
    const actual = fuente?.[anioComparacion]?.[mes] || 0;

    let anterior, comparaContra;
    if (mes === 1) {
      anterior     = fuente?.[anioComparacion - 1]?.[12] || 0;
      comparaContra = `Dic ${anioComparacion - 1}`;
    } else {
      anterior     = fuente?.[anioComparacion]?.[mes - 1] || 0;
      comparaContra = `${NOMBRES_MESES[mes - 2].slice(0, 3)} ${anioComparacion}`;
    }

    let pct = 0;
    if (actual > 0 && anterior > 0) {
      const v = variacionPct(actual, anterior);
      pct = v !== null ? parseFloat(v.toFixed(1)) : 0;
    }

    return { mes: nombre.slice(0, 3), pct, comparaContra };
  });

  const CustomDot = ({ cx, cy, payload }) => {
    if (payload.pct === null || cx === undefined) return null;
    return (
      <circle cx={cx} cy={cy} r={5}
        fill={payload.pct >= 0 ? '#16A34A' : '#DC2626'}
        stroke="white" strokeWidth={2} />
    );
  };

  const CustomLabel = ({ x, y, value }) => {
    if (value === null || value === undefined) return null;
    return (
      <text x={x} y={y - 10} textAnchor="middle" fontSize={10}
        fill={value >= 0 ? '#16A34A' : '#DC2626'} fontWeight="600">
        {value >= 0 ? '+' : ''}{value}%
      </text>
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-gray-900">Crecimiento Mensual</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            {anioComparacion} — crecimiento mes a mes
          </p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
          {[['dinero','$'],['cantidad','Cant.']].map(([m, lbl]) => (
            <button key={m} onClick={() => setModo(m)}
              className={`px-3 py-1.5 font-medium transition-colors
                ${modo === m ? 'bg-brand-red text-white' : 'bg-white text-slate-500 hover:bg-gray-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 24, right: 20, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
          <YAxis tickFormatter={(v) => `${v}%`} tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false} tickLine={false} width={45} />
          <Tooltip
            formatter={(v, _name, item) => [
              `${v !== null ? (v >= 0 ? '+' : '') + v + '%' : '—'}`,
              `${modo === 'dinero' ? 'Ventas $' : 'Unidades'} vs ${item.payload?.comparaContra ?? 'mes anterior'}`,
            ]}
            contentStyle={{ borderRadius: '12px', border: '1px solid #E7EBF0', fontSize: 12 }}
          />
          <ReferenceLine y={0} stroke="#CBD5E1" strokeDasharray="4 2" />
          <Line type="monotone" dataKey="pct" stroke="#C8102E" strokeWidth={2}
            dot={<CustomDot />} activeDot={{ r: 6 }}>
            <LabelList content={<CustomLabel />} />
          </Line>
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
