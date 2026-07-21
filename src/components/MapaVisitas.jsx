import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Vite/Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const mkIcon = (color) => L.divIcon({
  className: '',
  html: `<div style="width:13px;height:13px;border-radius:50%;background:${color};border:2.5px solid white;box-shadow:0 1px 5px rgba(0,0,0,0.45)"></div>`,
  iconSize: [13, 13],
  iconAnchor: [6, 6],
  popupAnchor: [0, -8],
});

const ICON_CLIENTE   = mkIcon('#10B981');
const ICON_PROSPECTO = mkIcon('#F59E0B');
const ICON_DEFAULT   = mkIcon('#6366F1');

function AutoFit({ puntos }) {
  const map = useMap();
  useEffect(() => {
    if (!puntos.length) return;
    const bounds = L.latLngBounds(puntos.map((p) => [p.lat, p.lng]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [puntos, map]);
  return null;
}

export default function MapaVisitas({ visitas }) {
  const puntos = visitas.filter((v) => v.lat && v.lng);

  const getIcon = (tipo) => {
    const t = (tipo || '').toLowerCase();
    if (t.includes('cliente'))   return ICON_CLIENTE;
    if (t.includes('prospecto')) return ICON_PROSPECTO;
    return ICON_DEFAULT;
  };

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
        {puntos.length > 0 && <AutoFit puntos={puntos} />}
        {puntos.map((v, i) => (
          <Marker key={i} position={[v.lat, v.lng]} icon={getIcon(v.tipo)}>
            <Popup>
              <div style={{ fontSize: 12, lineHeight: 1.6, minWidth: 160 }}>
                <strong style={{ fontSize: 13 }}>{v.nombre || '(Sin nombre)'}</strong><br />
                <span style={{ color: v.tipo?.toLowerCase().includes('cliente') ? '#059669' : '#D97706', fontWeight: 600 }}>
                  {v.tipo || '—'}
                </span>
                {v.vendedor && <><br />👤 {v.vendedor}</>}
                {v.fechaStr && <><br />📅 {v.fechaStr}</>}
                {v.llamadaVisita && <><br />📋 {v.llamadaVisita}</>}
                {v.productoOfrecido && <><br />📦 {v.productoOfrecido}</>}
                {v.competidor && v.competidor.toLowerCase().startsWith('s') && (
                  <><br /><span style={{ color: '#DC2626' }}>⚠️ Competidor: {v.nombreCompetencia || 'Presente'}</span></>
                )}
                {v.comentarios && (
                  <><br /><span style={{ color: '#6B7280', fontStyle: 'italic' }}>{v.comentarios.slice(0, 80)}{v.comentarios.length > 80 ? '…' : ''}</span></>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Leyenda */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm rounded-xl px-3 py-2 shadow-md flex items-center gap-3">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-white shadow" />
          <span className="text-[11px] text-slate-600 font-medium">Cliente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow" />
          <span className="text-[11px] text-slate-600 font-medium">Prospecto</span>
        </div>
        <span className="text-[11px] text-slate-400">{puntos.length} ubicaciones</span>
      </div>
    </div>
  );
}
