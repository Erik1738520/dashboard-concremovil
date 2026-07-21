const EOX_ID  = '1NKojDHEbq1_34AUJE5nrksEWicxG9GjndWk0m5DREhk';
const EOX_URL = `https://docs.google.com/spreadsheets/d/${EOX_ID}/gviz/tq?tqx=out:json&sheet=EOX&tq=select%20*`;

let _cache     = null;
let _cacheTime = 0;
const TTL = 10 * 60 * 1000;

function parseDateGviz(cell) {
  if (!cell?.v) return null;
  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
    const m = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) return new Date(+m[1], +m[2], +m[3]);
  }
  return null;
}

export async function fetchEOX() {
  if (_cache && Date.now() - _cacheTime < TTL) return _cache;

  const res = await fetch(EOX_URL);
  if (!res.ok) throw new Error('Error al cargar EOX');
  const text = await res.text();
  const s = text.indexOf('{'), e = text.lastIndexOf('}');
  const json = JSON.parse(text.slice(s, e + 1));
  const data  = json.response ?? json;
  const cols  = data.table?.cols || [];
  const rows  = data.table?.rows || [];

  const iNoEco  = cols.findIndex(c => c.label === 'No. Económico');
  const iFecha  = cols.findIndex(c => c.label === 'Fecha Histórica');
  const iPesos  = cols.findIndex(c => c.label === 'Consumo en Pesos');
  const iLitros = cols.findIndex(c => c.label === 'Consumo en Litros');

  _cache = rows.map(row => {
    const c    = row.c || [];
    const fecha = parseDateGviz(c[iFecha]);
    return {
      noEco:  (c[iNoEco]?.v  || '').trim().toUpperCase(),
      fecha,
      anio:   fecha?.getFullYear()    ?? null,
      mes:    fecha ? fecha.getMonth() + 1 : null,
      pesos:  parseFloat(c[iPesos]?.v  || 0) || 0,
      litros: parseFloat(c[iLitros]?.v || 0) || 0,
    };
  }).filter(r => r.noEco);

  _cacheTime = Date.now();
  return _cache;
}

/** Filtra registros EOX por alias del vendedor (array de strings) y período opcional */
export function filtrarEOX(registros, aliases, anio, mes) {
  const upper = aliases.map(a => a.trim().toUpperCase());
  return registros.filter(r => {
    if (!upper.includes(r.noEco)) return false;
    if (anio && r.anio !== Number(anio)) return false;
    if (mes  && r.mes  !== Number(mes))  return false;
    return true;
  });
}
