/**
 * GraficaVentasAgente — Barras horizontales por agente con drill-down de clientes y productos.
 */
import { useState } from 'react';
import { ChevronDown, ChevronUp, Users, Package } from 'lucide-react';
import { formatoMoneda, formatoNumero, truncar } from '../utils/formatters';

function BarHorizontal({ valor, max, color = '#C8102E' }) {
  const pct = max > 0 ? (valor / max) * 100 : 0;
  return (
    <div className="w-full bg-gray-100 rounded-full h-2 mt-1">
      <div className="h-2 rounded-full transition-all duration-500"
        style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: color }} />
    </div>
  );
}

export default function GraficaVentasAgente({ agentes, modo = 'dinero' }) {
  const [expandido, setExpandido] = useState(null);
  const [tab, setTab] = useState('clientes');

  if (!agentes || agentes.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center justify-center min-h-[200px]">
        <p className="text-slate-400 text-sm">Sin datos de agentes</p>
      </div>
    );
  }

  const max = agentes[0]?.ventas || 1;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="font-bold text-gray-900">Ventas por Agente</h3>
        <p className="text-xs text-slate-400 mt-0.5">Toca un agente para ver el desglose</p>
      </div>

      <div className="space-y-2">
        {agentes.map((ag, i) => {
          const abierto = expandido === ag.cve_age;
          return (
            <div key={ag.cve_age}
              className="border border-gray-100 rounded-xl overflow-hidden transition-all">
              {/* Fila principal */}
              <button onClick={() => setExpandido(abierto ? null : ag.cve_age)}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left">
                {/* Rango */}
                <span className="w-5 text-xs font-bold text-slate-400 shrink-0">#{i + 1}</span>
                {/* Avatar */}
                <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold shrink-0"
                  style={{ backgroundColor: ['#C8102E','#3B82F6','#10B981','#F97316','#8B5CF6','#06B6D4'][i % 6] }}>
                  {String(ag.nombre).charAt(0).toUpperCase()}
                </div>
                {/* Nombre y barra */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-sm font-semibold text-gray-800 truncate">{ag.nombre}</span>
                    <span className="text-sm font-bold text-gray-900 shrink-0">{formatoMoneda(ag.ventas)}</span>
                  </div>
                  <BarHorizontal valor={ag.ventas} max={max}
                    color={['#C8102E','#3B82F6','#10B981','#F97316','#8B5CF6','#06B6D4'][i % 6]} />
                  <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                    <span>{ag.pctTotal?.toFixed(1)}% del total</span>
                    <span>·</span>
                    <span>{ag.facturas} facturas</span>
                    <span>·</span>
                    <span>{ag.clientes?.length || 0} clientes</span>
                  </div>
                </div>
                {abierto ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
                         : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
              </button>

              {/* Drill-down */}
              {abierto && (
                <div className="border-t border-gray-100 bg-gray-50 px-4 py-3">
                  <div className="flex gap-1 mb-3">
                    {[['clientes', <Users className="w-3 h-3" />, 'Clientes'],
                      ['productos', <Package className="w-3 h-3" />, 'Productos']].map(([t, ic, lbl]) => (
                      <button key={t} onClick={() => setTab(t)}
                        className={`flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-medium transition-colors
                          ${tab === t ? 'bg-brand-red text-white' : 'bg-white text-slate-500 border border-gray-200'}`}>
                        {ic}{lbl}
                      </button>
                    ))}
                  </div>
                  {tab === 'clientes' && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(ag.clientes || []).slice(0, 20).map((c, j) => (
                        <div key={j} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                          <span className="text-xs text-gray-700 truncate flex-1">{c.nombre}</span>
                          <span className="text-xs font-semibold text-gray-900 ml-2 shrink-0">{formatoMoneda(c.ventas)}</span>
                        </div>
                      ))}
                      {(ag.clientes?.length || 0) === 0 && <p className="text-xs text-slate-400 text-center py-2">Sin clientes</p>}
                    </div>
                  )}
                  {tab === 'productos' && (
                    <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                      {(ag.productos || []).slice(0, 20).map((p, j) => (
                        <div key={j} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700 truncate">{truncar(p.desc_prod, 35)}</p>
                            <p className="text-xs text-slate-400">{formatoNumero(p.cantidad)} unid.</p>
                          </div>
                          <span className="text-xs font-semibold text-gray-900 ml-2 shrink-0">{formatoMoneda(p.ventas)}</span>
                        </div>
                      ))}
                      {(ag.productos?.length || 0) === 0 && <p className="text-xs text-slate-400 text-center py-2">Sin productos</p>}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
