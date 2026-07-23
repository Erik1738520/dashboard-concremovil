import { useState, useEffect } from 'react';
import { ExternalLink, RefreshCw } from 'lucide-react';
import Header from '../components/Header';

const SHEET_ID = '1NsARSqn0CLeWSELVH5SSMdmGM69BPG3Srr1LIZ3OhKI';
const PALETA   = ['#C8102E','#3B82F6','#10B981','#F97316','#8B5CF6','#06B6D4','#F59E0B','#EC4899'];

// Convierte links de Google Drive en URLs directas de imagen
function convertirUrlImagen(url) {
  if (!url) return '';
  // /file/d/FILE_ID/view
  const m1 = url.match(/\/file\/d\/([^/?]+)/);
  if (m1) return `https://lh3.googleusercontent.com/d/${m1[1]}`;
  // open?id=FILE_ID  o  ?id=FILE_ID
  const m2 = url.match(/[?&]id=([^&]+)/);
  if (m2) return `https://lh3.googleusercontent.com/d/${m2[1]}`;
  return url;
}

async function cargarAplicaciones() {
  const url = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&headers=1`;
  const resp = await fetch(url);
  if (!resp.ok) throw new Error('No se pudo cargar el listado de aplicaciones');
  const texto  = await resp.text();
  const inicio = texto.indexOf('{');
  const fin    = texto.lastIndexOf('}') + 1;
  const data   = JSON.parse(texto.slice(inicio, fin));
  if (!data?.table?.rows) return [];
  const cols = (data.table.cols || []).map(c => (c.label || c.id || '').trim());
  return data.table.rows
    .map(row => Object.fromEntries(
      (row.c || []).map((celda, i) => [cols[i], celda?.v != null ? String(celda.v) : ''])
    ))
    .filter(a => a['Nombre de aplicacion'] && a['Direccion'] && a['ID app'] !== 'App-00001');
}

function AppCard({ app, index }) {
  const [imgError, setImgError] = useState(false);
  const nombre = app['Nombre de aplicacion'] || '';
  const url    = app['Direccion'] || '#';
  const imagen = convertirUrlImagen(app['Imagen'] || '');
  const color  = PALETA[index % PALETA.length];

  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg hover:border-gray-200 hover:-translate-y-1 transition-all duration-200 overflow-hidden flex flex-col cursor-pointer">

      {/* Imagen / placeholder */}
      <div className="h-44 flex items-center justify-center bg-slate-50 overflow-hidden">
        {imagen && !imgError ? (
          <img
            src={imagen}
            alt={nombre}
            className="w-full h-full object-contain p-6 group-hover:scale-105 transition-transform duration-200"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center shadow-sm"
            style={{ backgroundColor: color }}>
            <span className="text-white text-3xl font-black select-none">
              {nombre.charAt(0).toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Footer de la tarjeta */}
      <div className="px-4 py-3.5 border-t border-gray-100 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 truncate">{nombre}</p>
        <ExternalLink className="w-4 h-4 text-slate-300 group-hover:text-brand-red shrink-0 transition-colors" />
      </div>
    </a>
  );
}

export default function OtrasAplicaciones() {
  const [apps,     setApps]     = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error,    setError]    = useState(null);

  const cargar = async () => {
    setCargando(true);
    setError(null);
    try {
      const data = await cargarAplicaciones();
      setApps(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => { cargar(); }, []);

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Header titulo="Otras Aplicaciones" />

      <div className="flex-1 overflow-y-auto p-3 md:p-6">

        {/* Subheader */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-400">Accede a las herramientas de tu empresa</p>
          <button onClick={cargar} disabled={cargando}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-white border border-gray-200 rounded-lg text-slate-600 hover:bg-gray-50 transition-colors disabled:opacity-50">
            <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
            Actualizar
          </button>
        </div>

        {/* Loading */}
        {cargando && (
          <div className="flex items-center justify-center py-24">
            <div className="text-center space-y-3">
              <img src="/logo-carga.png" alt="Cargando" className="w-14 h-14 animate-spin mx-auto" />
              <p className="text-sm text-slate-400">Cargando aplicaciones…</p>
            </div>
          </div>
        )}

        {/* Error */}
        {error && !cargando && (
          <div className="text-center py-24">
            <p className="text-sm text-red-500 font-medium mb-3">{error}</p>
            <button onClick={cargar}
              className="px-4 py-2 bg-brand-red text-white rounded-xl text-sm font-medium hover:bg-red-700 transition-colors">
              Reintentar
            </button>
          </div>
        )}

        {/* Sin datos */}
        {!cargando && !error && apps.length === 0 && (
          <div className="text-center py-24">
            <p className="text-sm text-slate-400">No hay aplicaciones disponibles</p>
          </div>
        )}

        {/* Grid de apps */}
        {!cargando && !error && apps.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {apps.map((app, i) => (
              <AppCard key={i} app={app} index={i} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
