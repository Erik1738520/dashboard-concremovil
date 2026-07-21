import { useState, useEffect, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, CartesianGrid, ReferenceLine,
} from 'recharts';
import {
  TrendingUp, Users, UserPlus, MapPin, Fuel,
  Star, Receipt, Package, SlidersHorizontal, X, ChevronRight,
  Phone, Loader, Trophy,
} from 'lucide-react';

import Header from '../components/Header';
import AvatarAgente from '../components/AvatarAgente';
import { useDatos } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { fetchVisitas } from '../utils/visitasData';
import { fetchEOX, filtrarEOX } from '../utils/eoxData';
import {
  filtrarVentasPorPeriodo, aniosDisponibles, ventasMensualesPorAnio,
} from '../utils/metricas';
import { formatoMoneda, formatoNumero, parsearFecha } from '../utils/formatters';

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const MEDALLAS = ['🥇','🥈','🥉'];
const PALETA = ['#10B981','#3B82F6','#8B5CF6','#F59E0B','#EF4444','#06B6D4','#F97316','#EC4899'];
const COLORES_TEND = ['#94A3B8', '#6366F1', '#C8102E']; // oldest → newest

/* ── Mini componentes ── */

function StatChip({ label, valor, color = 'slate' }) {
  const bg = {
    green:  'bg-emerald-50  text-emerald-700',
    blue:   'bg-blue-50     text-blue-700',
    amber:  'bg-amber-50    text-amber-700',
    red:    'bg-red-50      text-red-600',
    purple: 'bg-violet-50   text-violet-700',
    indigo: 'bg-indigo-50   text-indigo-700',
    slate:  'bg-slate-100   text-slate-600',
  }[color] || 'bg-slate-100 text-slate-600';
  return (
    <div className={`rounded-2xl p-3 ${bg.split(' ')[0]}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1">{label}</p>
      <p className={`text-lg font-black leading-none tabular-nums ${bg.split(' ')[1]}`}>{valor}</p>
    </div>
  );
}

function KPICard({ titulo, valor, sub, color, icono }) {
  const ico = {
    red:    'bg-red-50    text-red-500',
    green:  'bg-emerald-50 text-emerald-600',
    amber:  'bg-amber-50  text-amber-600',
    blue:   'bg-blue-50   text-blue-600',
    purple: 'bg-violet-50 text-violet-600',
  }[color] || 'bg-slate-100 text-slate-500';
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${ico}`}>{icono}</div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">{titulo}</p>
        <p className="text-xl font-black text-gray-900 leading-none truncate">{valor}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-0.5 truncate">{sub}</p>}
      </div>
    </div>
  );
}

function SmallDonut({ data, colors, size = 70 }) {
  return (
    <PieChart width={size} height={size}>
      <Pie data={data} cx="50%" cy="50%" innerRadius={size*0.3} outerRadius={size*0.45}
        dataKey="value" paddingAngle={3} startAngle={90} endAngle={-270}>
        {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
      </Pie>
    </PieChart>
  );
}

function BarraH({ label, valor, max, color = '#10B981', subLabel }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="w-28 shrink-0 text-[11px] text-slate-600 truncate font-medium">{label}</div>
      <div className="flex-1 h-5 bg-slate-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: color }} />
      </div>
      <div className="w-20 shrink-0 text-right">
        <span className="text-xs font-bold text-slate-700 tabular-nums">{subLabel || formatoMoneda(valor)}</span>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PÁGINA PRINCIPAL
══════════════════════════════════════════════════════════════════════ */
export default function FuerzaVentas() {
  const { ventas, mapaAgentes, cargando } = useDatos();
  const { usuario } = useAuth();
  const modoPersonal = usuario?.rol === 'Ventas' && !!usuario?.cve_age;

  const [anioSel,    setAnioSel]    = useState(() => String(new Date().getFullYear()));
  const [mesSel,     setMesSel]     = useState('');
  const [grupoSel,   setGrupoSel]   = useState('');
  const [agenteId,   setAgenteId]   = useState(null);
  const [aniosOcultos, setAniosOcultos] = useState(new Set());
  const [eoxData,    setEoxData]    = useState([]);
  const [visitasAll, setVisitasAll] = useState([]);
  const [cargandoExtra, setCargandoExtra] = useState(true);

  useEffect(() => {
    Promise.all([fetchVisitas(), fetchEOX()])
      .then(([v, e]) => { setVisitasAll(v); setEoxData(e); })
      .catch(() => {})
      .finally(() => setCargandoExtra(false));
  }, []);

  /* ── Filtros disponibles ── */
  const anios  = useMemo(() => aniosDisponibles(ventas), [ventas]);
  const grupos = useMemo(() =>
    [...new Set(Object.values(mapaAgentes).map(a => (a['Grupo agentes']||'').trim()).filter(Boolean))].sort(),
  [mapaAgentes]);

  /* ── Ventas filtradas ── */
  const ventasFiltradas = useMemo(() => {
    let r = ventas;
    if (grupoSel) {
      const cves = new Set(
        Object.values(mapaAgentes)
          .filter(a => (a['Grupo agentes']||'').trim() === grupoSel)
          .map(a => String(a.cve_age))
      );
      r = r.filter(v => cves.has(String(v.cve_age)));
    }
    if (anioSel) r = filtrarVentasPorPeriodo(r, Number(anioSel), mesSel ? Number(mesSel) : null);
    return r;
  }, [ventas, anioSel, mesSel, grupoSel, mapaAgentes]);

  /* ── Primeras apariciones globales (para clientes nuevos) ── */
  const primerasApar = useMemo(() => {
    const m = {};
    ventas.forEach(v => {
      const nom = String(v.nom_fac || '').trim();
      if (!nom) return;
      const f = parsearFecha(v.falta_fac);
      if (!f) return;
      if (!m[nom] || f < m[nom]) m[nom] = f;
    });
    return m;
  }, [ventas]);

  const periodoStart = useMemo(() =>
    anioSel ? new Date(Number(anioSel), mesSel ? Number(mesSel)-1 : 0, 1) : null,
  [anioSel, mesSel]);
  const periodoEnd = useMemo(() =>
    anioSel ? (mesSel
      ? new Date(Number(anioSel), Number(mesSel), 0, 23, 59, 59)
      : new Date(Number(anioSel), 11, 31, 23, 59, 59)
    ) : null,
  [anioSel, mesSel]);

  /* ── Métricas por agente ── */
  const agentesMetricas = useMemo(() => {
    const totalGral = ventasFiltradas.reduce((s, v) => s + (Number(v.total_fac)||0), 0);
    const mapa = {};

    ventasFiltradas.forEach(v => {
      const key = String(v.cve_age);
      const ag  = mapaAgentes[key];
      if (!mapa[key]) {
        const rawNombre = ag?.['Nombre vendedor'] || '';
        const nombre = (!rawNombre || rawNombre.trim() === '#N/D') ? key : rawNombre.trim();
        mapa[key] = {
          cve_age: key, nombre,
          grupo: (ag?.['Grupo agentes'] || '').trim(),
          estatus: ag?.Estatus || 'ACTIVO',
          aliasEOX: (ag?.['Nombre EOX'] || '').split(',').map(s => s.trim()).filter(Boolean),
          aliasVisita: [
            (ag?.['Nombre Visita']   || '').trim(),
            (ag?.['Nombre vendedor'] || '').trim(),
          ].filter(Boolean),
          totalVentas: 0, totalM3: 0,
          facts: new Set(), clis: new Set(), nuevosSet: new Set(),
          cliMap: {}, prodMap: {},
        };
      }
      const a = mapa[key];
      a.totalVentas += Number(v.total_fac) || 0;
      if (v._contarCantidad !== false) a.totalM3 += Number(v.cant_surt) || 0;
      if (v.no_fac) a.facts.add(v.no_fac);
      const nom = String(v.nom_fac || '').trim();
      if (nom) {
        a.clis.add(nom);
        const primera = primerasApar[nom];
        if (primera && periodoStart && primera >= periodoStart && (!periodoEnd || primera <= periodoEnd))
          a.nuevosSet.add(nom);
        if (!a.cliMap[nom]) a.cliMap[nom] = { nombre: nom, ventas: 0, m3: 0, facts: new Set() };
        a.cliMap[nom].ventas += Number(v.total_fac) || 0;
        if (v._contarCantidad !== false) a.cliMap[nom].m3 += Number(v.cant_surt) || 0;
        if (v.no_fac) a.cliMap[nom].facts.add(v.no_fac);
      }
      const prod = String(v.cve_prod || '');
      if (prod) {
        if (!a.prodMap[prod]) a.prodMap[prod] = { cve_prod: prod, desc: v.desc_prod || prod, ventas: 0, m3: 0 };
        a.prodMap[prod].ventas += Number(v.total_fac) || 0;
        if (v._contarCantidad !== false) a.prodMap[prod].m3 += Number(v.cant_surt) || 0;
      }
    });

    return Object.values(mapa).map(a => {
      const nF = a.facts.size;
      const eoxR = filtrarEOX(eoxData, a.aliasEOX, anioSel || null, mesSel || null);
      const gasPesos  = eoxR.reduce((s, r) => s + r.pesos,  0);
      const gasLitros = eoxR.reduce((s, r) => s + r.litros, 0);

      const namesLow = a.aliasVisita.map(n => n.toLowerCase());
      const visAgente = visitasAll.filter(v => {
        if (!namesLow.some(n => n === (v.vendedor||'').trim().toLowerCase())) return false;
        if (anioSel && v.anio !== Number(anioSel)) return false;
        if (mesSel  && v.mes  !== Number(mesSel))  return false;
        return true;
      });
      const nVisitas  = visAgente.filter(v => v.llamadaVisita?.toLowerCase().includes('visita')).length;
      const nLlamadas = visAgente.filter(v => v.llamadaVisita?.toLowerCase().includes('llamada')).length;
      const nCliV     = visAgente.filter(v => v.tipo?.toLowerCase().includes('cliente')).length;
      const nProsp    = visAgente.filter(v => v.tipo?.toLowerCase().includes('prospecto')).length;

      return {
        cve_age: a.cve_age, nombre: a.nombre, grupo: a.grupo, estatus: a.estatus,
        totalVentas: a.totalVentas, totalM3: a.totalM3,
        numFacturas: nF, numClientes: a.clis.size, numNuevos: a.nuevosSet.size,
        ticketProm: nF > 0 ? a.totalVentas / nF : 0,
        pctTotal: totalGral > 0 ? (a.totalVentas / totalGral) * 100 : 0,
        gasPesos, gasLitros,
        nVisitas, nLlamadas, nCliV, nProsp,
        topClientes: Object.values(a.cliMap)
          .map(c => ({ ...c, numFacts: c.facts.size }))
          .sort((x, y) => y.ventas - x.ventas).slice(0, 8),
        topProductos: Object.values(a.prodMap)
          .sort((x, y) => y.ventas - x.ventas).slice(0, 5),
      };
    })
    .sort((a, b) => b.totalVentas - a.totalVentas)
    .map((a, i) => ({ ...a, ranking: i + 1 }));
  }, [ventasFiltradas, mapaAgentes, primerasApar, periodoStart, periodoEnd,
      eoxData, visitasAll, anioSel, mesSel]);

  /* ── Vista filtrada al agente personal (rol Ventas) ── */
  const agentesVista = useMemo(() =>
    modoPersonal
      ? agentesMetricas.filter(a => String(a.cve_age) === String(usuario?.cve_age))
      : agentesMetricas,
  [agentesMetricas, modoPersonal, usuario?.cve_age]);

  const miRanking = useMemo(() =>
    modoPersonal && usuario?.cve_age
      ? (agentesMetricas.findIndex(a => String(a.cve_age) === String(usuario.cve_age)) + 1) || null
      : null,
  [agentesMetricas, modoPersonal, usuario?.cve_age]);

  /* ── Auto-seleccionar agente en modo personal ── */
  useEffect(() => {
    if (modoPersonal && usuario?.cve_age) setAgenteId(String(usuario.cve_age));
  }, [modoPersonal, usuario?.cve_age]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const src    = modoPersonal ? agentesVista : agentesMetricas;
    const totalV   = src.reduce((s, a) => s + a.totalVentas, 0);
    const totalCN  = src.reduce((s, a) => s + a.numNuevos,   0);
    const totalAct = src.reduce((s, a) => s + a.nVisitas + a.nLlamadas, 0);
    const totalGas = src.reduce((s, a) => s + a.gasPesos,    0);
    const lider    = src[0];
    return { totalV, totalCN, totalAct, totalGas, lider, n: agentesMetricas.length };
  }, [agentesMetricas, agentesVista, modoPersonal]);

  /* ── Agente seleccionado ── */
  const sel = modoPersonal
    ? (agentesVista[0] ?? null)
    : (agenteId ? agentesMetricas.find(a => a.cve_age === agenteId) : null);

  /* ── Tendencia multi-año del agente seleccionado ── */
  const { tendData, tendAnios } = useMemo(() => {
    if (!sel) return { tendData: [], tendAnios: [] };
    const vAg = ventas.filter(v => String(v.cve_age) === sel.cve_age);
    const por  = ventasMensualesPorAnio(vAg);
    const nums = Object.keys(por).map(Number).filter(n => n > 0);
    const anioBase = anioSel ? Number(anioSel) : Math.max(0, ...nums);
    const anios = nums.filter(n => n <= anioBase).sort((a, b) => a - b).slice(-3);
    const data  = MESES.map((mes, i) => {
      const row = { mes };
      anios.forEach(a => { row[`y${a}`] = (por[a] || {})[i + 1] || 0; });
      return row;
    });
    return { tendData: data, tendAnios: anios };
  }, [sel, ventas, anioSel]);

  /* ── Selector estilo select ── */
  const selectCls = "appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none transition-colors";
  const arrow = { backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 10px center' };

  if (cargando && !ventas.length) return (
    <div className="flex-1 flex items-center justify-center">
      <Loader className="w-6 h-6 animate-spin text-slate-300" />
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header titulo="Fuerza de Ventas" />

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-5">

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-slate-500 pr-3 border-r border-gray-200">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
            </div>
            <select value={anioSel} style={arrow}
              onChange={e => { setAnioSel(e.target.value); setMesSel(''); setAgenteId(null); }}
              className={selectCls}>
              <option value="">Todos los años</option>
              {anios.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
            <select value={mesSel} disabled={!anioSel} style={arrow}
              onChange={e => { setMesSel(e.target.value); setAgenteId(null); }}
              className={`${selectCls} disabled:opacity-40`}>
              <option value="">Todos los meses</option>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>
            {!modoPersonal && (
              <select value={grupoSel} style={arrow}
                onChange={e => { setGrupoSel(e.target.value); setAgenteId(null); }}
                className={selectCls}>
                <option value="">Todos los grupos</option>
                {grupos.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            )}
            {(anioSel || mesSel || grupoSel) && (
              <button onClick={() => { setAnioSel(''); setMesSel(''); setGrupoSel(''); setAgenteId(null); }}
                className="flex items-center gap-1 text-sm text-slate-400 hover:text-slate-600 border border-gray-200 rounded-lg px-2.5 py-1.5">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}
            {cargandoExtra && (
              <span className="ml-auto text-xs text-slate-400 flex items-center gap-1.5">
                <Loader className="w-3 h-3 animate-spin" /> cargando visitas…
              </span>
            )}
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
          <KPICard
            titulo={modoPersonal ? 'Mis Ventas' : 'Ventas del Equipo'}
            valor={formatoMoneda(kpis.totalV)}
            sub={modoPersonal ? `${sel?.numFacturas ?? 0} facturas` : `${kpis.n} agentes activos`}
            icono={<TrendingUp className="w-5 h-5"/>} color="red" />
          {modoPersonal ? (
            <KPICard titulo="Mi Posición"
              valor={miRanking ? `#${miRanking}` : '—'}
              sub={`de ${kpis.n} agentes`}
              icono={<Trophy className="w-5 h-5"/>} color="amber" />
          ) : (
            <KPICard titulo="Agente Líder" valor={kpis.lider?.nombre || '—'}
              sub={kpis.lider ? `${formatoMoneda(kpis.lider.totalVentas)} · ${kpis.lider.pctTotal.toFixed(1)}%` : ''}
              icono={<Star className="w-5 h-5"/>} color="amber" />
          )}
          <KPICard
            titulo={modoPersonal ? 'Mis Clientes Nuevos' : 'Clientes Nuevos'}
            valor={formatoNumero(kpis.totalCN)}
            sub="Primera compra en el período"
            icono={<UserPlus className="w-5 h-5"/>} color="green" />
          <KPICard
            titulo={modoPersonal ? 'Mis Visitas' : 'Visitas + Llamadas'}
            valor={formatoNumero(kpis.totalAct)}
            sub={modoPersonal ? 'Actividad personal' : 'Actividad total del equipo'}
            icono={<MapPin className="w-5 h-5"/>} color="blue" />
          <KPICard
            titulo={modoPersonal ? 'Mi Combustible' : 'Combustible Gastado'}
            valor={formatoMoneda(kpis.totalGas)}
            sub="Consumo EOX del período"
            icono={<Fuel className="w-5 h-5"/>} color="purple" />
        </div>

        {/* ── Gráfica horizontal (top 10) — oculta en modo personal ── */}
        {!modoPersonal && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-3 md:p-5">
          <h3 className="font-bold text-gray-900 mb-1">Ranking de Ventas</h3>
          <p className="text-xs text-slate-400 mb-4">Top 10 agentes — haz clic en una barra para ver el perfil</p>
          {agentesMetricas.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-10">Sin datos en el período</p>
          ) : (
            <ResponsiveContainer width="100%" height={Math.max(180, agentesMetricas.slice(0,10).length * 44)}>
              <BarChart
                layout="vertical"
                data={agentesMetricas.slice(0,10).map(a => ({ ...a, key: a.cve_age }))}
                margin={{ top: 0, right: 80, left: 0, bottom: 0 }}
                onClick={({ activePayload }) => {
                  if (!activePayload?.[0]) return;
                  const id = activePayload[0].payload.cve_age;
                  setAgenteId(prev => prev === id ? null : id);
                  setAniosOcultos(new Set());
                }}
              >
                <XAxis type="number" hide />
                <YAxis type="category" dataKey="nombre" width={130}
                  tick={{ fontSize: 11, fill: '#64748B' }} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => [formatoMoneda(v), 'Ventas']}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }}
                />
                <Bar dataKey="totalVentas" radius={[0,6,6,0]} maxBarSize={28} cursor="pointer">
                  {agentesMetricas.slice(0,10).map((a, i) => (
                    <Cell key={a.cve_age}
                      fill={a.cve_age === agenteId ? '#7C0E1E' : '#C8102E'}
                      opacity={agenteId && a.cve_age !== agenteId ? 0.35 : 1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>}

        {/* ── Perfil del agente seleccionado ── */}
        {sel && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            {/* Header accent */}
            <div className="h-1 bg-gradient-to-r from-brand-red via-red-500 to-rose-400" />

            {/* Nombre + cierre */}
            <div className="flex items-center justify-between px-4 md:px-6 pt-4 md:pt-5 pb-3 md:pb-4 border-b border-gray-100">
              <div className="flex items-center gap-4">
                <AvatarAgente nombre={sel.nombre} indice={sel.ranking - 1} size="lg" />
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{MEDALLAS[sel.ranking-1] || `#${sel.ranking}`}</span>
                    <h3 className="text-lg font-black text-gray-900">{sel.nombre}</h3>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    {sel.grupo && (
                      <span className="text-[11px] font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                        {sel.grupo}
                      </span>
                    )}
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full
                      ${String(sel.estatus||'').toUpperCase() === 'INACTIVO'
                        ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-700'}`}>
                      {String(sel.estatus||'').toUpperCase() === 'INACTIVO' ? 'Inactivo' : 'Activo'}
                    </span>
                    <span className="text-xs text-slate-400">Clave: {sel.cve_age}</span>
                  </div>
                </div>
              </div>
              {!modoPersonal && (
                <button onClick={() => setAgenteId(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
            </div>

            {/* Métricas principales */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 md:gap-3 p-3 md:p-5 border-b border-gray-100">
              <StatChip label="Ventas"       valor={sel.totalVentas >= 1e6 ? `$${(sel.totalVentas/1e6).toFixed(1)}M` : formatoMoneda(sel.totalVentas)} color="green" />
              <StatChip label="Volumen m³"   valor={`${formatoNumero(sel.totalM3,1)} m³`} color="blue" />
              <StatChip label="Clientes"     valor={formatoNumero(sel.numClientes)}    color="indigo" />
              <StatChip label="Cli. Nuevos"  valor={formatoNumero(sel.numNuevos)}      color="green" />
              <StatChip label="Facturas"     valor={formatoNumero(sel.numFacturas)}    color="slate" />
              <StatChip label="Ticket Prom." valor={formatoMoneda(sel.ticketProm)}     color="amber" />
              <StatChip label="Visitas"      valor={`${sel.nVisitas} / ${sel.nLlamadas}`} color="blue" />
              <StatChip label="Gasolina"     valor={formatoMoneda(sel.gasPesos)}       color="red" />
            </div>

            {/* Detalle: 3 columnas */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-gray-100">

              {/* Columna 1: Top clientes */}
              <div className="p-3 md:p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Top Clientes
                </h4>
                {sel.topClientes.length === 0
                  ? <p className="text-slate-300 text-xs">Sin datos</p>
                  : (
                    <div className="space-y-2">
                      {sel.topClientes.map((c, i) => (
                        <BarraH key={i}
                          label={c.nombre}
                          valor={c.ventas}
                          max={sel.topClientes[0].ventas}
                          color={PALETA[i % PALETA.length]}
                        />
                      ))}
                    </div>
                  )}
              </div>

              {/* Columna 2: Top productos + visitas */}
              <div className="p-3 md:p-5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" /> Top Productos
                </h4>
                {sel.topProductos.length === 0
                  ? <p className="text-slate-300 text-xs">Sin datos</p>
                  : (
                    <>
                      <div className="flex gap-3 mb-3">
                        <SmallDonut
                          data={sel.topProductos.map(p => ({ name: p.desc, value: p.ventas }))}
                          colors={PALETA}
                        />
                        <div className="flex-1 space-y-1.5">
                          {sel.topProductos.map((p, i) => (
                            <div key={i} className="flex items-center gap-1.5 min-w-0">
                              <div className="w-2 h-2 rounded-full shrink-0" style={{ background: PALETA[i] }} />
                              <span className="text-[11px] text-slate-600 truncate flex-1">{p.cve_prod}</span>
                              <span className="text-[11px] font-bold text-slate-700 shrink-0 tabular-nums">
                                {p.m3 > 0 ? `${formatoNumero(p.m3,0)} m³` : formatoMoneda(p.ventas)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                {/* Visitas mini */}
                {(sel.nVisitas + sel.nLlamadas) > 0 && (
                  <>
                    <div className="h-px bg-slate-100 my-3" />
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" /> Actividad de Campo
                    </h4>
                    <div className="flex gap-3 items-center">
                      <SmallDonut
                        data={[
                          { name: 'Visitas',  value: sel.nVisitas },
                          { name: 'Llamadas', value: sel.nLlamadas },
                        ]}
                        colors={['#6366F1','#C8102E']}
                        size={60}
                      />
                      <div className="space-y-1.5">
                        {[
                          { label: 'Visitas',    val: sel.nVisitas,   color: '#6366F1' },
                          { label: 'Llamadas',   val: sel.nLlamadas,  color: '#C8102E' },
                          { label: 'Clientes',   val: sel.nCliV,      color: '#10B981' },
                          { label: 'Prospectos', val: sel.nProsp,     color: '#F59E0B' },
                        ].map(r => (
                          <div key={r.label} className="flex items-center gap-2">
                            <div className="w-2 h-2 rounded-full" style={{ background: r.color }} />
                            <span className="text-[11px] text-slate-600 w-20">{r.label}</span>
                            <span className="text-[11px] font-bold text-slate-700 tabular-nums">{r.val}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {sel.gasLitros > 0 && (
                      <div className="mt-2 bg-orange-50 rounded-xl p-2.5 flex items-center justify-between">
                        <span className="text-[11px] text-orange-600 font-medium flex items-center gap-1">
                          <Fuel className="w-3 h-3" /> Gasolina
                        </span>
                        <span className="text-[11px] font-bold text-orange-700">
                          {formatoMoneda(sel.gasPesos)} · {formatoNumero(sel.gasLitros,1)} L
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Columna 3: Tendencia mensual */}
              <div className="p-3 md:p-5">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    <TrendingUp className="w-3.5 h-3.5" /> Tendencia
                  </h4>
                  {/* Toggles de año */}
                  {tendAnios.length > 1 && (
                    <div className="flex items-center gap-1.5">
                      {tendAnios.map((a, i) => {
                        const color = COLORES_TEND[i + (3 - tendAnios.length)];
                        const oculto = aniosOcultos.has(a);
                        return (
                          <button key={a}
                            onClick={() => setAniosOcultos(prev => {
                              const next = new Set(prev);
                              next.has(a) ? next.delete(a) : next.add(a);
                              return next;
                            })}
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full border text-[10px] font-bold transition-all ${
                              oculto
                                ? 'border-slate-200 text-slate-400 bg-slate-50'
                                : 'bg-white shadow-sm'
                            }`}
                            style={{ borderColor: oculto ? undefined : color, color: oculto ? undefined : color }}
                          >
                            <div className="w-2 h-2 rounded-full transition-colors"
                              style={{ background: oculto ? '#CBD5E1' : color }} />
                            {a}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={165}>
                  <LineChart data={tendData} margin={{ top: 8, right: 10, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v, name) => [formatoMoneda(v), name.replace('y', '')]}
                      contentStyle={{ borderRadius: 10, border: '1px solid #E7EBF0', fontSize: 11 }}
                    />
                    {tendAnios.map((a, i) => {
                      if (aniosOcultos.has(a)) return null;
                      const color  = COLORES_TEND[i + (3 - tendAnios.length)];
                      const isMain = i === tendAnios.length - 1;
                      return (
                        <Line key={a} type="monotone" dataKey={`y${a}`}
                          stroke={color} strokeWidth={isMain ? 2.5 : 1.5}
                          strokeDasharray={isMain ? undefined : '5 3'}
                          dot={isMain ? { r: 3, fill: color } : false}
                          activeDot={{ r: 4 }}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>

                {/* % del total */}
                <div className="mt-3 bg-slate-50 rounded-xl p-3 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">% del total equipo</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-red rounded-full"
                        style={{ width: `${Math.min(100, sel.pctTotal)}%` }} />
                    </div>
                    <span className="text-xs font-black text-slate-800 tabular-nums">
                      {sel.pctTotal.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Tabla ranking completa — oculta en modo personal ── */}
        {!modoPersonal && <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">Rendimiento Completo del Equipo</h3>
            <span className="text-xs text-slate-400">{agentesMetricas.length} agentes</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['#','Agente','Ventas','% Total','m³','Clientes','Cli. Nuevos','Facturas','Ticket Prom.','Visitas','Gasolina'].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-slate-400 uppercase tracking-wider py-3 px-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {agentesMetricas.map((a, i) => (
                  <tr key={a.cve_age}
                    onClick={() => { setAgenteId(prev => prev === a.cve_age ? null : a.cve_age); setAniosOcultos(new Set()); }}
                    className={`border-b border-gray-100 last:border-0 cursor-pointer transition-colors
                      ${a.cve_age === agenteId ? 'bg-red-50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="py-3 px-3 text-center">
                      {MEDALLAS[i] || <span className="text-xs text-slate-400">{i+1}</span>}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <AvatarAgente nombre={a.nombre} indice={i} />
                        <div>
                          <p className="text-sm font-semibold text-gray-800">{a.nombre}</p>
                          {a.grupo && <p className="text-[10px] text-slate-400">{a.grupo}</p>}
                        </div>
                        {a.cve_age === agenteId && <ChevronRight className="w-3.5 h-3.5 text-brand-red ml-1" />}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-brand-red tabular-nums text-sm">{formatoMoneda(a.totalVentas)}</td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-brand-red rounded-full" style={{ width: `${Math.min(100, a.pctTotal)}%` }} />
                        </div>
                        <span className="text-xs text-slate-500 tabular-nums">{a.pctTotal.toFixed(1)}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 tabular-nums">{formatoNumero(a.totalM3,1)}</td>
                    <td className="py-3 px-3 text-sm text-slate-600 tabular-nums">{formatoNumero(a.numClientes)}</td>
                    <td className="py-3 px-3">
                      {a.numNuevos > 0
                        ? <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-2 py-0.5 rounded-full">{a.numNuevos}</span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 tabular-nums">{formatoNumero(a.numFacturas)}</td>
                    <td className="py-3 px-3 text-sm text-slate-600 tabular-nums">{formatoMoneda(a.ticketProm)}</td>
                    <td className="py-3 px-3">
                      {(a.nVisitas + a.nLlamadas) > 0
                        ? <span className="text-xs text-slate-600">
                            <span className="font-bold">{a.nVisitas}</span>
                            <span className="text-slate-400"> v · </span>
                            <span className="font-bold">{a.nLlamadas}</span>
                            <span className="text-slate-400"> ll</span>
                          </span>
                        : <span className="text-slate-300 text-xs">—</span>
                      }
                    </td>
                    <td className="py-3 px-3 text-sm text-slate-600 tabular-nums">
                      {a.gasPesos > 0 ? formatoMoneda(a.gasPesos) : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>}

      </div>
    </div>
  );
}
