/**
 * MAT-MOVIL — Google Apps Script Web App
 * Escritura controlada en "Agentes", "Listado productos" y "Usuarios".
 *
 * PASOS PARA DESPLEGAR (una sola vez):
 *  1. Abre tu Google Sheets
 *  2. Menú superior: Extensiones → Apps Script
 *  3. Borra todo el código que haya y pega ESTE archivo completo
 *  4. Cambia TOKEN_SECRETO por cualquier contraseña larga que tú elijas
 *  5. Guarda (Ctrl+S)
 *  6. Clic en "Implementar" → "Nuevo despliegue"
 *     - Tipo: Aplicación web
 *     - Ejecutar como: Yo (tu cuenta de Google)
 *     - Quién tiene acceso: Cualquier persona
 *  7. Clic en "Implementar" → autoriza los permisos si te los pide
 *  8. Copia la URL que aparece ("URL de la aplicación web")
 *  9. Pega esa URL en tu archivo .env:  VITE_APPS_SCRIPT_URL=<la url>
 * 10. Pon el mismo TOKEN_SECRETO en .env:  VITE_APPS_SCRIPT_TOKEN=<el token>
 *
 * PARA ACTUALIZAR EL SCRIPT (cuando ya está desplegado):
 *  1. Edita el código y guarda (Ctrl+S)
 *  2. Clic en "Implementar" → "Gestionar implementaciones"
 *  3. Clic en el lápiz (editar) → selecciona "Nueva versión" → "Implementar"
 *  (La URL no cambia, no necesitas actualizar el .env)
 */

// ─── CAMBIA ESTE VALOR ────────────────────────────────────────────────────────
var TOKEN_SECRETO = 'matmovil-dashboard-2024-secreto';
// ─────────────────────────────────────────────────────────────────────────────

var HOJA_AGENTES   = 'Agentes';
var HOJA_PRODUCTOS = 'Listado productos';
var HOJA_USUARIOS  = 'Usuarios';

// ─── Punto de entrada POST ────────────────────────────────────────────────────

function doPost(e) {
  try {
    var datos = JSON.parse(e.postData.contents);

    if (datos.token !== TOKEN_SECRETO) {
      return jsonRespuesta(false, 'Token inválido.');
    }

    switch (datos.accion) {
      case 'crearAgente':
        return crearAgente(datos.cve_age, datos.nombre, datos.estatus || 'Activo');
      case 'actualizarEstatusAgente':
        return actualizarEstatusAgente(datos.cve_age, datos.nuevoEstatus);
      case 'editarAgente':
        return editarNombreAgente(datos.cve_age, datos.nuevoNombre);
      case 'actualizarEstatusProducto':
        return actualizarEstatusProducto(datos.cve_prod, datos.campo, datos.nuevoValor);
      case 'desactivarExcepto':
        return desactivarProductosExcepto(datos.clavesMantener);
      case 'crearUsuario':
        return crearUsuario(datos);
      case 'actualizarUsuario':
        return actualizarUsuario(datos);
      case 'eliminarUsuario':
        return eliminarUsuario(datos);
      default:
        return jsonRespuesta(false, 'Acción desconocida: ' + datos.accion);
    }
  } catch (err) {
    return jsonRespuesta(false, 'Error interno: ' + err.message);
  }
}

// Responde a peticiones GET (útil para verificar que el script está activo)
function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({ success: true, mensaje: 'MAT-MOVIL Apps Script activo.' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─── Usuarios ─────────────────────────────────────────────────────────────────

function crearUsuario(payload) {
  var correoNorm = String(payload.correo || '').trim().toLowerCase();
  if (!correoNorm || !correoNorm.includes('@')) {
    return jsonRespuesta(false, 'Correo inválido.');
  }
  if (!payload.nombre) return jsonRespuesta(false, 'El nombre es obligatorio.');
  if (!payload.password) return jsonRespuesta(false, 'La contraseña es obligatoria.');

  var hoja = obtenerHoja(HOJA_USUARIOS);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colCorreo = enc.indexOf('Correo');
  if (colCorreo === -1) return jsonRespuesta(false, 'No se encontró columna "Correo" en Usuarios.');

  // Verificar que no exista el correo
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colCorreo] || '').trim().toLowerCase() === correoNorm) {
      return jsonRespuesta(false, 'Ya existe un usuario con ese correo.');
    }
  }

  // Generar ID correlativo (USER-0001, USER-0002, ...)
  var nuevoId = 'USER-' + String(valores.length).padStart(4, '0');

  // Construir fila vacía del tamaño del encabezado
  var fila = new Array(enc.length).fill('');

  var poner = function(col, val) {
    var idx = enc.indexOf(col);
    if (idx >= 0) fila[idx] = val;
  };

  poner('ID usuario',  nuevoId);
  poner('datetime',    new Date().toLocaleDateString('es-MX'));
  poner('Nombre',      String(payload.nombre).trim());
  poner('Correo',      correoNorm);
  poner('Contraseña',  String(payload.password).trim());
  poner('Rol',         String(payload.rol || '').trim());
  poner('cve_age',     String(payload.cve_age || '').trim());
  poner('Estatus',     'ACTIVO');

  hoja.appendRow(fila);
  return jsonRespuesta(true, 'Usuario creado con ID ' + nuevoId);
}

function actualizarUsuario(payload) {
  if (!payload.id) return jsonRespuesta(false, 'ID de usuario requerido.');

  var hoja = obtenerHoja(HOJA_USUARIOS);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colId = enc.indexOf('ID usuario');
  if (colId === -1) return jsonRespuesta(false, 'No se encontró columna "ID usuario" en Usuarios.');

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colId]).trim() === String(payload.id).trim()) {

      var actualizar = function(col, val) {
        if (val === undefined || val === null) return;
        var idx = enc.indexOf(col);
        if (idx >= 0) hoja.getRange(i + 1, idx + 1).setValue(val);
      };

      actualizar('Nombre',     payload.nombre);
      actualizar('Contraseña', payload.password);
      actualizar('Rol',        payload.rol);
      actualizar('cve_age',    payload.cve_age);
      actualizar('Estatus',    payload.estatus ? String(payload.estatus).toUpperCase() : undefined);

      return jsonRespuesta(true, 'Usuario actualizado.');
    }
  }

  return jsonRespuesta(false, 'No se encontró usuario con ID "' + payload.id + '".');
}

function eliminarUsuario(payload) {
  if (!payload.id) return jsonRespuesta(false, 'ID de usuario requerido.');

  var hoja = obtenerHoja(HOJA_USUARIOS);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colId = enc.indexOf('ID usuario');
  if (colId === -1) return jsonRespuesta(false, 'No se encontró columna "ID usuario" en Usuarios.');

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colId]).trim() === String(payload.id).trim()) {
      hoja.deleteRow(i + 1);
      return jsonRespuesta(true, 'Usuario eliminado.');
    }
  }

  return jsonRespuesta(false, 'No se encontró usuario con ID "' + payload.id + '".');
}

// ─── Agentes ──────────────────────────────────────────────────────────────────

function crearAgente(cve_age, nombre, estatus) {
  if (!cve_age || !nombre) return jsonRespuesta(false, 'cve_age y nombre son obligatorios.');

  var hoja = obtenerHoja(HOJA_AGENTES);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colCve = enc.indexOf('cve_age');
  if (colCve === -1) return jsonRespuesta(false, 'No se encontró columna cve_age en Agentes.');

  // Verificar duplicado
  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colCve]).trim() === String(cve_age).trim()) {
      return jsonRespuesta(false, 'Ya existe un agente con cve_age "' + cve_age + '".');
    }
  }

  var colEstatus = enc.indexOf('Estatus');
  if (colEstatus === -1) {
    colEstatus = enc.length;
    hoja.getRange(1, colEstatus + 1).setValue('Estatus');
  }

  var colNombre = enc.indexOf('Nombre vendedor');
  var maxCol = Math.max(colCve, colNombre === -1 ? 1 : colNombre, colEstatus) + 1;
  var nuevaFila = [];
  for (var j = 0; j < maxCol; j++) nuevaFila.push('');
  nuevaFila[colCve] = cve_age;
  if (colNombre !== -1) nuevaFila[colNombre] = nombre;
  nuevaFila[colEstatus] = String(estatus).toUpperCase();

  hoja.appendRow(nuevaFila);
  return jsonRespuesta(true, 'Agente "' + nombre + '" creado.');
}

function actualizarEstatusAgente(cve_age, nuevoEstatus) {
  if (!cve_age || !nuevoEstatus) return jsonRespuesta(false, 'Parámetros incompletos.');

  var hoja = obtenerHoja(HOJA_AGENTES);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colCve = enc.indexOf('cve_age');
  if (colCve === -1) return jsonRespuesta(false, 'No se encontró columna cve_age.');

  var colEstatus = enc.indexOf('Estatus');
  if (colEstatus === -1) {
    colEstatus = enc.length;
    hoja.getRange(1, colEstatus + 1).setValue('Estatus');
  }

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colCve]).trim() === String(cve_age).trim()) {
      hoja.getRange(i + 1, colEstatus + 1).setValue(String(nuevoEstatus).toUpperCase());
      return jsonRespuesta(true, 'Agente actualizado a "' + nuevoEstatus + '".');
    }
  }
  return jsonRespuesta(false, 'No se encontró agente con cve_age "' + cve_age + '".');
}

function editarNombreAgente(cve_age, nuevoNombre) {
  if (!cve_age || !nuevoNombre) return jsonRespuesta(false, 'Parámetros incompletos.');

  var hoja = obtenerHoja(HOJA_AGENTES);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colCve    = enc.indexOf('cve_age');
  var colNombre = enc.indexOf('Nombre vendedor');
  if (colCve === -1 || colNombre === -1) return jsonRespuesta(false, 'Columnas necesarias no encontradas.');

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colCve]).trim() === String(cve_age).trim()) {
      hoja.getRange(i + 1, colNombre + 1).setValue(nuevoNombre);
      return jsonRespuesta(true, 'Nombre actualizado.');
    }
  }
  return jsonRespuesta(false, 'No se encontró agente con cve_age "' + cve_age + '".');
}

// ─── Productos ────────────────────────────────────────────────────────────────

function actualizarEstatusProducto(cve_prod, campo, nuevoValor) {
  if (!cve_prod || !campo || nuevoValor === undefined) {
    return jsonRespuesta(false, 'Parámetros incompletos.');
  }

  var permitidos = ['Estatus cantidad', 'Estatus producto'];
  if (permitidos.indexOf(campo) === -1) {
    return jsonRespuesta(false, 'Campo no permitido: "' + campo + '".');
  }

  var hoja = obtenerHoja(HOJA_PRODUCTOS);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colCve   = enc.indexOf('cve_prod');
  var colCampo = enc.indexOf(campo);

  if (colCve === -1)   return jsonRespuesta(false, 'No se encontró columna cve_prod.');
  if (colCampo === -1) return jsonRespuesta(false, 'No se encontró columna "' + campo + '".');

  for (var i = 1; i < valores.length; i++) {
    if (String(valores[i][colCve]).trim() === String(cve_prod).trim()) {
      hoja.getRange(i + 1, colCampo + 1).setValue(nuevoValor);
      return jsonRespuesta(true, 'Producto actualizado: "' + campo + '" = "' + nuevoValor + '".');
    }
  }
  return jsonRespuesta(false, 'No se encontró producto con cve_prod "' + cve_prod + '".');
}

function desactivarProductosExcepto(clavesMantener) {
  if (!clavesMantener || !Array.isArray(clavesMantener)) {
    return jsonRespuesta(false, 'clavesMantener debe ser un arreglo.');
  }

  var hoja = obtenerHoja(HOJA_PRODUCTOS);
  var valores = hoja.getDataRange().getValues();
  var enc = valores[0];

  var colCve    = enc.indexOf('cve_prod');
  var colEstProd = enc.indexOf('Estatus producto');

  if (colCve === -1 || colEstProd === -1) {
    return jsonRespuesta(false, 'Columnas necesarias no encontradas en Listado productos.');
  }

  var actualizados = 0;
  for (var i = 1; i < valores.length; i++) {
    var cve = String(valores[i][colCve]).trim();
    if (cve && clavesMantener.indexOf(cve) === -1) {
      hoja.getRange(i + 1, colEstProd + 1).setValue('INACTIVO');
      actualizados++;
    }
  }
  return jsonRespuesta(true, actualizados + ' productos desactivados.');
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function obtenerHoja(nombre) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var hoja = ss.getSheetByName(nombre);
  if (!hoja) throw new Error('No existe la hoja "' + nombre + '".');
  return hoja;
}

function jsonRespuesta(exito, mensaje) {
  return ContentService
    .createTextOutput(JSON.stringify({ success: exito, mensaje: mensaje }))
    .setMimeType(ContentService.MimeType.JSON);
}
