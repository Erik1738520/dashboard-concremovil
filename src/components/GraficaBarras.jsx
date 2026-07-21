import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, LabelList,
} from 'recharts';
import { NOMBRES_MESES, formatoMoneda, formatoNumero } from '../utils/formatters';

// oldest → middle → newest (dark gray, light gray, brand red)
const PALETA = ['#64748B', '#CBD5E1', '#C8102E'];
const colorDeAnio = (idx) => PALETA[Math.min(idx, PALETA.length - 1)];

function fmtY(v, modo) {
  if (modo === 'dinero') {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v}`;
  }
  return formatoNumero(v);
}

/* Tooltip personalizado */
function CustomTooltip({ active, payload, label, modo }) {
  if (!active || !payload?.length) return null;
  const fmt = modo === 'dinero' ? formatoMoneda : (v) => `${formatoNumero(v)} m3`;
  const esTotal = payload[0]?.payload?.esTotal;
  return (
    <div style={{
      background: '#fff', border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '10px 14px',
      minWidth: 190, boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
    }}>
      <p style={{ fontWeight: 700, color: '#1e293b', marginBottom: 8, fontSize: 14 }}>{label}</p>
      {payload.map((e) => {
        // Para la columna Total mostramos el valor real, no el escalado
        const val = esTotal ? (e.payload[`_r${e.dataKey}`] ?? 0) : e.value;
        return (
          <div key={e.dataKey} style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', gap: 20, marginBottom: 4,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: e.fill, display: 'inline-block' }} />
              <span style={{ color: '#64748b', fontSize: 13 }}>{e.dataKey}</span>
            </div>
            <span style={{ fontWeight: 600, color: '#1e293b', fontSize: 13 }}>
              {val ? fmt(val) : (modo === 'dinero' ? '$0' : '0')}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* Etiqueta para la columna Total: muestra % de crecimiento vs año anterior */
function makeTotalLabelRenderer(anio, anios, data) {
  return ({ x, y, width, index }) => {
    const anioIdx = anios.indexOf(anio);
    if (anioIdx === 0) return null; // primer año, sin comparación
    const real = data[index]?.[`_r${anio}`];
    const prevReal = data[index]?.[`_r${anios[anioIdx - 1]}`];
    if (!real || !prevReal) return null;
    const pct = ((real - prevReal) / prevReal) * 100;
    const color = pct >= 0 ? '#16a34a' : '#ef4444';
    return (
      <text x={x + width / 2} y={y - 4} textAnchor="middle"
        fontSize={9} fontWeight="700" fill={color}>
        {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
      </text>
    );
  };
}

/* Etiqueta % encima de cada barra (vs año anterior).
   El año intermedio sube 14px extra para separarse del año final. */
function makeLabelRenderer(anioIdx, anios, data, isLast) {
  return ({ x, y, width, value, index }) => {
    if (anioIdx === 0 || !value) return null;
    if (data[index]?.esTotal) return null; // sin % en columna Total
    const prevVal = data[index]?.[anios[anioIdx - 1]] || 0;
    if (!prevVal) return null;
    const pct = ((value - prevVal) / prevVal) * 100;
    const color = pct >= 0 ? '#16a34a' : '#ef4444';
    const offset = isLast ? 3 : 14;
    return (
      <text
        x={x + width / 2} y={y - offset}
        textAnchor="middle" fill={color}
        fontSize={9} fontWeight="700"
      >
        {pct > 0 ? '+' : ''}{pct.toFixed(0)}%
      </text>
    );
  };
}

export default function GraficaBarras({ ventasMensuales, unidadesMensuales }) {
  const [modo, setModo] = useState('dinero');

  const fuente = modo === 'dinero' ? ventasMensuales : unidadesMensuales;
  const anios = useMemo(() => {
    const arr = Object.keys(fuente || {})
      .map(k => parseInt(k, 10))
      .filter(n => !isNaN(n) && n > 1900 && n < 2200);
    arr.sort((a, b) => a - b);       // siempre ascendente: 2024 → 2025 → 2026
    return arr.slice(-3);
  }, [fuente]);

  const data = useMemo(() => {
    const meses = NOMBRES_MESES.map((nombre, idx) => {
      const mes = idx + 1;
      const punto = { mes: nombre.slice(0, 3), esTotal: false };
      anios.forEach((a) => { punto[a] = fuente?.[a]?.[mes] || 0; });
      return punto;
    });

    // Máximo valor mensual para escalar los totales
    const maxMensual = Math.max(...meses.flatMap(p => anios.map(a => p[a] || 0)), 1);

    // Totales reales por año
    const reales = {};
    anios.forEach((a) => {
      reales[a] = Object.values(fuente?.[a] || {}).reduce((s, v) => s + v, 0);
    });
    const maxTotal = Math.max(...Object.values(reales), 1);

    // Factor: los totales se muestran al 90% de la barra más alta del mes
    const factor = (maxMensual * 0.90) / maxTotal;

    const totalRow = { mes: 'Total', esTotal: true };
    anios.forEach((a) => {
      totalRow[a] = reales[a] * factor;      // valor visual (escalado)
      totalRow[`_r${a}`] = reales[a];        // valor real (para etiqueta)
    });

    return [...meses, totalRow];
  }, [fuente, anios]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-4 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-900">Ventas Mensuales</h3>
          <p className="text-xs text-slate-400 mt-0.5">{anios.join(' · ')}</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Toggle $ / Cant. */}
          <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
            {[['dinero', '$'], ['cantidad', 'Cant.']].map(([m, lbl]) => (
              <button key={m} onClick={() => setModo(m)}
                className={`px-3 py-1.5 font-semibold transition-colors
                  ${modo === m ? 'bg-brand-red text-white' : 'bg-white text-slate-500 hover:bg-gray-50'}`}>
                {lbl}
              </button>
            ))}
          </div>

          {/* Chips de año */}
          <div className="flex items-center gap-3">
            {anios.map((a, i) => (
              <div key={a} className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-sm flex-shrink-0"
                  style={{ background: colorDeAnio(i) }} />
                <span className="text-xs font-medium text-slate-600">{a}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data} margin={{ top: 26, right: 8, left: 0, bottom: 0 }}
          barCategoryGap="18%" barGap={2}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
          <XAxis dataKey="mes" axisLine={false} tickLine={false}
            tick={({ x, y, payload }) => (
              <text x={x} y={y + 12} textAnchor="middle"
                fontSize={payload.value === 'Total' ? 12 : 11}
                fontWeight={payload.value === 'Total' ? 700 : 400}
                fill={payload.value === 'Total' ? '#1e293b' : '#94A3B8'}>
                {payload.value}
              </text>
            )}
          />
          <YAxis tickFormatter={(v) => fmtY(v, modo)}
            tick={{ fontSize: 11, fill: '#94A3B8' }}
            axisLine={false} tickLine={false} width={64} />
          <Tooltip content={<CustomTooltip modo={modo} />} cursor={{ fill: '#F8FAFC' }} />

          {anios.map((a, i) => (
            <Bar key={a} dataKey={a} name={String(a)}
              fill={colorDeAnio(i)}
              radius={[4, 4, 0, 0]}
              maxBarSize={38}
              label={(props) => {
                if (props.index === data.length - 1) {
                  // Columna Total: muestra % crecimiento vs año anterior
                  return makeTotalLabelRenderer(a, anios, data)(props);
                }
                // Meses: muestra % vs año anterior (excepto el primero)
                if (i === 0) return null;
                return makeLabelRenderer(i, anios, data, i === anios.length - 1)(props);
              }}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>

    </div>
  );
}
