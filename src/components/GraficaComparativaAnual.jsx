import { useState, useMemo } from 'react';
import { formatoMoneda, formatoNumero } from '../utils/formatters';

const PALETA = ['#64748B', '#CBD5E1', '#C8102E'];

function fmtVal(v, modo) {
  if (!v) return modo === 'dinero' ? '$0' : '0';
  if (modo === 'dinero') {
    if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
    if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
    return `$${v}`;
  }
  return formatoNumero(v);
}

function niceStep(maxVal, ticks = 4) {
  const raw = maxVal / ticks;
  const exp = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.ceil(raw / exp) * exp;
}

export default function GraficaComparativaAnual({ ventasMensuales, unidadesMensuales }) {
  const [modo, setModo] = useState('dinero');

  const fuente     = modo === 'dinero' ? ventasMensuales : unidadesMensuales;
  const hoy        = new Date();
  const mesCorte   = hoy.getMonth() + 1;
  const fechaLabel = hoy.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' }).replace('.', '');

  const anios = useMemo(() => {
    const arr = Object.keys(fuente || {})
      .map(k => parseInt(k, 10))
      .filter(n => !isNaN(n) && n > 1900 && n < 2200);
    arr.sort((a, b) => a - b);
    return arr.slice(-3);
  }, [fuente]);

  const totales = useMemo(() =>
    anios.map((a) => {
      let t = 0;
      for (let m = 1; m <= mesCorte; m++) t += fuente?.[a]?.[m] || 0;
      return t;
    })
  , [fuente, anios, mesCorte]);

  const N_TICKS  = 4;
  const step     = niceStep(Math.max(...totales, 1), N_TICKS);
  const axisMax  = step * N_TICKS;

  const BAR_AREA = 200; // px disponibles para las barras
  const LABEL_H  = 48;  // px reservados para etiquetas y año abajo

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {/* Header */}
      <div className="flex items-start justify-between mb-5 flex-wrap gap-2">
        <div>
          <h3 className="font-bold text-gray-900">Comparativa Año vs Año</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Acumulado al {fechaLabel} · {anios.join(' · ')}
          </p>
        </div>
        <div className="flex rounded-lg overflow-hidden border border-gray-200 text-xs">
          {[['dinero', '$'], ['cantidad', 'Cant.']].map(([m, lbl]) => (
            <button key={m} onClick={() => setModo(m)}
              className={`px-3 py-1.5 font-semibold transition-colors
                ${modo === m ? 'bg-brand-red text-white' : 'bg-white text-slate-500 hover:bg-gray-50'}`}>
              {lbl}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="flex gap-2">

        {/* Y-axis */}
        <div className="flex flex-col justify-between shrink-0 text-right"
          style={{ height: BAR_AREA + LABEL_H, paddingBottom: LABEL_H }}>
          {Array.from({ length: N_TICKS + 1 }, (_, i) => (
            <span key={i} className="text-xs text-slate-400 leading-none">
              {fmtVal(axisMax * (1 - i / N_TICKS), modo)}
            </span>
          ))}
        </div>

        {/* Bars + grid */}
        <div className="flex-1 relative" style={{ height: BAR_AREA + LABEL_H }}>

          {/* Grid lines */}
          {Array.from({ length: N_TICKS + 1 }, (_, i) => (
            <div key={i}
              className={`absolute left-0 right-0 border-t ${i === N_TICKS ? 'border-slate-200' : 'border-slate-100'}`}
              style={{ top: (i / N_TICKS) * BAR_AREA }}
            />
          ))}

          {/* Columns */}
          <div className="absolute left-0 right-0 top-0 flex gap-6 px-6"
            style={{ height: BAR_AREA + LABEL_H }}>
            {anios.map((a, i) => {
              const barPx  = Math.max((totales[i] / axisMax) * BAR_AREA, 2);
              const color  = PALETA[Math.min(i, 2)];
              const prevT  = i > 0 ? totales[i - 1] : null;
              const growth = prevT ? ((totales[i] - prevT) / prevT) * 100 : null;

              return (
                <div key={a} className="flex-1 flex flex-col items-center"
                  style={{ height: BAR_AREA + LABEL_H }}>

                  {/* Spacer empuja la barra hacia abajo */}
                  <div style={{ flex: 1 }} />

                  {/* Labels encima de la barra */}
                  <div className="flex flex-col items-center gap-0.5 mb-1.5">
                    {growth !== null && (
                      <span className="text-xs font-bold leading-none"
                        style={{ color: growth >= 0 ? '#16a34a' : '#ef4444' }}>
                        {growth > 0 ? '+' : ''}{growth.toFixed(1)}%
                      </span>
                    )}
                    <span className="text-sm font-bold text-slate-700 leading-none">
                      {fmtVal(totales[i], modo)}
                    </span>
                  </div>

                  {/* Barra */}
                  <div className="rounded-t-lg" style={{ height: barPx, background: color, width: '55%', maxWidth: 180 }} />

                  {/* Año */}
                  <span className="text-sm font-semibold text-slate-500 mt-2 leading-none">
                    {a}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
