import { useMemo, useState } from 'react';
import {
  RefreshCw, DollarSign, TrendingUp, Package,
  Receipt, Users, BarChart2, UserPlus, Loader,
  TrendingDown, Minus, Layers, SlidersHorizontal, X,
} from 'lucide-react';

import Header from '../components/Header';
import KPICard from '../components/KPICard';
import GraficaBarras from '../components/GraficaBarras';
import GraficaCrecimiento from '../components/GraficaCrecimiento';
import GraficaVentasAgente from '../components/GraficaVentasAgente';
import GraficaVentasCliente from '../components/GraficaVentasCliente';
import GraficaVentasProducto from '../components/GraficaVentasProducto';
import GraficaClientesNuevos from '../components/GraficaClientesNuevos';
import GraficaComparativaAnual from '../components/GraficaComparativaAnual';
import SeccionVisitasDashboard from '../components/SeccionVisitasDashboard';

import { useDatos } from '../context/DataContext';
import {
  filtrarVentasPorPeriodo, filtrarPorRangoFechas,
  totalVentas, totalUnidades, numeroFacturas, numeroClientes,
  ticketPromedio, ventaPromedioPorCliente,
  ventasMensualesPorAnio, unidadesMensualesPorAnio,
  topProductos, clientesNuevosPorMes, aniosDisponibles,
  promedioCrecimientoMensual, promedioClientesPorMes,
  desglosePorUnidad, ventasPorAgente, ventasPorCliente,
  productoMasVendido,
} from '../utils/metricas';

import {
  formatoMoneda, formatoNumero, formatoPorcentaje, variacionPct,
} from '../utils/formatters';

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function LoadingScreen() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3">
        <img src="/logo-carga.png" alt="Cargando" className="w-14 h-14 animate-spin mx-auto" />
        <p className="text-sm text-slate-400">Cargando datos…</p>
      </div>
    </div>
  );
}

function Badge({ variacion }) {
  if (variacion === null || variacion === undefined) return null;
  const abs = Math.abs(variacion);
  if (abs < 0.5) {
    return (
      <span className="flex items-center gap-1 text-xs font-medium bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full">
        <Minus className="w-3 h-3" /> Estable
      </span>
    );
  }
  const pos = variacion > 0;
  return (
    <span className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full
      ${pos ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-600'}`}>
      {pos ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
      {pos ? '+' : ''}{variacion.toFixed(1)}%
    </span>
  );
}

function ErrorScreen({ mensaje, onRetry }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center space-y-3 max-w-sm">
        <p className="text-sm text-red-500 font-medium">{mensaje}</p>
        <button onClick={onRetry}
          className="px-4 py-2 bg-brand-red text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
          Reintentar
        </button>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { ventas, mapaAgentes, cargando, error, horaActualizacion, cargarDatos } = useDatos();

  const [anioSel, setAnioSel]         = useState(() => String(new Date().getFullYear()));
  const [mesSel, setMesSel]           = useState(() => String(new Date().getMonth() + 1));
  const [vendedorSel, setVendedorSel] = useState('');
  const [grupoSel, setGrupoSel]       = useState('');

  /* ── Fecha de corte (YTD) ─────────────────────────────── */
  const hoy    = new Date();
  const mesHoy = hoy.getMonth() + 1;  // 1-12
  const diaHoy = hoy.getDate();

  /* ── Años disponibles ─────────────────────────────────── */
  const anios = useMemo(() => aniosDisponibles(ventas), [ventas]);
  const anioActual = anios[0] ?? new Date().getFullYear();
  const anioPrevio = anios[1] ?? anioActual - 1;

  /* ── Lista de grupos disponibles ─────────────────────── */
  const grupos = useMemo(() =>
    [...new Set(
      Object.values(mapaAgentes)
        .map(a => (a['Grupo agentes'] || '').trim())
        .filter(Boolean)
    )].sort(),
  [mapaAgentes]);

  /* ── Lista de vendedores (filtrada por grupo si aplica) ── */
  const vendedores = useMemo(() =>
    Object.values(mapaAgentes)
      .filter(a => {
        if (!a['Nombre vendedor'] || a['Estatus'] === 'INACTIVO') return false;
        if (grupoSel && (a['Grupo agentes'] || '').trim() !== grupoSel) return false;
        return true;
      })
      .sort((a, b) => (a['Nombre vendedor'] || '').localeCompare(b['Nombre vendedor'] || '')),
  [mapaAgentes, grupoSel]);

  /* ── Base filtrada sólo por grupo + vendedor (sin fecha) ── */
  const ventasBase = useMemo(() => {
    let base = ventas;
    if (grupoSel) {
      const cves = new Set(
        Object.values(mapaAgentes)
          .filter(a => (a['Grupo agentes'] || '').trim() === grupoSel)
          .map(a => String(a.cve_age))
      );
      base = base.filter(v => cves.has(String(v.cve_age)));
    }
    if (vendedorSel) base = base.filter(v => String(v.cve_age) === vendedorSel);
    return base;
  }, [ventas, grupoSel, vendedorSel, mapaAgentes]);

  /* ── Ventas filtradas por período + grupo + vendedor ──── */
  const ventasFiltradas = useMemo(() => {
    if (!anioSel) return ventasBase;
    return filtrarVentasPorPeriodo(ventasBase, Number(anioSel), mesSel ? Number(mesSel) : null);
  }, [ventasBase, anioSel, mesSel]);

  /* ── Ventas actuales para KPI #1: YTD del año actual cuando no hay filtro ── */
  const ventasActualKPI = useMemo(() => {
    if (!anioSel) {
      const desde = new Date(anioActual, 0, 1);
      const hasta  = new Date();
      return filtrarPorRangoFechas(ventasBase, desde, hasta);
    }
    return ventasFiltradas;
  }, [ventasBase, anioSel, ventasFiltradas, anioActual]);

  /* ── Ventas período anterior (para variación) ────────── */
  const ventasAnterior = useMemo(() => {
    if (!anioSel) {
      const desde = new Date(anioPrevio, 0, 1);
      const hasta  = new Date(anioPrevio, mesHoy - 1, diaHoy, 23, 59, 59);
      return filtrarPorRangoFechas(ventasBase, desde, hasta);
    }
    if (mesSel) {
      return filtrarVentasPorPeriodo(ventasBase, Number(anioSel) - 1, Number(mesSel));
    }
    return filtrarVentasPorPeriodo(ventasBase, Number(anioSel) - 1);
  }, [ventasBase, anioSel, mesSel, anioPrevio, mesHoy, diaHoy]);

  /* ── Series temporales (respetan grupo + vendedor) ────────── */
  const ventasMens    = useMemo(() => ventasMensualesPorAnio(ventasBase), [ventasBase]);
  const unidadesMens  = useMemo(() => unidadesMensualesPorAnio(ventasBase), [ventasBase]);
  const cliNuevosData = useMemo(() => clientesNuevosPorMes(ventasBase), [ventasBase]);

  /* ── KPI: métricas del período ───────────────────────── */
  const totalActual    = totalVentas(ventasFiltradas);
  const totalPrev      = totalVentas(ventasAnterior);
  const varVentas      = variacionPct(totalActual, totalPrev);

  // KPI card 1: usa YTD del año actual vs YTD del año anterior
  const totalActualKPI = !anioSel ? totalVentas(ventasActualKPI) : totalActual;
  const varVentasKPI   = variacionPct(totalActualKPI, totalPrev);

  /* ── KPI: crecimiento vs período anterior ────────────── */
  const ventasMesPrev = useMemo(() => {
    if (!mesSel || !anioSel) return [];
    const m = Number(mesSel) - 1;
    const a = m === 0 ? Number(anioSel) - 1 : Number(anioSel);
    return filtrarVentasPorPeriodo(ventasBase, a, m === 0 ? 12 : m);
  }, [ventasBase, anioSel, mesSel]);

  const totalMesPrev = totalVentas(ventasMesPrev);

  const etiquetaCrecimComp = useMemo(() => {
    if (mesSel) {
      // mes anterior: si es enero → dic del año anterior
      const m = Number(mesSel) - 1;
      const a = m === 0 ? Number(anioSel) - 1 : Number(anioSel);
      return `${MESES_CORTO[(m === 0 ? 12 : m) - 1]} ${a}`;
    }
    if (anioSel) return String(Number(anioSel) - 1);
    return `${anioPrevio} (Ene – ${diaHoy} ${MESES_CORTO[mesHoy - 1]})`;
  }, [mesSel, anioSel, anioPrevio, diaHoy, mesHoy]);

  const varCrecimKPI = useMemo(() => {
    if (mesSel) return variacionPct(totalActual, totalMesPrev);
    if (anioSel) return varVentas;
    return varVentasKPI;
  }, [mesSel, anioSel, totalActual, totalMesPrev, varVentas, varVentasKPI]);

  // promCrecim se mantiene para gráficas que lo usen
  const ventasMensFilt  = useMemo(() => ventasMensualesPorAnio(ventasFiltradas), [ventasFiltradas]);
  const anioParaCrecim  = anioSel ? Number(anioSel) : anioActual;
  const promCrecim = useMemo(
    () => promedioCrecimientoMensual(mesSel ? ventasMens : ventasMensFilt, anioParaCrecim),
    [ventasMens, ventasMensFilt, anioParaCrecim, mesSel]
  );

  const unidadesActual = totalUnidades(ventasFiltradas);
  const unidadesPrev   = totalUnidades(ventasAnterior);
  const varUnidades    = variacionPct(unidadesActual, unidadesPrev);

  const desglose        = useMemo(() => desglosePorUnidad(ventasFiltradas), [ventasFiltradas]);
  const desglosePrev    = useMemo(() => desglosePorUnidad(ventasAnterior),  [ventasAnterior]);
  const desgloseVolPrev = useMemo(
    () => mesSel ? desglosePorUnidad(ventasMesPrev) : desglosePrev,
    [mesSel, ventasMesPrev, desglosePrev]
  );
  const varVolumen = useMemo(() => {
    const prev = mesSel ? totalUnidades(ventasMesPrev) : unidadesPrev;
    return variacionPct(unidadesActual, prev);
  }, [mesSel, ventasMesPrev, unidadesPrev, unidadesActual]);

  const ticket    = ticketPromedio(ventasFiltradas);
  const ventaProm = ventaPromedioPorCliente(ventasFiltradas);
  const promCli   = promedioClientesPorMes(ventasFiltradas);

  const totalCliNuevos = useMemo(() => {
    const base = cliNuevosData[anioSel ? Number(anioSel) : anioActual] || {};
    if (mesSel) return base[Number(mesSel)] || 0;
    return Object.values(base).reduce((s, v) => s + v, 0);
  }, [cliNuevosData, anioSel, mesSel, anioActual]);

  /* ── Producto más vendido ────────────────────────────── */
  const prodMasVendido = useMemo(() => productoMasVendido(ventasFiltradas), [ventasFiltradas]);

  /* ── Gráficas detalladas (período filtrado) ──────────── */
  const agenteData  = useMemo(() => ventasPorAgente(ventasFiltradas, mapaAgentes), [ventasFiltradas, mapaAgentes]);
  const clienteData = useMemo(() => ventasPorCliente(ventasFiltradas, mapaAgentes), [ventasFiltradas, mapaAgentes]);
  const prodData    = useMemo(() => topProductos(ventasFiltradas, 500), [ventasFiltradas]);

  /* ── Etiquetas de período ────────────────────────────── */
  // Label del período actual: "TODO 2026" | "ENE 2025" | "HISTÓRICO"
  const etiqueta = !anioSel
    ? 'HISTÓRICO'
    : mesSel
      ? `${MESES_CORTO[Number(mesSel) - 1].toUpperCase()} ${anioSel}`
      : `TODO ${anioSel}`;

  // Etiqueta específica para KPI de Ventas (YTD cuando no hay filtro)
  const etiquetaVentas = !anioSel
    ? `${anioActual} YTD`
    : mesSel
      ? `${MESES_CORTO[Number(mesSel) - 1].toUpperCase()} ${anioSel}`
      : `TODO ${anioSel}`;

  // Label del período anterior solo para mostrar en subtítulo
  const periodoAnt = !anioSel
    ? `${anioPrevio} al ${diaHoy} ${MESES_CORTO[mesHoy - 1]}`
    : mesSel
      ? `${MESES_CORTO[Number(mesSel) - 1]} ${Number(anioSel) - 1}`
      : String(Number(anioSel) - 1);

  const subtituloVolumen = useMemo(() => {
    if (desglose.length === 0) return 'Sin datos en el período';
    const topUnidad = desglose[0].unidad;
    const prevCant  = desgloseVolPrev.find(d => d.unidad === topUnidad)?.cantidad ?? 0;
    const partes    = [`vs ${formatoNumero(prevCant)} ${topUnidad} (${etiquetaCrecimComp})`];
    if (desglose.length > 1)
      partes.push(...desglose.slice(1).map(d => `${formatoNumero(d.cantidad)} ${d.unidad}`));
    return partes.join(' · ');
  }, [desglose, desgloseVolPrev, etiquetaCrecimComp]);

  /* ── Render ──────────────────────────────────────────── */
  if (cargando && ventas.length === 0) return <LoadingScreen />;
  if (error && ventas.length === 0) return <ErrorScreen mensaje={error} onRetry={() => cargarDatos(true)} />;

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header titulo="Dashboard" />

      <div className="flex-1 overflow-y-auto p-3 md:p-6 space-y-4 md:space-y-6">

        {/* ── Barra de filtros ── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm px-4 py-3">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Label */}
            <div className="flex items-center gap-2 text-slate-500 pr-3 border-r border-gray-200">
              <SlidersHorizontal className="w-4 h-4" />
              <span className="text-sm font-medium">Filtros</span>
            </div>

            {/* Año */}
            <select
              value={anioSel}
              onChange={(e) => { setAnioSel(e.target.value); setMesSel(''); }}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">Todos los años</option>
              {anios.map((a) => <option key={a} value={String(a)}>{a}</option>)}
            </select>

            {/* Mes */}
            <select
              value={mesSel}
              onChange={(e) => setMesSel(e.target.value)}
              disabled={!anioSel}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">Todos los meses</option>
              {MESES_CORTO.map((nombre, i) => (
                <option key={i} value={String(i + 1)}>{nombre}</option>
              ))}
            </select>

            {/* Grupo */}
            <select
              value={grupoSel}
              onChange={(e) => { setGrupoSel(e.target.value); setVendedorSel(''); }}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">Todos los grupos</option>
              {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            {/* Vendedor */}
            <select
              value={vendedorSel}
              onChange={(e) => setVendedorSel(e.target.value)}
              className="appearance-none bg-white border border-gray-200 rounded-lg px-3 py-1.5 pr-8 text-sm text-slate-700 font-medium cursor-pointer hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-red/20 focus:border-brand-red transition-colors"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
            >
              <option value="">Todos los vendedores</option>
              {vendedores.map((a) => {
                const nombre = a['Nombre vendedor'];
                const label  = (!nombre || nombre.trim() === '#N/D') ? String(a.cve_age) : nombre;
                return <option key={a.cve_age} value={String(a.cve_age)}>{label}</option>;
              })}
            </select>

            {/* Limpiar */}
            {(anioSel || mesSel || vendedorSel || grupoSel) && (
              <button
                onClick={() => { setAnioSel(''); setMesSel(''); setVendedorSel(''); setGrupoSel(''); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Limpiar
              </button>
            )}

            {/* Actualizar */}
            <div className="ml-auto flex items-center gap-2">
              {horaActualizacion && (
                <span className="text-xs text-slate-400 hidden sm:block">
                  Act. {horaActualizacion.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
              <button onClick={() => cargarDatos(true)} disabled={cargando}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4">

          {/* 1. Ventas */}
          <KPICard
            titulo={`VENTAS — ${etiquetaVentas}`}
            valor={formatoMoneda(totalActualKPI)}
            subtitulo={`vs ${formatoMoneda(totalPrev)} (${periodoAnt})`}
            variacion={varVentasKPI}
            icono={<DollarSign className="w-5 h-5" />}
            colorIcono="red"
          />

          {/* 2. Crecimiento vs período anterior */}
          <KPICard
            titulo={`CRECIMIENTO — ${etiquetaVentas}`}
            valor={varCrecimKPI !== null ? formatoPorcentaje(varCrecimKPI) : '—'}
            subtitulo={`vs ${etiquetaCrecimComp}`}
            variacion={varCrecimKPI}
            icono={<TrendingUp className="w-5 h-5" />}
            colorIcono="green"
          />

          {/* 3. Ticket promedio */}
          <KPICard
            titulo={`TICKET PROMEDIO — ${etiqueta}`}
            valor={formatoMoneda(ticket)}
            subtitulo={`${formatoNumero(numeroFacturas(ventasFiltradas))} facturas en el período`}
            icono={<Receipt className="w-5 h-5" />}
            colorIcono="amber"
          />

          {/* 4. Venta prom. por cliente */}
          <KPICard
            titulo={`VENTA / CLIENTE — ${etiqueta}`}
            valor={formatoMoneda(ventaProm)}
            subtitulo={`${formatoNumero(numeroClientes(ventasFiltradas))} clientes únicos`}
            icono={<Users className="w-5 h-5" />}
            colorIcono="purple"
          />

          {/* 5. Promedio clientes por mes */}
          <KPICard
            titulo={`PROM. CLIENTES / MES — ${etiqueta}`}
            valor={formatoNumero(promCli, 1)}
            subtitulo="Clientes únicos en promedio mensual"
            icono={<BarChart2 className="w-5 h-5" />}
            colorIcono="emerald"
          />

          {/* 6. Clientes nuevos */}
          <KPICard
            titulo={`CLIENTES NUEVOS — ${etiqueta}`}
            valor={formatoNumero(totalCliNuevos)}
            subtitulo="Primera compra en el período"
            icono={<UserPlus className="w-5 h-5" />}
            colorIcono="green"
          />

          {/* 7. Producto más vendido */}
          <KPICard
            titulo={`PROD. MÁS VENDIDO — ${etiqueta}`}
            valor={prodMasVendido?.cve_prod ?? '—'}
            subtitulo={prodMasVendido
              ? `${prodMasVendido.desc_prod} · ${formatoNumero(prodMasVendido.cantidad)} m3`
              : 'Sin datos en el período'}
            icono={<Package className="w-5 h-5" />}
            colorIcono="blue"
            secundario={prodMasVendido
              ? <p className="text-xs text-slate-500"><span className="font-semibold text-gray-800">{formatoMoneda(prodMasVendido.precioPorUnidad)}</span> promedio / m3</p>
              : null}
          />

          {/* 8. Volumen vendido por unidad */}
          <KPICard
            titulo={`VOL. VENDIDO — ${etiqueta}`}
            valor={desglose.length > 0
              ? `${formatoNumero(desglose[0].cantidad)} ${desglose[0].unidad}`
              : '—'}
            subtitulo={subtituloVolumen}
            variacion={varVolumen}
            icono={<Layers className="w-5 h-5" />}
            colorIcono="emerald"
            secundario={mesSel && desglose.length > 0
              ? <p className="text-xs text-slate-500">
                  vs{' '}
                  <span className="font-semibold text-gray-800">
                    {formatoNumero(desglosePrev.find(d => d.unidad === desglose[0].unidad)?.cantidad ?? 0)} {desglose[0].unidad}
                  </span>
                  {' '}({periodoAnt})
                  {varUnidades !== null && (
                    <span className={`ml-1.5 font-medium ${varUnidades >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {varUnidades > 0 ? '+' : ''}{varUnidades.toFixed(1)}%
                    </span>
                  )}
                </p>
              : null}
          />
        </div>

        {/* ── Gráficas fila 1: Ventas mensuales + Crecimiento ── */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3">
            <GraficaBarras ventasMensuales={ventasMens} unidadesMensuales={unidadesMens} />
          </div>
          <div className="lg:col-span-2 flex flex-col">
          <GraficaCrecimiento
            ventasMensuales={ventasMens}
            unidadesMensuales={unidadesMens}
            anioBase={anioPrevio}
            anioComparacion={anioSel ? Number(anioSel) : anioActual}
          />
          </div>
        </div>

        {/* ── Gráfica: Comparativa Año vs Año ── */}
        <GraficaComparativaAnual
          ventasMensuales={ventasMens}
          unidadesMensuales={unidadesMens}
        />

        {/* ── Gráficas fila 2: Clientes + Clientes nuevos ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
          <GraficaVentasCliente clientes={clienteData} />
          <GraficaClientesNuevos
            clientesNuevosPorMes={cliNuevosData}
            ventas={ventasBase}
            mapaAgentes={mapaAgentes}
          />
        </div>

        {/* ── Sección campo: mapa + donuts ── */}
        <SeccionVisitasDashboard
          anioSel={anioSel}
          mesSel={mesSel}
          vendedorSel={vendedorSel}
          grupoSel={grupoSel}
          mapaAgentes={mapaAgentes}
        />

        {/* ── Gráfica fila 3: Productos ── */}
        <GraficaVentasProducto productos={prodData} ventas={ventas} mapaAgentes={mapaAgentes} />
      </div>
    </div>
  );
}
