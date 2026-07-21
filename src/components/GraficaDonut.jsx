/**
 * GraficaDonut — Distribución por categoría/grupo (dona con leyenda).
 */
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { COLORES_CICLICOS, formatoMoneda, truncar } from '../utils/formatters';

export default function GraficaDonut({ datos = [], titulo, subtitulo }) {
  const totalGeneral = datos.reduce((s, d) => s + d.valor, 0);
  const top8 = datos.slice(0, 8);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900">{titulo}</h3>
        {subtitulo && <p className="text-xs text-slate-400 mt-0.5">{subtitulo}</p>}
      </div>

      <div className="flex items-center gap-6">
        <ResponsiveContainer width={180} height={180}>
          <PieChart>
            <Pie
              data={top8}
              dataKey="valor"
              nameKey="nombre"
              cx="50%" cy="50%"
              innerRadius={50} outerRadius={80}
              paddingAngle={2}
            >
              {top8.map((_, i) => (
                <Cell key={i} fill={COLORES_CICLICOS[i % COLORES_CICLICOS.length]} />
              ))}
            </Pie>
            <Tooltip
              formatter={(v) => [formatoMoneda(v)]}
              contentStyle={{ borderRadius: '12px', border: '1px solid #E7EBF0', fontSize: 12 }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex-1 space-y-2">
          {top8.map((item, i) => {
            const pct = totalGeneral > 0 ? ((item.valor / totalGeneral) * 100).toFixed(1) : '0.0';
            return (
              <div key={i} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-sm shrink-0"
                  style={{ backgroundColor: COLORES_CICLICOS[i % COLORES_CICLICOS.length] }}
                />
                <span className="text-xs text-gray-700 flex-1 truncate" title={item.nombre}>
                  {truncar(item.nombre, 24)}
                </span>
                <span className="text-xs font-semibold text-slate-500">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
