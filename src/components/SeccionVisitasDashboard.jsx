import { useState, useEffect, useMemo, lazy, Suspense } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { Loader, Check } from 'lucide-react';
import { fetchVisitas } from '../utils/visitasData';
import { fetchUbicaciones } from '../utils/ubicacionesData';

const MapaDashboard = lazy(() => import('./MapaDashboard'));

/* ── Configuración de capas ── */
const CAPAS_DEF = [
  { key: 'clientes',    label: 'Clientes',    color: '#10B981', shape: 'circle' },
  { key: 'prospectos',  label: 'Prospectos',  color: '#F59E0B', shape: 'circle' },
  { key: 'plantas',     label: 'Plantas',     color: '#1D4ED8', shape: 'square' },
  { key: 'competencia', label: 'Competencia', color: '#DC2626', shape: 'triangle' },
];

function CapaToggle({ capa, activo, onToggle }) {
  const { label, color, shape } = capa;

  const indicator = shape === 'circle'
    ? <div className="w-2.5 h-2.5 rounded-full shrink-0 transition-colors"
        style={{ background: activo ? color : '#CBD5E1' }} />
    : shape === 'square'
    ? <div className="w-2.5 h-2.5 rounded-[3px] shrink-0 transition-colors"
        style={{ background: activo ? color : '#CBD5E1' }} />
    : <div className="w-0 h-0 shrink-0 transition-colors"
        style={{
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: `9px solid ${activo ? color : '#CBD5E1'}`,
        }} />;

  return (
    <button
      onClick={onToggle}
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-semibold transition-all select-none ${
        activo
          ? 'border-current text-slate-700 bg-white shadow-sm'
          : 'border-slate-200 text-slate-400 bg-slate-50'
      }`}
      style={{ borderColor: activo ? color : undefined }}
    >
      {indicator}
      <span>{label}</span>
      {activo && <Check className="w-3 h-3 shrink-0" style={{ color }} />}
    </button>
  );
}

function DonutChart({ data, colors, titulo, className = '' }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className={`bg-slate-50 rounded-2xl p-4 flex flex-col justify-center ${className}`}>
      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">{titulo}</p>
      {total === 0 ? (
        <div className="text-slate-300 text-xs text-center py-3">Sin datos</div>
      ) : (
        <div className="flex items-center gap-3">
          <div style={{ width: 80, height: 80, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%"
                  innerRadius={23} outerRadius={36}
                  dataKey="value" paddingAngle={3}
                  startAngle={90} endAngle={-270}>
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex-1 min-w-0 space-y-2">
            {data.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-[11px] text-slate-600 truncate">{d.name}</span>
                </div>
                <div className="shrink-0 text-right">
                  <span className="text-xs font-bold text-slate-800 tabular-nums">{d.value}</span>
                  <span className="text-[10px] text-slate-400 ml-1">
                    ({total > 0 ? Math.round(d.value / total * 100) : 0}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function SeccionVisitasDashboard({
  anioSel = '', mesSel = '', vendedorSel = '', grupoSel = '', mapaAgentes = {},
}) {
  const [visitas,     setVisitas]     = useState([]);
  const [ubicaciones, setUbicaciones] = useState([]);
  const [cargando,    setCargando]    = useState(true);
  const [capas, setCapas] = useState({
    clientes: true, prospectos: true, plantas: true, competencia: true,
  });

  useEffect(() => {
    Promise.all([fetchVisitas(), fetchUbicaciones()])
      .then(([v, u]) => { setVisitas(v); setUbicaciones(u); })
      .catch(() => {})
      .finally(() => setCargando(false));
  }, []);

  const toggleCapa = (key) => setCapas(prev => ({ ...prev, [key]: !prev[key] }));

  /* Nombres de vendedor que corresponden al filtro de Dashboard */
  const nombresVendedor = useMemo(() => {
    const set = new Set();
    if (vendedorSel) {
      const a = mapaAgentes[vendedorSel];
      if (a) {
        const nv = (a['Nombre Visita']   || '').trim();
        const nn = (a['Nombre vendedor'] || '').trim();
        if (nv) set.add(nv.toLowerCase());
        if (nn) set.add(nn.toLowerCase());
      }
    } else if (grupoSel) {
      Object.values(mapaAgentes).forEach(a => {
        if ((a['Grupo agentes'] || '').trim() !== grupoSel) return;
        const nv = (a['Nombre Visita']   || '').trim();
        const nn = (a['Nombre vendedor'] || '').trim();
        if (nv) set.add(nv.toLowerCase());
        if (nn) set.add(nn.toLowerCase());
      });
    }
    return set;
  }, [vendedorSel, grupoSel, mapaAgentes]);

  const visitasFiltradas = useMemo(() => {
    let result = visitas;
    if (anioSel) result = result.filter(v => v.anio === Number(anioSel));
    if (mesSel)  result = result.filter(v => v.mes  === Number(mesSel));
    if (nombresVendedor.size > 0)
      result = result.filter(v => nombresVendedor.has((v.vendedor || '').trim().toLowerCase()));
    return result;
  }, [visitas, anioSel, mesSel, nombresVendedor]);

  const donaLlamada = useMemo(() => [
    { name: 'Visitas',  value: visitasFiltradas.filter(v => v.llamadaVisita?.toLowerCase().includes('visita')).length },
    { name: 'Llamadas', value: visitasFiltradas.filter(v => v.llamadaVisita?.toLowerCase().includes('llamada')).length },
  ], [visitasFiltradas]);

  const donaTipo = useMemo(() => [
    { name: 'Clientes',   value: visitasFiltradas.filter(v => v.tipo?.toLowerCase().includes('cliente')).length },
    { name: 'Prospectos', value: visitasFiltradas.filter(v => v.tipo?.toLowerCase().includes('prospecto')).length },
  ], [visitasFiltradas]);

  const nPlantas     = ubicaciones.filter(u => u.tipo === 'Planta').length;
  const nCompetencia = ubicaciones.filter(u => u.tipo === 'Competencia').length;
  const conCoords    = visitasFiltradas.filter(v => v.lat && v.lng).length;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5 overflow-hidden" style={{ isolation: 'isolate', zIndex: 0, position: 'relative' }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-bold text-gray-900">Actividad de Campo</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mapa de visitas · plantas propias · competencia
          </p>
        </div>
        {!cargando && (
          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span>{visitasFiltradas.length} registros</span>
            <span className="text-slate-200">|</span>
            <span className="text-blue-600 font-medium">{nPlantas} plantas</span>
            <span className="text-slate-200">|</span>
            <span className="text-red-600 font-medium">{nCompetencia} competidores</span>
          </div>
        )}
      </div>

      {/* Controles de capas */}
      {!cargando && (
        <div className="flex items-center gap-2 flex-wrap mb-3">
          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mr-1">
            Capas
          </span>
          {CAPAS_DEF.map(capa => (
            <CapaToggle
              key={capa.key}
              capa={capa}
              activo={capas[capa.key]}
              onToggle={() => toggleCapa(capa.key)}
            />
          ))}
        </div>
      )}

      {cargando ? (
        <div className="flex items-center justify-center h-80">
          <div className="text-center space-y-2">
            <Loader className="w-6 h-6 animate-spin text-slate-300 mx-auto" />
            <p className="text-xs text-slate-400">Cargando visitas y ubicaciones…</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Mapa — 2/3 */}
          <div className="lg:col-span-2 rounded-2xl overflow-hidden border border-gray-100" style={{ height: 360 }}>
            <Suspense fallback={
              <div className="flex items-center justify-center h-full text-slate-400 text-sm bg-slate-50 rounded-2xl">
                <Loader className="w-5 h-5 animate-spin mr-2" /> Cargando mapa…
              </div>
            }>
              <MapaDashboard visitas={visitasFiltradas} ubicaciones={ubicaciones} capas={capas} />
            </Suspense>
          </div>

          {/* Donuts + stats — 1/3 */}
          <div className="lg:col-span-1 flex flex-col gap-3" style={{ height: 360 }}>
            <DonutChart data={donaLlamada} colors={['#6366F1', '#C8102E']} titulo="Visitas vs Llamadas" className="flex-1 min-h-0" />
            <DonutChart data={donaTipo}    colors={['#10B981', '#F59E0B']} titulo="Clientes vs Prospectos" className="flex-1 min-h-0" />

            <div className="bg-slate-50 rounded-2xl p-4 shrink-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">En el mapa</p>
              <div className="space-y-2">
                {[
                  { label: 'Visitas ubicadas', color: '#10B981', count: conCoords },
                  { label: 'Plantas propias',  color: '#1D4ED8', count: nPlantas },
                  { label: 'Competencia',      color: '#DC2626', count: nCompetencia },
                ].map(item => (
                  <div key={item.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: item.color }} />
                      <span className="text-[11px] text-slate-600">{item.label}</span>
                    </div>
                    <span className="text-xs font-bold text-slate-700 tabular-nums">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
