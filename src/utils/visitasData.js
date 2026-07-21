const SHEET_ID = '1yxi_-7XJi4tkgz5CaNS1ewVzhf5PI6CPt1ZM2XURmzo';
// tq=select * trae TODAS las filas (sin el límite de 100 que aplica por default)
const VISITAS_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&tq=select%20*`;

const MESES_ES = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];
export function getMesLabel(mes) { return MESES_ES[mes] || ''; }

function getLunesDeSemana(date) {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

function val(cell) {
  if (!cell) return '';
  return (cell.v !== null && cell.v !== undefined) ? String(cell.v) : '';
}

function parseFechaGviz(cell) {
  if (!cell || cell.v === null || cell.v === undefined) return null;
  // gviz devuelve fechas como "Date(2024,4,8)" → año, mes(0-based), día
  if (typeof cell.v === 'string' && cell.v.startsWith('Date(')) {
    const m = cell.v.match(/Date\((\d+),(\d+),(\d+)\)/);
    if (m) return new Date(parseInt(m[1]), parseInt(m[2]), parseInt(m[3]));
  }
  // También puede venir como string formateado
  const f = cell.f || cell.v;
  if (typeof f === 'string') {
    const meses = { Jan:0,Feb:1,Mar:2,Apr:3,May:4,Jun:5,Jul:6,Aug:7,Sep:8,Oct:9,Nov:10,Dec:11 };
    const match = f.match(/(\d{1,2})[/-]([A-Za-z]+|\d{1,2})[/-](\d{4})/);
    if (match) {
      const mes = isNaN(match[2]) ? meses[match[2].slice(0,3)] : parseInt(match[2]) - 1;
      return new Date(parseInt(match[3]), mes, parseInt(match[1]));
    }
  }
  return null;
}

export function parseVisitasJSON(json) {
  const cols = json?.table?.cols || [];
  const rows = json?.table?.rows || [];

  // Mapa de nombre de columna → índice
  const idx = {};
  cols.forEach((c, i) => {
    const label = (c.label || '').trim().toLowerCase();
    // Guardar todos los índices; para duplicados guardamos el último
    idx[label] = i;
  });

  // Índices clave
  const iVendedor  = (() => {
    // Buscar la ÚLTIMA columna que se llame "vendedor" (la repetida en AD)
    let last = -1;
    cols.forEach((c, i) => { if ((c.label || '').trim().toLowerCase() === 'vendedor') last = i; });
    return last;
  })();
  const iFecha       = idx['fecha']           ?? 2;
  const iTipo        = idx['cliente o prospecto'] ?? 5;
  const iNombre      = idx['nombre del cliente o prospecto'] ?? 6;
  const iVisitaTipo  = idx['visita a oficina o obra']        ?? 7;
  const iObra        = idx['obra visitada']   ?? 8;
  const iPersona     = idx['persona visitada en obra o oficina'] ?? 10;
  const iPuesto      = idx['puesto de la persona'] ?? 11;
  const iTelefono    = idx['telefono del contacto'] ?? 12;
  const iCompetidor  = idx['competidor colando o entregando material'] ?? 13;
  const iNomComp     = idx['nombre de la competencia'] ?? 14;
  const iProducto    = idx['producto ofrecido'] ?? 15;
  const iComentarios = idx['comentarios']      ?? 18;
  const iLat         = idx['submitters latitude']  ?? 24;
  const iLng         = idx['submitters longitude'] ?? 25;
  const iLlamada     = idx['llamada o visita'] ?? 27;
  const iPersonaLlam = idx['persona a la que se llamo'] ?? 28;

  const registros = [];
  rows.forEach((row) => {
    const c = row.c || [];
    const fecha    = parseFechaGviz(c[iFecha]);
    const fechaStr = (c[iFecha]?.f) || val(c[iFecha]);
    const lat      = parseFloat(val(c[iLat]));
    const lng      = parseFloat(val(c[iLng]));
    const vendedor = iVendedor >= 0 ? val(c[iVendedor]).trim() : '';

    registros.push({
      fecha,
      fechaStr,
      vendedor,
      tipo:            val(c[iTipo]).trim(),
      nombre:          val(c[iNombre]).trim(),
      visitaTipo:      val(c[iVisitaTipo]).trim(),
      obraVisitada:    val(c[iObra]).trim(),
      personaVisitada: val(c[iPersona]).trim(),
      puesto:          val(c[iPuesto]).trim(),
      telefono:        val(c[iTelefono]).trim(),
      competidor:      val(c[iCompetidor]).trim(),
      nombreCompetencia: val(c[iNomComp]).trim(),
      productoOfrecido:  val(c[iProducto]).trim(),
      comentarios:     val(c[iComentarios]).trim(),
      lat: isNaN(lat) ? null : lat,
      lng: isNaN(lng) ? null : lng,
      llamadaVisita:   val(c[iLlamada]).trim(),
      personaLlamada:  val(c[iPersonaLlam]).trim(),
      anio:  fecha ? fecha.getFullYear() : null,
      mes:   fecha ? fecha.getMonth() + 1 : null,
      semanaKey:   fecha ? getLunesDeSemana(fecha).getTime() : null,
      semanaLabel: fecha ? (() => {
        const l = getLunesDeSemana(fecha);
        return `${String(l.getDate()).padStart(2,'0')}/${String(l.getMonth()+1).padStart(2,'0')}`;
      })() : '',
    });
  });
  return registros;
}

export async function fetchVisitas() {
  const res = await fetch(VISITAS_URL);
  if (!res.ok) throw new Error('Error al cargar visitas');
  const text = await res.text();
  // La API gviz devuelve: /*O_o*/\ngoogle.visualization.Query.setResponse({...});
  // Extraemos exactamente desde el primer { hasta el último }
  const start = text.indexOf('{');
  const end   = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('Respuesta inesperada de Google Sheets');
  const json = JSON.parse(text.slice(start, end + 1));
  return parseVisitasJSON(json.response ?? json);
}
