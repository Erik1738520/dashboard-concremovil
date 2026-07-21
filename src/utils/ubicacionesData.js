const SHEET_ID  = '12nrKwJNbB_hRx0ngQki03_kXZ-JGVKMzshbmOH8o6zk';
const UBIC_URL  = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&sheet=Ubicaciones&tq=select%20*`;

let _cache     = null;
let _cacheTime = 0;
const TTL = 15 * 60 * 1000;

function parseCoord(str) {
  if (!str) return { lat: null, lng: null };
  const partes = String(str).split(',').map(s => parseFloat(s.trim()));
  if (partes.length < 2 || isNaN(partes[0]) || isNaN(partes[1])) return { lat: null, lng: null };
  return { lat: partes[0], lng: partes[1] };
}

export async function fetchUbicaciones() {
  if (_cache && Date.now() - _cacheTime < TTL) return _cache;

  const res  = await fetch(UBIC_URL);
  if (!res.ok) throw new Error('Error al cargar Ubicaciones');
  const text = await res.text();
  const s    = text.indexOf('{');
  const e    = text.lastIndexOf('}');
  const json = JSON.parse(text.slice(s, e + 1));
  const data = json.response ?? json;

  const cols = data.table?.cols || [];
  const rows = data.table?.rows || [];

  const idx = {};
  cols.forEach((c, i) => { idx[(c.label || '').trim().toLowerCase()] = i; });

  const val = (cell) => (cell?.v !== null && cell?.v !== undefined ? String(cell.v) : '');

  _cache = rows.map(row => {
    const c = row.c || [];
    const { lat, lng } = parseCoord(val(c[idx['coordenada']]));
    return {
      id:      val(c[idx['id ubicaciones']]),
      empresa: val(c[idx['empresa']]).trim(),
      nombre:  val(c[idx['nombre']]).trim(),
      tipo:    val(c[idx['tipo de dato']]).trim(),   // 'Planta' | 'Competencia'
      estatus: val(c[idx['estatus']]).trim(),
      lat,
      lng,
    };
  }).filter(r => r.lat && r.lng && r.estatus.toUpperCase() !== 'INACTIVO');

  _cacheTime = Date.now();
  return _cache;
}
