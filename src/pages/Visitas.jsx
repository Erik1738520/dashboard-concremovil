import { useState, useMemo, useEffect, lazy, Suspense } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LabelList,
} from 'recharts';
import {
  MapPin, Users, UserPlus, Phone, AlertTriangle,
  CalendarDays, SlidersHorizontal, X, Loader, RefreshCw,
} from 'lucide-react';
import { fetchVisitas, getMesLabel } from '../utils/visitasData';
import { fetchEOX, filtrarEOX } from '../utils/eoxData';
import { useDatos } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { filtrarVentasPorPeriodo, totalVentas, totalUnidades } from '../utils/metricas';
import { formatoMoneda, formatoNumero } from '../utils/formatters';

const MapaVisitas = lazy(() => import('../components/MapaVisitas'));

// Solo pasan valores que parecen nombres de persona (sin comas, sin coordenadas, sin precios)
function esVendedorValido(v) {
  if (!v || v.trim().length < 2) return false;
  const s = v.trim();
  if (s.includes(',')) return false;                    // GPS string o CSV concatenado
  if (/^\d+$/.test(s)) return false;                   // solo números (código postal, teléfono)
  if (/\d[\.,]\d{4,}/.test(s)) return false;           // coordenada decimal larga (25.4721323)
  if (/\d[\.,]\d{2}.*iva/i.test(s)) return false;      // precio con IVA
  if (/^https?:\/\//i.test(s)) return false;           // URL
  if (/unknown/i.test(s)) return false;                // "Unknown" del GPS
  if (!/[a-záéíóúüñA-ZÁÉÍÓÚÜÑ]{2}/i.test(s)) return false; // sin al menos 2 letras
  return true;
}

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
const COLORS_TIPO    = ['#10B981', '#F59E0B'];
const COLORS_LLAMADA = ['#6366F1', '#C8102E'];

/* ── Chip de KPI ── */
function StatCard({ icono, titulo, valor, sub, color = 'slate' }) {
  const bg = {
    emerald: 'bg-emerald-50 text-emerald-600',
    amber:   'bg-amber-50  text-amber-600',
    red:     'bg-red-50    text-red-600',
    indigo:  'bg-indigo-50 text-indigo-600',
    slate:   'bg-slate-100 text-slate-500',
    blue:    'bg-blue-50   text-blue-600',
  }[color];

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${bg}`}>
        {icono}
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider leading-none mb-1">{titulo}</p>
        <p className="text-xl font-bold text-slate-800 leading-none">{valor}</p>
        {sub && <p className="text-[11px] text-slate-400 mt-1 truncate">{sub}</p>}
      </div>
    </div>
  );
}

/* ── Donut ── */
function DonutChart({ data, colors, titulo, className = '' }) {
  const total = data.reduce((s, d) => s + d.value, 0);
  return (
    <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col justify-center ${className}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">{titulo}</p>
      {total === 0 ? (
        <div className="flex items-center justify-center text-slate-300 text-sm py-4">Sin datos</div>
      ) : (
        <div className="flex items-center gap-3">
          <div style={{ width: 90, height: 90, flexShrink: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={data} cx="50%" cy="50%" innerRadius={26} outerRadius={40}
                  dataKey="value" paddingAngle={2} startAngle={90} endAngle={-270}>
                  {data.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-1.5 flex-1 min-w-0">
            {data.map((d, i) => (
              <div key={i} className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: colors[i % colors.length] }} />
                  <span className="text-[11px] text-slate-600 truncate">{d.name}</span>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-xs font-bold text-slate-700">{d.value}</span>
                  <span className="text-[10px] text-slate-400 ml-1">({total > 0 ? Math.round(d.value/total*100) : 0}%)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Tooltip personalizado ── */
function TooltipDia({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-slate-700 mb-1">{label}</p>
      <p className="text-slate-600">{payload[0].value} visita{payload[0].value !== 1 ? 's' : ''}</p>
    </div>
  );
}

/* ══════════════════════════════ PÁGINA PRINCIPAL ══════════════════════════════ */
export default function Visitas() {
  const [visitas, setVisitas]     = useState([]);
  const [cargando, setCargando]   = useState(true);
  const [error, setError]         = useState('');
  const [anioSel, setAnioSel]     = useState('');
  const [mesSel, setMesSel]       = useState('');
  const [vendedorSel, setVendedorSel] = useState('');
  const [tablaPage, setTablaPage] = useState(1);
  const [diaSelKey, setDiaSelKey] = useState(null);
  const [eoxData, setEoxData]     = useState([]);
  const TABLA_POR_PAG = 10;

  const { ventas: ventasCtx, agentes } = useDatos();
  const { usuario } = useAuth();
  const modoPersonal = usuario?.rol === 'Ventas' && !!usuario?.cve_age;

  // Nombres de visita del agente logueado (para filtrar en modo personal)
  const nombresPersonal = useMemo(() => {
    if (!modoPersonal || !usuario?.cve_age) return [];
    const ag = (agentes || []).find(a => String(a.cve_age) === String(usuario.cve_age));
    if (!ag) return [];
    return [ag['Nombre Visita'], ag['Nombre vendedor']]
      .filter(Boolean).map(n => n.trim().toLowerCase());
  }, [modoPersonal, usuario?.cve_age, agentes]);

  const cargar = async () => {
    try {
      setCargando(true); setError('');
      const [data, eox] = await Promise.all([fetchVisitas(), fetchEOX()]);
      setVisitas(data);
      setEoxData(eox);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  /* ── Opciones de filtros ── */
  const anios = useMemo(() =>
    [...new Set(visitas.map((v) => v.anio).filter(Boolean))].sort((a,b) => b-a),
  [visitas]);

  const vendedores = useMemo(() =>
    [...new Set(visitas.map((v) => v.vendedor).filter(esVendedorValido))].sort(),
  [visitas]);

  /* ── Filtrado ── */
  const filtradas = useMemo(() => visitas.filter((v) => {
    if (modoPersonal && nombresPersonal.length > 0 &&
        !nombresPersonal.includes((v.vendedor || '').trim().toLowerCase())) return false;
    if (anioSel && v.anio !== Number(anioSel)) return false;
    if (mesSel  && v.mes  !== Number(mesSel))  return false;
    if (!modoPersonal && vendedorSel && v.vendedor !== vendedorSel) return false;
    return true;
  }), [visitas, anioSel, mesSel, vendedorSel, modoPersonal, nombresPersonal]);

  /* ── KPIs ── */
  const kpis = useMemo(() => {
    const total      = filtradas.length;
    const clientes   = filtradas.filter((v) => v.tipo?.toLowerCase().includes('cliente')).length;
    const prospectos = filtradas.filter((v) => v.tipo?.toLowerCase().includes('prospecto')).length;
    const conComp    = filtradas.filter((v) => v.competidor?.toLowerCase().startsWith('s')).length;
    const llamadas   = filtradas.filter((v) => v.llamadaVisita?.toLowerCase().includes('llamada')).length;
    const semanas = new Set(filtradas.map((v) => v.semanaKey).filter(Boolean)).size;
    const promSemana = semanas > 0 ? Math.round(total / semanas) : 0;
    const sinCoords  = filtradas.filter((v) => !v.lat || !v.lng).length;
    return { total, clientes, prospectos, conComp, llamadas, promSemana, sinCoords };
  }, [filtradas]);

  /* ── Donuts ── */
  const donaTipo = useMemo(() => [
    { name: 'Clientes',   value: kpis.clientes },
    { name: 'Prospectos', value: kpis.prospectos },
  ], [kpis]);

  const donaLlamada = useMemo(() => {
    const visitas_ = filtradas.filter((v) => v.llamadaVisita?.toLowerCase().includes('visita')).length;
    const llamadas_ = filtradas.filter((v) => v.llamadaVisita?.toLowerCase().includes('llamada')).length;
    return [
      { name: 'Visitas',  value: visitas_ },
      { name: 'Llamadas', value: llamadas_ },
    ];
  }, [filtradas]);

  /* ── Barras por día ── */
  const diasData = useMemo(() => {
    const mapa = {};
    filtradas.forEach((v) => {
      if (!v.fecha) return;
      const ts  = v.fecha.getTime();
      const lbl = `${String(v.fecha.getDate()).padStart(2,'0')}/${String(v.fecha.getMonth()+1).padStart(2,'0')}`;
      if (!mapa[ts]) mapa[ts] = { key: ts, label: lbl, total: 0 };
      mapa[ts].total++;
    });
    const sorted = Object.values(mapa).sort((a, b) => a.key - b.key);
    // Si hay filtro de mes mostramos todos los días; si no, últimos 60
    return mesSel ? sorted : sorted.slice(-60);
  }, [filtradas, mesSel]);

  /* ── Ranking vendedores ── */
  const rankingVendedores = useMemo(() => {
    const mapa = {};
    filtradas.forEach((v) => {
      if (!esVendedorValido(v.vendedor)) return;
      if (!mapa[v.vendedor]) mapa[v.vendedor] = { nombre: v.vendedor, total: 0, clientes: 0, prospectos: 0, conComp: 0 };
      mapa[v.vendedor].total++;
      if (v.tipo?.toLowerCase().includes('cliente'))   mapa[v.vendedor].clientes++;
      if (v.tipo?.toLowerCase().includes('prospecto')) mapa[v.vendedor].prospectos++;
      if (v.competidor?.toLowerCase().startsWith('s')) mapa[v.vendedor].conComp++;
    });
    return Object.values(mapa).sort((a, b) => b.total - a.total);
  }, [filtradas]);

  /* ── Tabla paginada ── */
  const tablaOrdenada = useMemo(() =>
    [...filtradas].sort((a, b) => (b.fecha?.getTime() || 0) - (a.fecha?.getTime() || 0)),
  [filtradas]);
  const totalPaginas = Math.max(1, Math.ceil(tablaOrdenada.length / TABLA_POR_PAG));
  const paginaActual = Math.min(tablaPage, totalPaginas);
  const tablaSlice   = tablaOrdenada.slice((paginaActual-1)*TABLA_POR_PAG, paginaActual*TABLA_POR_PAG);

  // Visitas que se muestran en el mapa: el día seleccionado en la barra, o todas las filtradas
  const visitasParaMapa = useMemo(() =>
    diaSelKey ? filtradas.filter((v) => v.fecha?.getTime() === diaSelKey) : filtradas,
  [filtradas, diaSelKey]);

  // Datos cruzados del vendedor seleccionado
  const cruzadoVendedor = useMemo(() => {
    if (!vendedorSel) return null;

    // Buscar agente: primero por Nombre Visita, luego por Nombre vendedor
    const sel = vendedorSel.trim().toLowerCase();
    const agente = (agentes || []).find(a =>
      (a['Nombre Visita'] || '').trim().toLowerCase() === sel ||
      (a['Nombre vendedor'] || '').trim().toLowerCase() === sel
    );

    // ── Ventas desde DataContext ──
    let totalPesos = 0, totalM3 = 0;
    if (agente?.cve_age) {
      const ventasAgente  = (ventasCtx || []).filter(v => String(v.cve_age) === String(agente.cve_age));
      const ventasPeriodo = filtrarVentasPorPeriodo(ventasAgente, anioSel || null, mesSel || null);
      totalPesos = totalVentas(ventasPeriodo);
      totalM3    = totalUnidades(ventasPeriodo);
    }

    // ── Combustible desde EOX ──
    const nombresEOX = (agente?.['Nombre EOX'] || '')
      .split(',').map(n => n.trim()).filter(Boolean);
    const eoxPeriodo     = nombresEOX.length ? filtrarEOX(eoxData, nombresEOX, anioSel || null, mesSel || null) : [];
    const totalGasPesos  = eoxPeriodo.reduce((s, r) => s + r.pesos,  0);
    const totalGasLitros = eoxPeriodo.reduce((s, r) => s + r.litros, 0);

    return { totalPesos, totalM3, totalGasPesos, totalGasLitros, tieneAgente: !!agente };
  }, [vendedorSel, agentes, ventasCtx, eoxData, anioSel, mesSel]);

  const resetFiltros = () => { setAnioSel(''); setMesSel(''); setVendedorSel(''); setTablaPage(1); setDiaSelKey(null); };

  if (cargando) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <img src="/logo-carga.png" alt="Cargando" className="w-14 h-14 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Cargando visitas…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <p className="text-sm text-red-500">{error}</p>
        <button onClick={cargar} className="text-sm text-brand-red underline">Reintentar</button>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white border-b border-gray-200 sticky top-0 z-10">
        <h1 className="text-lg md:text-xl font-bold text-gray-900">Visitas de Campo</h1>
        <button onClick={cargar}
          className="flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors rounded-full px-3 py-1.5 text-sm font-medium">
          <RefreshCw className="w-3.5 h-3.5" />
          Actualizar
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-5">

        {/* ── Filtros ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-slate-500 pr-3 border-r border-gray-200">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
            </div>

            <select value={anioSel} onChange={(e) => { setAnioSel(e.target.value); setMesSel(''); setTablaPage(1); }}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-7 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
              <option value="">Todos los años</option>
              {anios.map((a) => <option key={a} value={a}>{a}</option>)}
            </select>

            <select value={mesSel} onChange={(e) => { setMesSel(e.target.value); setTablaPage(1); }}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-7 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
              <option value="">Todos los meses</option>
              {MESES.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
            </select>

            {modoPersonal
              ? <span className="text-sm font-medium text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg">
                  {nombresPersonal[0] || 'Mi actividad'}
                </span>
              : <select value={vendedorSel} onChange={(e) => { setVendedorSel(e.target.value); setTablaPage(1); }}
                  className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-7 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
                  style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat:'no-repeat', backgroundPosition:'right 8px center' }}>
                  <option value="">Todos los vendedores</option>
                  {vendedores.map((v) => <option key={v} value={v}>{v}</option>)}
                </select>
            }

            {(anioSel || mesSel || vendedorSel) && (
              <button onClick={resetFiltros}
                className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors">
                <X className="w-3.5 h-3.5" /> Limpiar
              </button>
            )}

            <span className="ml-auto text-xs text-slate-400">{filtradas.length} registros</span>
          </div>
        </div>

        {/* ── KPIs ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-7 gap-3">
          <StatCard icono={<MapPin className="w-5 h-5"/>}        titulo="Total Registros"       valor={kpis.total}       color="slate" />
          <StatCard icono={<Users className="w-5 h-5"/>}         titulo="Clientes"              valor={kpis.clientes}    color="emerald" />
          <StatCard icono={<UserPlus className="w-5 h-5"/>}      titulo="Prospectos"            valor={kpis.prospectos}  color="amber" />
          <StatCard icono={<CalendarDays className="w-5 h-5"/>}  titulo="Prom. / Semana"        valor={kpis.promSemana}  color="blue" />
          <StatCard icono={<Phone className="w-5 h-5"/>}         titulo="Llamadas"              valor={kpis.llamadas}    color="indigo" />
          <StatCard icono={<AlertTriangle className="w-5 h-5"/>} titulo="Con Competidor"        valor={kpis.conComp}     color="red" />
          <StatCard icono={<MapPin className="w-5 h-5"/>}        titulo="Sin Coordenadas"       valor={kpis.sinCoords}   color="slate" />
        </div>

        {/* ── Perfil del vendedor ── */}
        {vendedorSel && (() => {
          const v = rankingVendedores.find((r) => r.nombre === vendedorSel);
          if (!v) return null;
          return (
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 rounded-2xl p-5 text-white">
              {/* Fila superior: avatar + nombre + visitas */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="w-12 h-12 rounded-full bg-brand-red flex items-center justify-center font-bold text-lg shrink-0">
                  {v.nombre.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-bold text-base">{v.nombre}</p>
                  <p className="text-slate-300 text-xs">Vendedor · Perfil del período</p>
                </div>
                {/* Visitas */}
                <div className="flex gap-5 ml-auto flex-wrap">
                  {[
                    { label: 'Visitas', val: v.total },
                    { label: 'Clientes', val: v.clientes },
                    { label: 'Prospectos', val: v.prospectos },
                    { label: 'Con Competidor', val: v.conComp },
                  ].map(({ label, val }) => (
                    <div key={label} className="text-center">
                      <p className="text-2xl font-bold leading-none">{val}</p>
                      <p className="text-slate-300 text-[11px] mt-0.5">{label}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Fila inferior: ventas + gasolina */}
              <div className="mt-4 pt-4 border-t border-slate-600 grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Ventas ($)</p>
                  <p className="text-lg font-bold text-emerald-400">
                    {cruzadoVendedor ? formatoMoneda(cruzadoVendedor.totalPesos) : '—'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Volumen (m³)</p>
                  <p className="text-lg font-bold text-blue-400">
                    {cruzadoVendedor ? `${formatoNumero(cruzadoVendedor.totalM3)} m³` : '—'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Combustible ($)</p>
                  <p className="text-lg font-bold text-amber-400">
                    {cruzadoVendedor ? formatoMoneda(cruzadoVendedor.totalGasPesos) : '—'}
                  </p>
                </div>
                <div className="bg-slate-700/50 rounded-xl p-3">
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1">Litros cargados</p>
                  <p className="text-lg font-bold text-orange-400">
                    {cruzadoVendedor ? `${formatoNumero(cruzadoVendedor.totalGasLitros)} L` : '—'}
                  </p>
                </div>
              </div>
            </div>
          );
        })()}

        {/* ── Mapa + Donuts ── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Mapa */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col" style={{ height: 320 }}>
            <div className="px-4 pt-3 pb-2 border-b border-gray-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <p className="font-bold text-gray-900 text-sm">Mapa de Visitas</p>
                {diaSelKey && (
                  <span className="flex items-center gap-1 bg-brand-red/10 text-brand-red text-[11px] font-semibold px-2 py-0.5 rounded-full">
                    {diasData.find(d => d.key === diaSelKey)?.label}
                    <button onClick={() => setDiaSelKey(null)} className="hover:opacity-70 ml-0.5">✕</button>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">{visitasParaMapa.filter(v=>v.lat&&v.lng).length} ubicaciones</p>
            </div>
            <div className="flex-1 min-h-0">
              <Suspense fallback={<div className="flex items-center justify-center h-full text-slate-400 text-sm"><Loader className="w-5 h-5 animate-spin mr-2"/>Cargando mapa…</div>}>
                <MapaVisitas visitas={visitasParaMapa} />
              </Suspense>
            </div>
          </div>

          {/* Donuts */}
          <div className="lg:col-span-1 flex flex-col gap-3" style={{ height: 300 }}>
            <DonutChart data={donaTipo}    colors={COLORS_TIPO}    titulo="Clientes vs Prospectos" className="flex-1 min-h-0" />
            <DonutChart data={donaLlamada} colors={COLORS_LLAMADA} titulo="Visitas vs Llamadas"    className="flex-1 min-h-0" />
          </div>
        </div>

        {/* ── Barras por día ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="mb-4">
            <h3 className="font-bold text-gray-900">Visitas por Día</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {mesSel ? 'Todos los días del mes seleccionado' : 'Últimos 60 días con actividad'}
            </p>
          </div>
          {diasData.length === 0 ? (
            <p className="text-slate-300 text-sm text-center py-8">Sin datos para mostrar</p>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={diasData} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}
                barSize={diasData.length > 20 ? 10 : 22}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#94A3B8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<TooltipDia />} />
                <Bar dataKey="total" radius={[4,4,0,0]} cursor="pointer"
                  onClick={(data) => setDiaSelKey(prev => prev === data.key ? null : data.key)}>
                  {diasData.map((entry) => (
                    <Cell key={entry.key}
                      fill={entry.key === diaSelKey ? '#7C0E1E' : '#C8102E'}
                      opacity={diaSelKey && entry.key !== diaSelKey ? 0.35 : 1} />
                  ))}
                  <LabelList dataKey="total" position="top"
                    style={{ fontSize: diasData.length > 20 ? 8 : 11, fill: '#475569', fontWeight: 600 }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* ── Ranking vendedores (solo si no hay vendedor seleccionado) ── */}
        {!vendedorSel && rankingVendedores.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-bold text-gray-900 mb-4">Ranking de Vendedores</h3>
            <div className="space-y-2">
              {rankingVendedores.map((v, i) => {
                const pct = kpis.total > 0 ? (v.total / kpis.total) * 100 : 0;
                return (
                  <div key={v.nombre} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-4 tabular-nums">{i+1}</span>
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-600 shrink-0">
                      {v.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-gray-800 truncate">{v.nombre}</span>
                        <div className="flex items-center gap-3 shrink-0 ml-3">
                          <span className="text-xs text-emerald-600">{v.clientes} clientes</span>
                          <span className="text-xs text-amber-600">{v.prospectos} prospectos</span>
                          <span className="text-xs font-bold text-slate-700">{v.total}</span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-red rounded-full" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Tabla ── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <h3 className="font-bold text-gray-900 mb-4">Registros de Visitas</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  {['Fecha','Vendedor','Cliente / Prospecto','Tipo','Producto Ofrecido','¿Competidor?','Comentarios'].map((h) => (
                    <th key={h} className="text-left text-[11px] font-semibold text-slate-400 uppercase tracking-wider py-3 px-3">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tablaSlice.map((v, i) => (
                  <tr key={i} className="border-b border-gray-100 last:border-0 hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 text-[13px] text-slate-500 whitespace-nowrap">{v.fechaStr}</td>
                    <td className="py-3 px-3 text-[13px] text-gray-700">{v.vendedor || '—'}</td>
                    <td className="py-3 px-3 text-[13px] text-gray-800 font-medium max-w-[180px] truncate">{v.nombre || '—'}</td>
                    <td className="py-3 px-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        v.tipo?.toLowerCase().includes('cliente')
                          ? 'bg-emerald-50 text-emerald-700'
                          : v.tipo?.toLowerCase().includes('prospecto')
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}>{v.tipo || '—'}</span>
                    </td>
                    <td className="py-3 px-3 text-[13px] text-slate-500 max-w-[160px] truncate">{v.productoOfrecido || '—'}</td>
                    <td className="py-3 px-3">
                      {v.competidor?.toLowerCase().startsWith('s')
                        ? <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">⚠️ {v.nombreCompetencia || 'Sí'}</span>
                        : <span className="text-[11px] text-slate-300">No</span>}
                    </td>
                    <td className="py-3 px-3 text-[13px] text-slate-500 max-w-[220px]">
                      {v.comentarios
                        ? <span title={v.comentarios} className="block truncate">{v.comentarios}</span>
                        : <span className="text-slate-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {totalPaginas > 1 && (
            <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-100">
              <span className="text-xs text-slate-400">
                {(paginaActual-1)*TABLA_POR_PAG+1}–{Math.min(paginaActual*TABLA_POR_PAG, tablaOrdenada.length)} de {tablaOrdenada.length}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setTablaPage((p)=>Math.max(1,p-1))} disabled={paginaActual===1}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 disabled:opacity-30">«</button>
                {Array.from({length: Math.min(5, totalPaginas)}, (_,i)=>{
                  const start = Math.max(1, Math.min(paginaActual-2, totalPaginas-4));
                  return start+i;
                }).map((n)=>(
                  <button key={n} onClick={()=>setTablaPage(n)}
                    className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                      ${n===paginaActual ? 'bg-brand-red text-white' : 'text-slate-500 hover:bg-gray-100'}`}>{n}</button>
                ))}
                <button onClick={() => setTablaPage((p)=>Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas}
                  className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-gray-100 disabled:opacity-30">»</button>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
