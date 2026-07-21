/**
 * appsScriptService.js
 * Escritura controlada hacia Google Sheets a través de Google Apps Script (Web App).
 * SOLO escribe en las hojas "Agentes" y "Listado productos"; nunca en "Ventas soluciones".
 *
 * El endpoint espera un POST con body JSON:
 *   { token, accion, ...parametros }
 * Y responde con:
 *   { success: true/false, mensaje: "..." }
 */

const APPS_SCRIPT_URL = import.meta.env.VITE_APPS_SCRIPT_URL;
const TOKEN = import.meta.env.VITE_APPS_SCRIPT_TOKEN;

async function llamarAppsScript(accion, parametros = {}) {
  if (!APPS_SCRIPT_URL || APPS_SCRIPT_URL === 'TU_APPS_SCRIPT_URL_AQUI') {
    throw new Error('El Apps Script no está configurado. Revisa tu archivo .env.');
  }

  const body = JSON.stringify({ token: TOKEN, accion, ...parametros });

  // Sin Content-Type: application/json para evitar la petición preflight (CORS).
  // Apps Script recibe el body como texto y lo parsea con JSON.parse igualmente.
  const resp = await fetch(APPS_SCRIPT_URL, {
    method: 'POST',
    redirect: 'follow',
    body,
  });

  if (!resp.ok) {
    throw new Error(`Error HTTP ${resp.status} al llamar al Apps Script.`);
  }

  const json = await resp.json();
  if (!json.success) {
    throw new Error(json.mensaje || 'El Apps Script reportó un error desconocido.');
  }

  return json;
}

// ─── Funciones de Agentes ─────────────────────────────────────────────────────

/** Crea un nuevo agente en la hoja "Agentes". Valida duplicados en el script. */
export async function crearAgente(cve_age, nombre) {
  return llamarAppsScript('crearAgente', { cve_age, nombre, estatus: 'Activo' });
}

/** Cambia el estatus de un agente (Activo / Inactivo). */
export async function actualizarEstatusAgente(cve_age, nuevoEstatus) {
  return llamarAppsScript('actualizarEstatusAgente', { cve_age, nuevoEstatus });
}

/** Edita el nombre de un agente. */
export async function editarNombreAgente(cve_age, nuevoNombre) {
  return llamarAppsScript('editarAgente', { cve_age, nuevoNombre });
}

// ─── Funciones de Usuarios ───────────────────────────────────────────────────

/** Crea un nuevo usuario en la hoja "Usuarios". */
export async function crearUsuarioSheet(datos) {
  return llamarAppsScript('crearUsuario', datos);
}

/** Actualiza campos de un usuario existente (por ID de hoja). */
export async function actualizarUsuarioSheet(datos) {
  return llamarAppsScript('actualizarUsuario', datos);
}

/** Elimina un usuario de la hoja "Usuarios" por su ID. */
export async function eliminarUsuarioSheet(id) {
  return llamarAppsScript('eliminarUsuario', { id });
}

// ─── Funciones de Productos ───────────────────────────────────────────────────

/**
 * Actualiza un campo de estatus de un producto.
 * campo: 'Estatus cantidad' | 'Estatus producto'
 */
export async function actualizarEstatusProducto(cve_prod, campo, nuevoValor) {
  return llamarAppsScript('actualizarEstatusProducto', { cve_prod, campo, nuevoValor });
}

/**
 * Deja en INACTIVO todos los productos cuya clave NO esté en clavesMantener.
 * clavesMantener: array de strings con los cve_prod a conservar ACTIVO.
 */
export async function desactivarProductosExcepto(clavesMantener) {
  return llamarAppsScript('desactivarExcepto', { clavesMantener });
}
