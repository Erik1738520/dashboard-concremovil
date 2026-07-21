/** Barra de progreso inline para columnas de tabla */
export default function BarraProgreso({ valor, max = 100, colorFill = '#C8102E', showPct = true }) {
  const pct = max > 0 ? Math.min(100, (valor / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: colorFill }}
        />
      </div>
      {showPct && (
        <span className="text-xs text-slate-500 w-10 text-right">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}
