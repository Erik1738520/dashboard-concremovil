import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

/**
 * KPICard — Tarjeta de indicador clave de negocio.
 * Props:
 *  - titulo: string
 *  - valor: string (ya formateado)
 *  - subtitulo: string (opcional)
 *  - variacion: number | null (porcentaje, ej. 12.3 o -5.1)
 *  - icono: ReactNode
 *  - colorIcono: string ('red'|'green'|'blue'|'purple'|'amber'|'emerald')
 *  - secundario: ReactNode (contenido extra bajo la línea divisora)
 */

const COLORES_ICONO = {
  red:     { bg: 'bg-red-50',     text: 'text-brand-red' },
  green:   { bg: 'bg-green-50',   text: 'text-green-600' },
  blue:    { bg: 'bg-blue-50',    text: 'text-blue-500'  },
  purple:  { bg: 'bg-purple-50',  text: 'text-purple-500'},
  amber:   { bg: 'bg-amber-50',   text: 'text-amber-500' },
  emerald: { bg: 'bg-emerald-50', text: 'text-emerald-500'},
};

function BadgeVariacion({ variacion }) {
  if (variacion === null || variacion === undefined) return null;

  const abs = Math.abs(variacion);
  const esEstable = abs < 0.5;

  if (esEstable) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" />
        Estable
      </span>
    );
  }

  const esPositivo = variacion > 0;
  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
        ${esPositivo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}
    >
      {esPositivo ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {esPositivo ? '+' : ''}{variacion.toFixed(1)}%
    </span>
  );
}

export default function KPICard({ titulo, valor, subtitulo, variacion, icono, colorIcono = 'red', secundario }) {
  const { bg, text } = COLORES_ICONO[colorIcono] || COLORES_ICONO.red;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${bg}`}>
          <span className={text}>{icono}</span>
        </div>
        <BadgeVariacion variacion={variacion} />
      </div>

      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">{titulo}</p>
        <p className="text-2xl font-bold text-gray-900">{valor}</p>
        {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
      </div>

      {secundario && (
        <>
          <div className="border-t border-gray-100" />
          <div>{secundario}</div>
        </>
      )}
    </div>
  );
}
