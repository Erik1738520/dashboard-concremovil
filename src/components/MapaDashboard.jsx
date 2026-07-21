import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const mkDot = (color) => L.divIcon({
  className: '',
  html: `<div style="width:11px;height:11px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.4)"></div>`,
  iconSize: [11, 11], iconAnchor: [5, 5], popupAnchor: [0, -7],
});

const mkPlanta = () => L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;border-radius:6px;
    background:#1D4ED8;border:2.5px solid white;
    box-shadow:0 2px 6px rgba(29,78,216,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;color:white;font-weight:900;line-height:1;
  ">P</div>`,
  iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13],
});

const mkCompetencia = () => L.divIcon({
  className: '',
  html: `<div style="
    width:22px;height:22px;
    background:#DC2626;border:2.5px solid white;
    box-shadow:0 2px 6px rgba(220,38,38,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:11px;color:white;font-weight:900;line-height:1;
    clip-path:polygon(50% 0%,100% 100%,0% 100%);
    padding-top:4px;
  ">C</div>`,
  iconSize: [22, 22], iconAnchor: [11, 11], popupAnchor: [0, -13],
});

const ICON_CLIENTE    = mkDot('#10B981');
const ICON_PROSPECTO  = mkDot('#F59E0B');
const ICON_DEFAULT    = mkDot('#6366F1');
const ICON_PLANTA     = mkPlanta();
const ICON_COMPETENCIA = mkCompetencia();

function AutoFit({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (!puntos.length) return;
    const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [puntos, map]);
  return null;
}

export default function MapaDashboard({
  visitas = [], ubicaciones = [],
  capas = { clientes: true, prospectos: true, plantas: true, competencia: true },
}) {
  const todosVisita = visitas.filter((v) => v.lat && v.lng);
  const puntosUbic  = ubicaciones.filter((u) => u.lat && u.lng);

  const puntosVisita = todosVisita.filter(v => {
    const t = (v.tipo || '').toLowerCase();
    if (t.includes('cliente')  && !capas.clientes)   return false;
    if (t.includes('prospecto') && !capas.prospectos) return false;
    return true;
  });

  const todos = [
    ...puntosVisita.map(v => ({ lat: v.lat, lng: v.lng })),
    ...puntosUbic.map(u => ({ lat: u.lat, lng: u.lng })),
  ];

  const getIconVisita = (tipo) => {
    const t = (tipo || '').toLowerCase();
    if (t.includes('cliente'))   return ICON_CLIENTE;
    if (t.includes('prospecto')) return ICON_PROSPECTO;
    return ICON_DEFAULT;
  };

  const plantas     = capas.plantas     ? puntosUbic.filter(u => u.tipo === 'Planta')      : [];
  const competencia = capas.competencia ? puntosUbic.filter(u => u.tipo === 'Competencia') : [];

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden">
      <MapContainer
        center={[25.6866, -100.3161]}
        zoom={11}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a>'
        />
        {todos.length > 0 && <AutoFit puntos={todos} />}

        {/* Visitas */}
        {puntosVisita.map((v, i) => (
          <Marker key={`v-${i}`} position={[v.lat, v.lng]} icon={getIconVisita(v.tipo)}>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 150 }}>
                <strong>{v.nombre || '(Sin nombre)'}</strong><br />
                <span style={{ color: v.tipo?.toLowerCase().includes('cliente') ? '#059669' : '#D97706', fontWeight: 600 }}>
                  {v.tipo || '—'}
                </span>
                {v.vendedor && <><br />👤 {v.vendedor}</>}
                {v.fechaStr && <><br />📅 {v.fechaStr}</>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Plantas propias */}
        {plantas.map((u, i) => (
          <Marker key={`p-${i}`} position={[u.lat, u.lng]} icon={ICON_PLANTA}>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 150 }}>
                <strong style={{ color: '#1D4ED8' }}>🏭 Planta propia</strong><br />
                <strong>{u.empresa}</strong><br />
                {u.nombre && <span>{u.nombre}</span>}
              </div>
            </Popup>
          </Marker>
        ))}

        {/* Competencia */}
        {competencia.map((u, i) => (
          <Marker key={`c-${i}`} position={[u.lat, u.lng]} icon={ICON_COMPETENCIA}>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 150 }}>
                <strong style={{ color: '#DC2626' }}>⚠️ Competencia</strong><br />
                <strong>{u.empresa}</strong><br />
                {u.nombre && <span>{u.nombre}</span>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md flex flex-wrap items-center gap-x-3 gap-y-1.5 max-w-xs">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          <span className="text-[10px] text-slate-600 font-medium">Cliente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow" />
          <span className="text-[10px] text-slate-600 font-medium">Prospecto</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-[3px] bg-blue-700 border border-white shadow" />
          <span className="text-[10px] text-slate-600 font-medium">Planta</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 bg-red-600 border border-white shadow" style={{ clipPath: 'polygon(50% 0%,100% 100%,0% 100%)' }} />
          <span className="text-[10px] text-slate-600 font-medium">Competencia</span>
        </div>
      </div>
    </div>
  );
}
