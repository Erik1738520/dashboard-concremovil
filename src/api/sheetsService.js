/**
 * sheetsService.js
 * Lectura de Google Sheets sin API Key, usando la URL pública de exportación CSV.
 * Requisito: el Sheets debe estar compartido como "Cualquier persona con el enlace puede ver".
 */

import { limpiarEnv } from './appsScriptService';

// Respaldo si la variable no está configurada en el hosting (el Sheets es público)
const SPREADSHEET_ID   = limpiarEnv(import.meta.env.VITE_SPREADSHEET_ID) || '1VJnPOsSU3m-GD5vH0E3ZPl-QosfR7vo5G3uypXrjg0M';
const APPS_SCRIPT_URL  = limpiarEnv(import.meta.env.VITE_APPS_SCRIPT_URL);

// Caché en memoria: { [cacheKey]: { data, expiry } }
const cache = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos

export const HOJAS = {
  VENTAS:    'Ventas soluciones',
  AGENTES:   'Agentes',
  PRODUCTOS: 'Listado productos',
  USUARIOS:  'Usuarios',
};

/**
 * Lee una hoja via gviz/tq JSON — más robusto que CSV para celdas con
 * caracteres especiales (ñ, acentos, emojis, etc.).
 * Retorna directamente array de objetos con los encabezados como claves.
 */
async function leerHojaComoJSON(nombreHoja) {
  const cacheKey = `json_${nombreHoja}`;
  if (cache[cacheKey] && Date.now() < cache[cacheKey].expiry) {
    return cache[cacheKey].data;
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?tqx=out:json&headers=1&sheet=${encodeURIComponent(nombreHoja)}`;

  const resp = await fetch(url);
  if (!resp.ok) throw new Error(`No se pudo leer "${nombreHoja}"`);

  const texto  = await resp.text();
  // gviz envuelve la respuesta en: google.visualization.Query.setResponse({...});
  const inicio = texto.indexOf('{');
  const fin    = texto.lastIndexOf('}') + 1;
  const data   = JSON.parse(texto.slice(inicio, fin));

  if (!data?.table?.rows) return [];

  const cols  = (data.table.cols || []).map(c => (c.label || c.id || '').trim());
  const filas = data.table.rows.map(row =>
    Object.fromEntries(
      (row.c || []).map((celda, i) => [cols[i], celda?.v != null ? String(celda.v) : ''])
    )
  );

  cache[cacheKey] = { data: filas, expiry: Date.now() + CACHE_TTL_MS };
  return filas;
}

/**
 * Descarga una hoja como CSV y la parsea en array de arrays.
 * URL pública que no requiere API Key (la hoja debe ser pública de lectura).
 */
async function leerHoja(nombreHoja) {
  const cacheKey = nombreHoja;
  if (cache[cacheKey] && Date.now() < cache[cacheKey].expiry) {
    return cache[cacheKey].data;
  }

  const url =
    `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq` +
    `?tqx=out:csv&headers=1&sheet=${encodeURIComponent(nombreHoja)}`;

  const resp = await fetch(url);
  if (!resp.ok) {
    throw new Error(`No se pudo leer la hoja "${nombreHoja}". ¿El Sheets es público?`);
  }

  const texto = await resp.text();
  const filas = parsearCSV(texto);

  cache[cacheKey] = { data: filas, expiry: Date.now() + CACHE_TTL_MS };
  return filas;
}

/**
 * Parsea CSV carácter por carácter, respetando comillas, comas y saltos de
 * línea dentro de campos entrecomillados (celdas multi-línea de Google Sheets).
 */
function parsearCSV(texto) {
  const filas = [];
  let fila = [];
  let campo = '';
  let enComillas = false;

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i];
    const sig = texto[i + 1];

    if (c === '"') {
      if (enComillas && sig === '"') {
        campo += '"';   // comilla escapada ""
        i++;
      } else {
        enComillas = !enComillas;
      }
    } else if (c === ',' && !enComillas) {
      fila.push(campo.trim());
      campo = '';
    } else if (!enComillas && (c === '\n' || (c === '\r' && sig === '\n'))) {
      if (c === '\r') i++;   // consumir el \n de \r\n
      fila.push(campo.trim());
      if (fila.some((f) => f !== '')) filas.push(fila);
      fila = [];
      campo = '';
    } else if (!enComillas && c === '\r') {
      fila.push(campo.trim());
      if (fila.some((f) => f !== '')) filas.push(fila);
      fila = [];
      campo = '';
    } else {
      campo += c;
    }
  }

  // Última fila sin salto de línea final
  fila.push(campo.trim());
  if (fila.some((f) => f !== '')) filas.push(fila);

  return filas;
}

/** Convierte array de filas (primera = encabezado) en array de objetos. */
function filasAObjetos(filas) {
  if (!filas || filas.length < 2) return [];
  const [encabezado, ...datos] = filas;
  return datos.map((fila) =>
    encabezado.reduce((obj, col, i) => {
      obj[col] = fila[i] !== undefined ? fila[i] : '';
      return obj;
    }, {})
  );
}

/** Invalida todo el caché (llamar al hacer refresh manual). */
export function invalidarCache() {
  Object.keys(cache).forEach((k) => delete cache[k]);
}

/** Invalida solo el caché de una hoja específica. */
export function invalidarCacheHoja(nombreHoja) {
  delete cache[`json_${nombreHoja}`];
  delete cache[nombreHoja];
  delete cache[`script_${nombreHoja}`];
}

/**
 * Lee una hoja completa vía Apps Script GET (sin límite de filas).
 * Retorna directamente array de objetos (ya mapeados con encabezados).
 */
async function leerHojaViaScript(nombreHoja) {
  const cacheKey = `script_${nombreHoja}`;
  if (cache[cacheKey] && Date.now() < cache[cacheKey].expiry) {
    return cache[cacheKey].data;
  }

  if (!APPS_SCRIPT_URL) throw new Error('VITE_APPS_SCRIPT_URL no configurado en .env');

  const url = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(nombreHoja)}`;
  const resp = await fetch(url, { redirect: 'follow' });
  if (!resp.ok) throw new Error(`Error ${resp.status} al leer "${nombreHoja}" vía Apps Script`);

  const json = await resp.json();
  if (!json.success || !Array.isArray(json.filas)) throw new Error(json.mensaje || 'sin filas');

  cache[cacheKey] = { data: json.filas, expiry: Date.now() + CACHE_TTL_MS };
  return json.filas;
}

// ─── Funciones públicas ───────────────────────────────────────────────────────

export async function cargarVentas() {
  // Intenta Apps Script primero (sin límite de filas).
  // Si falla o tarda más de 20 s, cae a gviz como respaldo.
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 20000);

  try {
    if (!APPS_SCRIPT_URL) throw new Error('sin URL');
    const url  = `${APPS_SCRIPT_URL}?sheet=${encodeURIComponent(HOJAS.VENTAS)}`;
    const resp = await fetch(url, { redirect: 'follow', signal: controller.signal });
    clearTimeout(timeout);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const json = await resp.json();
    if (!json.success || !Array.isArray(json.filas)) throw new Error(json.mensaje || 'sin filas');
    return json.filas;
  } catch {
    clearTimeout(timeout);
    // Respaldo: gviz (limitado pero rápido)
    return filasAObjetos(await leerHoja(HOJAS.VENTAS));
  }
}

export async function cargarAgentes() {
  return filasAObjetos(await leerHoja(HOJAS.AGENTES));
}

export async function cargarProductos() {
  return filasAObjetos(await leerHoja(HOJAS.PRODUCTOS));
}

export async function cargarUsuarios() {
  // Usamos JSON en lugar de CSV para evitar problemas de codificación
  // con caracteres especiales (ñ, acentos) que rompen el parseo CSV.
  const filas = await leerHojaComoJSON(HOJAS.USUARIOS);
  return filas
    .filter((u) => u['Correo'] && u['Correo'].includes('@'))
    .map((u) => {
      const correoNorm = u['Correo'].trim().toLowerCase();
      const est = String(u['Estatus'] || 'ACTIVO').toUpperCase();
      return {
        id:            u['ID usuario'] || `sheet_${correoNorm}`,
        nombre:        u['Nombre']     || u['Correo'],
        correo:        correoNorm,
        password:      (u['Contraseña'] || u['Contrasena'] || u['Password'] || '').trim(),
        rol:           u['Rol']        || 'Consulta',
        cve_age:       u['cve_age']    || '',
        estatus:       est === 'ACTIVO' ? 'Activo' : 'Inactivo',
        fechaCreacion: u['Fecha creacion'] || '',
      };
    });
}

export async function cargarTodosLosDatos() {
  const [ventas, agentes, productos] = await Promise.all([
    cargarVentas(),
    cargarAgentes(),
    cargarProductos(),
  ]);
  return {
    ventas,
    agentes,
    productos,
    totalFilas: ventas.length,
    horaActualizacion: new Date(),
  };
}
