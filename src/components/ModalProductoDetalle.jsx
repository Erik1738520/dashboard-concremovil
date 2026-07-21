import { useState, useMemo, useRef } from 'react';
import { X, Download, DollarSign, Package, Users, UserPlus } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  ResponsiveContainer, Cell,
} from 'recharts';
import { getAnio, getMes } from '../utils/formatters';

const MESES_CORTO = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

function fmtShort(v) {
  if (!v) return '$0';
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(0)}k`;
  return `$${Math.round(v)}`;
}

function fmtCant(v) {
  if (!v && v !== 0) return '—';
  return Number(v).toLocaleString('es-MX', { maximumFractionDigits: 3 });
}

export default function ModalProductoDetalle({ producto, ventas, mapaAgentes, onClose }) {
  const [tab, setTab] = useState('tendencia');
  const [paginaCli, setPaginaCli] = useState(1);
  const [exportando, setExportando] = useState(false);
  const [modoExport, setModoExport] = useState(false);
  const CLI_POR_PAG = 20;
  const panelRef = useRef(null);

  const hoy        = new Date();
  const anioActual = hoy.getFullYear();
  const mesCorte   = hoy.getMonth() + 1;
  const diaHoy     = hoy.getDate();
  const anioAnt    = anioActual - 1;

  /* ── Ventas de este producto (todos los años) ── */
  const ventasProd = useMemo(() =>
    ventas.filter((v) => String(v.cve_prod) === String(producto.cve_prod))
  , [ventas, producto.cve_prod]);

  /* ── Años disponibles (últimos 3) ── */
  const anios = useMemo(() => {
    const set = new Set(ventasProd.map((v) => getAnio(v.falta_fac)).filter(Boolean));
    return Array.from(set).sort((a, b) => a - b).slice(-3);
  }, [ventasProd]);

  /* ── Totales YTD por año (hasta mes de corte) ── */
  const porAnio = useMemo(() => {
    const mapa = {};
    anios.forEach((a) => { mapa[a] = { ventas: 0, cantidad: 0, clientes: new Set() }; });
    ventasProd.forEach((v) => {
      const a = getAnio(v.falta_fac);
      const m = getMes(v.falta_fac);
      if (!a || !m || !mapa[a] || m > mesCorte) return;
      mapa[a].ventas   += Number(v.total_fac)  || 0;
      mapa[a].cantidad += Number(v.cant_surt)  || 0;
      if (v.nom_fac) mapa[a].clientes.add(String(v.nom_fac).trim());
    });
    return mapa;
  }, [ventasProd, anios, mesCorte]);

  /* ── KPIs ── */
  const clientesActual  = porAnio[anioActual]?.clientes.size || 0;
  const clientesPrevios = useMemo(() => {
    const set = new Set();
    anios.filter((a) => a < anioActual).forEach((a) =>
      (porAnio[a]?.clientes || new Set()).forEach((c) => set.add(c))
    );
    return set;
  }, [porAnio, anios, anioActual]);

  const clientesNuevos = useMemo(() => {
    let count = 0;
    (porAnio[anioActual]?.clientes || new Set()).forEach((c) => {
      if (!clientesPrevios.has(c)) count++;
    });
    return count;
  }, [porAnio, anioActual, clientesPrevios]);

  /* ── Crecimiento YTD ── */
  const ytdActual   = porAnio[anioActual]?.ventas || 0;
  const ytdAnterior = porAnio[anioAnt]?.ventas || 0;
  const crecYTD     = ytdAnterior > 0 ? ((ytdActual - ytdAnterior) / ytdAnterior) * 100 : null;

  /* ── Mensual actual vs año anterior ── */
  const mensualData = useMemo(() => {
    const actual = {}; const prev = {};
    ventasProd.forEach((v) => {
      const a = getAnio(v.falta_fac); const m = getMes(v.falta_fac);
      if (!a || !m) return;
      if (a === anioActual) actual[m] = (actual[m] || 0) + (Number(v.total_fac) || 0);
      if (a === anioAnt)    prev[m]   = (prev[m]   || 0) + (Number(v.total_fac) || 0);
    });
    return MESES_CORTO.map((mes, i) => {
      const m  = i + 1;
      const ac = actual[m] || 0;
      const pr = prev[m]   || 0;
      const pct = pr > 0 ? ((ac - pr) / pr) * 100 : null;
      return { mes, ac, pr, pct };
    });
  }, [ventasProd, anioActual, anioAnt]);

  /* ── Clientes tab ── */
  const clientesData = useMemo(() => {
    const mapa = {};
    ventasProd.forEach((v) => {
      const a = getAnio(v.falta_fac);
      if (a !== anioActual) return;
      const cli = String(v.nom_fac || '').trim();
      if (!cli) return;
      if (!mapa[cli]) mapa[cli] = { nombre: cli, ventas: 0, cantidad: 0, nuevo: !clientesPrevios.has(cli) };
      mapa[cli].ventas   += Number(v.total_fac) || 0;
      mapa[cli].cantidad += Number(v.cant_surt) || 0;
    });
    const lista = Object.values(mapa).sort((a, b) => b.ventas - a.ventas);
    const tot   = lista.reduce((s, c) => s + c.ventas, 0);
    return lista.map((c) => ({ ...c, pct: tot > 0 ? (c.ventas / tot) * 100 : 0 }));
  }, [ventasProd, anioActual, clientesPrevios]);

  /* ── Agentes tab ── */
  const agentesData = useMemo(() => {
    const mapa = {};
    ventasProd.forEach((v) => {
      const a = getAnio(v.falta_fac);
      if (a !== anioActual) return;
      const key    = String(v.cve_age);
      const nombre = mapaAgentes?.[key]?.['Nombre vendedor'] || `Agente ${v.cve_age}`;
      if (!mapa[key]) mapa[key] = { nombre, ventas: 0, cantidad: 0, clientes: new Set() };
      mapa[key].ventas   += Number(v.total_fac) || 0;
      mapa[key].cantidad += Number(v.cant_surt) || 0;
      if (v.nom_fac) mapa[key].clientes.add(String(v.nom_fac).trim());
    });
    const lista = Object.values(mapa).sort((a, b) => b.ventas - a.ventas);
    const tot   = lista.reduce((s, a) => s + a.ventas, 0);
    return lista.map((a) => ({
      ...a,
      clientes:     a.clientes.size,
      pct:          tot > 0 ? (a.ventas / tot) * 100 : 0,
      precioPorM3:  a.cantidad > 0 ? a.ventas / a.cantidad : 0,
    }));
  }, [ventasProd, anioActual, mapaAgentes]);

  /* ── Clientes nuevos por mes (primera compra de este producto en el año actual) ── */
  const clientesNuevosMensual = useMemo(() => {
    const primeraCompra = {};
    ventasProd.forEach((v) => {
      const a = getAnio(v.falta_fac);
      const m = getMes(v.falta_fac);
      if (a !== anioActual || !m) return;
      const cli = String(v.nom_fac || '').trim();
      if (!cli || clientesPrevios.has(cli)) return;
      if (!primeraCompra[cli] || m < primeraCompra[cli]) primeraCompra[cli] = m;
    });
    const conteo = {};
    Object.values(primeraCompra).forEach((m) => { conteo[m] = (conteo[m] || 0) + 1; });
    return MESES_CORTO.map((mes, i) => ({ mes, nuevos: conteo[i + 1] || 0 }));
  }, [ventasProd, anioActual, clientesPrevios]);

  const maxCli = clientesData[0]?.ventas || 1;
  const maxAge = agentesData[0]?.ventas  || 1;

  /* ── Exportar PDF (todas las pestañas) ── */
  const exportarPDF = async () => {
    if (!panelRef.current || exportando) return;
    setExportando(true);
    const tabOriginal = tab;
    try {
      const [{ default: html2canvas }, { default: jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ]);
      const pdf   = new jsPDF({ orientation: 'p', unit: 'mm', format: 'a4' });
      const imgW  = 210;
      const pageH = 297;
      let primera = true;

      setModoExport(true); // mostrar todos los clientes sin paginación

      for (const t of ['tendencia', 'clientes', 'agentes']) {
        setTab(t);
        await new Promise(r => setTimeout(r, 450)); // esperar re-render + gráficas

        const el     = panelRef.current;
        const canvas = await html2canvas(el, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff',
          scrollY: 0,
          windowWidth: el.scrollWidth,
          windowHeight: el.scrollHeight,
        });

        const imgH = (canvas.height * imgW) / canvas.width;
        let posY = 0;
        while (posY < imgH) {
          if (!primera) pdf.addPage();
          primera = false;
          pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, -posY, imgW, imgH);
          posY += pageH;
        }
      }

      const nombre = (producto.desc_prod || producto.cve_prod || 'producto')
        .replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
      pdf.save(`${nombre}.pdf`);
    } finally {
      setModoExport(false);
      setTab(tabOriginal);
      setExportando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 pt-8 overflow-y-auto"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>

      <div id="modal-producto-panel" ref={panelRef} className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mb-4">

        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="bg-slate-100 text-slate-600 text-xs font-medium px-2.5 py-0.5 rounded-full">
              {producto.unidad || '—'}
            </span>
            {crecYTD !== null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5
                ${crecYTD >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-600'}`}>
                {crecYTD > 0 ? '↑' : '↓'} {crecYTD > 0 ? '+' : ''}{crecYTD.toFixed(1)}%
              </span>
            )}
          </div>
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-bold text-gray-900 leading-tight">
              {producto.desc_prod || producto.cve_prod}
            </h2>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={exportarPDF} disabled={exportando}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-xl text-xs text-slate-500 hover:bg-gray-50 transition-colors disabled:opacity-50">
                <Download className={`w-3.5 h-3.5 ${exportando ? 'animate-bounce' : ''}`} />
                {exportando ? 'Generando…' : 'PDF'}
              </button>
              <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-xl transition-colors">
                <X className="w-5 h-5 text-slate-500" />
              </button>
            </div>
          </div>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 px-6 py-4 border-b border-slate-100">
          {[
            { Icon: DollarSign, label: 'Ventas',          value: fmtShort(producto.ventas),  iconColor: 'text-[#C8102E]', bg: 'bg-red-50'     },
            { Icon: Package,    label: 'Cantidad',         value: fmtCant(producto.cantidad), iconColor: 'text-blue-600',  bg: 'bg-blue-50'    },
            { Icon: Users,      label: 'Clientes',         value: clientesActual,             iconColor: 'text-purple-600',bg: 'bg-purple-50'  },
            { Icon: UserPlus,   label: 'Clientes Nuevos',  value: clientesNuevos,             iconColor: 'text-emerald-600',bg:'bg-emerald-50' },
          ].map(({ Icon, label, value, iconColor, bg }) => (
            <div key={label} className="bg-slate-50 rounded-xl p-3">
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center mb-2`}>
                <Icon className={`w-3.5 h-3.5 ${iconColor}`} />
              </div>
              <p className="text-[10px] uppercase tracking-wide text-slate-400">{label}</p>
              <p className="text-base font-bold text-slate-800">{value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="px-6 pt-3 flex gap-1 border-b border-slate-100">
          {[['tendencia','Tendencia'],['clientes','Clientes'],['agentes','Agentes']].map(([id, lbl]) => (
            <button key={id} onClick={() => { setTab(id); setPaginaCli(1); }}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-all
                ${tab === id ? 'text-[#C8102E] border-b-2 border-[#C8102E]' : 'text-slate-400 hover:text-slate-600'}`}>
              {lbl}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 py-5 space-y-4">

          {/* ── TENDENCIA ── */}
          {tab === 'tendencia' && (
            <div className="space-y-4">

              {/* Comparativa anual */}
              <div className="bg-slate-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    Comparativa Anual — Últimos 3 años
                  </p>
                  <span className="text-[10px] bg-slate-200 text-slate-500 px-2 py-0.5 rounded-full font-medium">
                    al {diaHoy} {MESES_CORTO[mesCorte - 1]}
                  </span>
                </div>
                <div className="flex gap-4 items-end">
                  {/* Tarjetas por año */}
                  <div className="flex flex-col gap-2 shrink-0 w-44">
                    {anios.map((a, idx) => {
                      const d      = porAnio[a];
                      const prev   = idx > 0 ? porAnio[anios[idx - 1]] : null;
                      const crec   = prev?.ventas > 0 ? ((d.ventas - prev.ventas) / prev.ventas) * 100 : null;
                      const isLast = a === anios[anios.length - 1];
                      return (
                        <div key={a} className={`rounded-xl px-4 py-3 flex items-center justify-between ${
                          isLast ? 'bg-[#0f172a] shadow-lg shadow-slate-300' : 'bg-white border border-slate-200'
                        }`}>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{a}</p>
                            <p className={`font-bold text-base leading-tight ${isLast ? 'text-white' : 'text-slate-700'}`}>
                              {fmtShort(d?.ventas || 0)}
                            </p>
                            <p className={`text-[10px] mt-0.5 ${isLast ? 'text-slate-400' : 'text-slate-400'}`}>
                              {fmtCant(d?.cantidad || 0)} {producto.unidad || ''}
                            </p>
                          </div>
                          {crec !== null && (
                            <span className={`text-[10px] font-bold px-2 py-1 rounded-lg shrink-0 ml-2 ${
                              crec >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-600'
                            }`}>
                              {crec > 0 ? '+' : ''}{crec.toFixed(1)}%
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Gráfica de barras anuales */}
                  <div className="flex-1">
                    <ResponsiveContainer width="100%" height={168}>
                      <BarChart
                        data={anios.map((a) => ({ year: String(a), v: porAnio[a]?.ventas || 0 }))}
                        barSize={42} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                        <XAxis dataKey="year" tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip formatter={(v) => [fmtShort(v), 'Ventas']}
                          contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }} />
                        <Bar dataKey="v" radius={[8, 8, 0, 0]}>
                          {anios.map((a) => (
                            <Cell key={a} fill={a === anioActual ? '#0f172a' : '#cbd5e1'} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Comportamiento mensual */}
              <div className="bg-white border border-slate-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Comportamiento Mensual</p>
                    <p className="text-slate-700 font-semibold text-sm mt-0.5">{anioActual}</p>
                  </div>
                  {crecYTD !== null && (
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">vs {anioAnt}</p>
                      <p className={`text-sm font-bold ${crecYTD >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {crecYTD > 0 ? '+' : ''}{crecYTD.toFixed(1)}%
                      </p>
                    </div>
                  )}
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={mensualData} barSize={20} margin={{ top: 20, right: 4, left: 4, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip
                      formatter={(v, n, p) => [fmtShort(p.payload.ac), 'Ventas']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }}
                    />
                    <Bar dataKey="ac" fill="#C8102E" radius={[5, 5, 0, 0]}
                      label={({ x, y, width, index }) => {
                        const d = mensualData[index];
                        if (!d.ac || d.pct === null) return null;
                        return (
                          <text x={x + width / 2} y={y - 5} textAnchor="middle"
                            fontSize={9} fontWeight="700"
                            fill={d.pct >= 0 ? '#16a34a' : '#ef4444'}>
                            {d.pct > 0 ? '+' : ''}{d.pct.toFixed(1)}%
                          </text>
                        );
                      }}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Clientes nuevos por mes */}
              <div className="bg-emerald-50 rounded-2xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-[10px] font-bold text-emerald-700 uppercase tracking-widest">Clientes Nuevos por Mes</p>
                    <p className="text-sm font-semibold text-slate-700 mt-0.5">{clientesNuevos} nuevos en el período</p>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center shrink-0">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                  </div>
                </div>
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={clientesNuevosMensual} barSize={16} margin={{ top: 5, right: 4, left: 4, bottom: 0 }}>
                    <XAxis dataKey="mes" tick={{ fontSize: 10, fill: '#6ee7b7' }} axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip formatter={(v) => [v, 'Clientes nuevos']}
                      contentStyle={{ borderRadius: 12, border: '1px solid #E7EBF0', fontSize: 12 }} />
                    <Bar dataKey="nuevos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── CLIENTES ── */}
          {tab === 'clientes' && (() => {
            const totalPagsCli = Math.max(1, Math.ceil(clientesData.length / CLI_POR_PAG));
            const pagCli       = Math.min(paginaCli, totalPagsCli);
            const sliceCli     = clientesData.slice((pagCli - 1) * CLI_POR_PAG, pagCli * CLI_POR_PAG);
            const offsetIdx    = (pagCli - 1) * CLI_POR_PAG;
            return (
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                  Top Clientes — {clientesData.length} clientes en el período
                </p>
                <div className="space-y-3.5">
                  {sliceCli.map((c, i) => (
                    <div key={c.nombre}>
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs text-slate-300 shrink-0 w-6">{offsetIdx + i + 1}</span>
                          <span className="text-[13px] font-semibold text-gray-900 break-words uppercase leading-tight">
                            {c.nombre}
                          </span>
                          {c.nuevo && (
                            <span className="text-[10px] font-bold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shrink-0">
                              NUEVO
                            </span>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[13px] font-bold text-gray-900">{fmtShort(c.ventas)}</p>
                          <p className="text-[11px] text-slate-400">{fmtCant(c.cantidad)} {producto.unidad || ''} · {c.pct.toFixed(1)}%</p>
                        </div>
                      </div>
                      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-red rounded-full"
                          style={{ width: `${Math.min((c.ventas / maxCli) * 100, 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {clientesData.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">Sin clientes en el período</p>
                  )}
                </div>
                {totalPagsCli > 1 && (
                  <div className="flex items-center justify-between mt-5 pt-4 border-t border-slate-100">
                    <span className="text-xs text-slate-400">
                      {offsetIdx + 1}–{Math.min(pagCli * CLI_POR_PAG, clientesData.length)} de {clientesData.length} clientes
                    </span>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPaginaCli((p) => Math.max(1, p - 1))} disabled={pagCli === 1}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors text-sm">
                        «
                      </button>
                      {Array.from({ length: totalPagsCli }, (_, i) => i + 1)
                        .filter((n) => n === 1 || n === totalPagsCli || Math.abs(n - pagCli) <= 1)
                        .map((n, idx, arr) => (
                          <>
                            {idx > 0 && arr[idx - 1] !== n - 1 && (
                              <span key={`dots-${n}`} className="text-slate-300 text-xs px-1">…</span>
                            )}
                            <button key={n} onClick={() => setPaginaCli(n)}
                              className={`w-7 h-7 flex items-center justify-center rounded-lg text-sm font-medium transition-colors
                                ${n === pagCli ? 'bg-[#C8102E] text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                              {n}
                            </button>
                          </>
                        ))
                      }
                      <button onClick={() => setPaginaCli((p) => Math.min(totalPagsCli, p + 1))} disabled={pagCli === totalPagsCli}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 disabled:opacity-30 transition-colors text-sm">
                        »
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ── AGENTES ── */}
          {tab === 'agentes' && (
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-4">
                Vendedores — {agentesData.length} vendedores venden este producto
              </p>
              <div className="space-y-3.5">
                {agentesData.map((a, i) => (
                  <div key={a.nombre}>
                    <div className="flex items-start justify-between gap-3 mb-1.5">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-xs text-slate-300 shrink-0 w-4 mt-0.5">{i + 1}</span>
                        <div className="min-w-0">
                          <p className="text-[13px] font-semibold text-gray-900 uppercase break-words leading-tight">
                            {a.nombre}
                          </p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            {a.clientes} clientes · {a.pct.toFixed(1)}%
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-[13px] font-bold text-gray-900">{fmtShort(a.ventas)}</p>
                        <p className="text-[11px] text-slate-400">{fmtCant(a.cantidad)} {producto.unidad || ''}</p>
                        <p className="text-[11px] font-semibold text-blue-500 mt-0.5">
                          ${Math.round(a.precioPorM3).toLocaleString('es-MX')}/{producto.unidad || 'm³'} prom.
                        </p>
                      </div>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-red rounded-full"
                        style={{ width: `${Math.min((a.ventas / maxAge) * 100, 100)}%` }} />
                    </div>
                  </div>
                ))}
                {agentesData.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-8">Sin agentes en el período</p>
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
