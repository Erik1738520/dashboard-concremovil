import { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, ReferenceLine, LabelList, Cell,
} from 'recharts';
import { parsearFecha, formatoMoneda } from '../utils/formatters';
import { X } from 'lucide-react';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

export default function GraficaClientesNuevos({
  clientesNuevosPorMes,
  ventas = [],
  mapaAgentes = {},
}) {
  const [mesSel, setMesSel] = useState(null); // { mesNum, label } | null

  const anio = useMemo(() => {
    const anios = Object.keys(clientesNuevosPorMes || {}).map(Number).sort((a, b) => b - a);
    return anios[0] ?? null;
  }, [clientesNuevosPorMes]);

  const data = useMemo(() => {
    if (!anio) return [];
    const datos = clientesNuevosPorMes[anio] || {};
    const todos = MESES.map((mes, i) => ({ mes, mesNum: i + 1, value: datos[i + 1] || 0 }));
    const ultimo = todos.reduce((max, d, i) => d.value > 0 ? i : max, -1);
    return ultimo >= 0 ? todos.slice(0, ultimo + 1) : [];
  }, [clientesNuevosPorMes, anio]);

  /* Precomputa: qué clientes son nuevos en cada mes del año actual */
  const clientesPorMes = useMemo(() => {
    if (!ventas.length || !anio) return {};
    const ordenadas = ventas
      .map(v => ({ ...v, _f: parsearFecha(v.falta_fac) }))
      .filter(v => v._f)
      .sort((a, b) => a._f - b._f);

    const vistos = new Set();
    const resultado = {}; // mesNum → Set<nombre>
    ordenadas.forEach(v => {
      const nom = String(v.nom_fac || '').trim();
      if (!nom || vistos.has(nom)) return;
      vistos.add(nom);
      if (v._f.getFullYear() === anio) {
        const m = v._f.getMonth() + 1;
        if (!resultado[m]) resultado[m] = new Set();
        resultado[m].add(nom);
      }
    });
    return resultado;
  }, [ventas, anio]);

  /* Detalle para el mes seleccionado */
  const detalle = useMemo(() => {
    if (!mesSel) return [];
    const clientesSet = clientesPorMes[mesSel.mesNum];
    if (!clientesSet?.size) return [];

    const resumen = {};
    ventas.forEach(v => {
      const nom = String(v.nom_fac || '').trim();
      if (!nom || !clientesSet.has(nom)) return;
      if (!resumen[nom]) {
        resumen[nom] = {
          nombre: nom,
          cve_age: String(v.cve_age || ''),
          total: 0,
          m3: 0,
          facturas: 0,
          productos: {},
        };
      }
      resumen[nom].total += Number(v.total_fac) || 0;
      resumen[nom].facturas += 1;
      if (v._contarCantidad !== false) resumen[nom].m3 += Number(v.cant_surt) || 0;
      const prod = String(v.desc_prod || '').trim();
      if (prod) resumen[nom].productos[prod] = (resumen[nom].productos[prod] || 0) + 1;
    });

    return Object.values(resumen).sort((a, b) => b.total - a.total);
  }, [mesSel, clientesPorMes, ventas]);

  const mesesConDatos = data.filter(d => d.value > 0);
  const total    = mesesConDatos.reduce((s, d) => s + d.value, 0);
  const promedio = mesesConDatos.length > 0 ? Math.round(total / mesesConDatos.length) : 0;
  const mejorMes = mesesConDatos.reduce((best, d) => d.value > (best?.value || 0) ? d : best, null);
  const totalDetalle = detalle.reduce((s, d) => s + d.total, 0);

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 h-full flex flex-col">
        {/* Header */}
        <div className="mb-4">
          <h3 className="font-bold text-gray-900">Clientes Nuevos por Mes</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Primera compra en {anio} · clic en barra para ver detalle
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          <div className="bg-emerald-50 rounded-xl p-3">
            <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wide mb-1">Total</p>
            <p className="text-xl font-bold text-emerald-700 leading-none">{total}</p>
          </div>
          <div className="rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Mejor Mes</p>
            <p className="text-xl font-bold text-gray-900 leading-none">{mejorMes?.mes ?? '—'}</p>
            <p className="text-xs text-slate-400 mt-1">{mejorMes?.value ?? 0} clientes</p>
          </div>
          <div className="rounded-xl p-3">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-1">Promedio</p>
            <p className="text-xl font-bold text-gray-900 leading-none">{promedio}</p>
            <p className="text-xs text-slate-400 mt-1">por mes</p>
          </div>
        </div>

        {/* Chart */}
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 20, right: 44, left: 0, bottom: 0 }}
              barCategoryGap="30%">
              <XAxis dataKey="mes" tick={{ fontSize: 11, fill: '#94A3B8' }}
                axisLine={false} tickLine={false} />
              <YAxis hide />
              <Tooltip
                formatter={(v) => [v, 'Clientes nuevos']}
                contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }}
              />
              <ReferenceLine y={promedio} stroke="#CBD5E1" strokeDasharray="4 2"
                label={{ value: `prom. ${promedio}`, position: 'right', fontSize: 10, fill: '#94A3B8' }}
              />
              <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={44} cursor="pointer"
                onClick={(row) => {
                  if (!row?.value) return;
                  setMesSel(prev =>
                    prev?.mesNum === row.mesNum ? null
                      : { mesNum: row.mesNum, label: row.mes }
                  );
                }}>
                {data.map((entry) => (
                  <Cell key={entry.mesNum}
                    fill={entry.mesNum === mesSel?.mesNum ? '#059669' : '#10B981'}
                    opacity={mesSel && entry.mesNum !== mesSel.mesNum ? 0.4 : 1}
                  />
                ))}
                <LabelList dataKey="value" position="top"
                  style={{ fontSize: 11, fontWeight: 700, fill: '#374151' }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Modal detalle ── */}
      {mesSel && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)' }}
          onClick={() => setMesSel(null)}
        >
          <div
            className="bg-white rounded-3xl shadow-2xl w-full max-w-xl flex flex-col overflow-hidden"
            style={{ maxHeight: '88vh' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Franja accent superior */}
            <div className="h-1 bg-gradient-to-r from-emerald-400 via-emerald-500 to-teal-400 shrink-0" />

            {/* Header */}
            <div className="px-6 pt-5 pb-0 shrink-0">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-[0.12em] mb-1">
                    Análisis · Clientes Nuevos
                  </p>
                  <h4 className="text-xl font-black text-gray-900 leading-tight">
                    {mesSel.label} {anio}
                  </h4>
                </div>
                <button
                  onClick={() => setMesSel(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors shrink-0 ml-4 mt-0.5"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>

              {/* Stats resumen */}
              <div className="grid grid-cols-3 gap-2.5 mt-4 mb-5">
                {[
                  { label: 'Clientes', value: detalle.length, color: 'bg-emerald-50 text-emerald-700', num: 'text-emerald-700' },
                  { label: 'Compras totales', value: totalDetalle >= 1e6 ? `$${(totalDetalle/1e6).toFixed(1)}M` : `$${Math.round(totalDetalle/1000)}K`, color: 'bg-slate-50 text-slate-700', num: 'text-slate-800' },
                  { label: 'Promedio', value: detalle.length > 0 ? (totalDetalle/detalle.length >= 1e6 ? `$${(totalDetalle/detalle.length/1e6).toFixed(1)}M` : `$${Math.round(totalDetalle/detalle.length/1000)}K`) : '—', color: 'bg-slate-50 text-slate-700', num: 'text-slate-800' },
                ].map(s => (
                  <div key={s.label} className={`${s.color.split(' ')[0]} rounded-2xl p-3.5`}>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">{s.label}</p>
                    <p className={`text-2xl font-black leading-none tabular-nums ${s.num}`}>{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="h-px bg-slate-100" />
            </div>

            {/* Lista de clientes */}
            <div className="overflow-y-auto flex-1 p-4 space-y-2">
              {detalle.length === 0 ? (
                <p className="text-center text-slate-400 text-sm py-10">Sin datos disponibles</p>
              ) : detalle.map((c, i) => {
                const agente = mapaAgentes[c.cve_age];
                const nombreAgente = agente?.['Nombre vendedor'] || (c.cve_age ? `Agente ${c.cve_age}` : '—');
                const topProd = Object.entries(c.productos).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
                const pct = totalDetalle > 0 ? (c.total / totalDetalle) * 100 : 0;

                // Iniciales del cliente
                const partes = c.nombre.trim().split(/\s+/);
                const iniciales = partes.length >= 2
                  ? `${partes[0][0]}${partes[1][0]}`
                  : c.nombre.slice(0, 2);

                // Iniciales del agente
                const agPartes = nombreAgente.trim().split(/\s+/);
                const agInic = agPartes.length >= 2
                  ? `${agPartes[0][0]}${agPartes[1][0]}`
                  : nombreAgente.slice(0, 2);

                const PALETA_AVATAR = [
                  'bg-emerald-100 text-emerald-700',
                  'bg-sky-100 text-sky-700',
                  'bg-violet-100 text-violet-700',
                  'bg-amber-100 text-amber-700',
                  'bg-rose-100 text-rose-700',
                  'bg-cyan-100 text-cyan-700',
                  'bg-orange-100 text-orange-700',
                  'bg-indigo-100 text-indigo-700',
                ];
                const avatarColor = PALETA_AVATAR[i % PALETA_AVATAR.length];

                return (
                  <div key={c.nombre}
                    className="rounded-2xl p-4 bg-slate-50 hover:bg-slate-100 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Avatar con iniciales */}
                      <div className={`w-10 h-10 rounded-xl ${avatarColor} flex items-center justify-center text-[13px] font-black shrink-0 select-none`}>
                        {iniciales.toUpperCase()}
                      </div>

                      <div className="flex-1 min-w-0">
                        {/* Nombre + total + m3 */}
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="text-sm font-bold text-gray-900 leading-snug">{c.nombre}</p>
                          <div className="text-right shrink-0">
                            <p className="text-sm font-black text-gray-900 tabular-nums leading-tight">
                              {formatoMoneda(c.total)}
                            </p>
                            {c.m3 > 0 && (
                              <p className="text-[11px] font-semibold text-slate-400 tabular-nums mt-0.5">
                                {c.m3 % 1 === 0 ? c.m3.toLocaleString('es-MX') : c.m3.toLocaleString('es-MX', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} m³
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Chips: agente + producto */}
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1.5 bg-white border border-slate-200 rounded-full px-2 py-0.5">
                            <span className="w-4 h-4 rounded-full bg-slate-200 text-[9px] font-black text-slate-600 flex items-center justify-center shrink-0">
                              {agInic.toUpperCase()}
                            </span>
                            <span className="text-[11px] font-medium text-slate-600 max-w-[140px] truncate">
                              {nombreAgente}
                            </span>
                          </span>

                          {topProd !== '—' && (
                            <span className="inline-flex items-center bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-full px-2.5 py-0.5 text-[11px] font-medium max-w-[200px] truncate">
                              {topProd}
                            </span>
                          )}
                        </div>

                        {/* Barra proporcional */}
                        <div className="flex items-center gap-2 mt-2.5">
                          <div className="flex-1 h-[3px] bg-slate-200 rounded-full overflow-hidden">
                            <div className="h-full bg-emerald-400 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-[10px] font-bold text-slate-400 tabular-nums shrink-0 w-8 text-right">
                            {pct.toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
