/**
 * formatters.js — Funciones de formato y helpers de cálculo.
 */

/** Formatea un número como moneda MXN */
export function formatoMoneda(valor) {
  if (valor === null || valor === undefined || valor === '') return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(valor) || 0);
}

/** Formatea un número con separadores de miles */
export function formatoNumero(valor, decimales = 0) {
  return new Intl.NumberFormat('es-MX', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  }).format(Number(valor) || 0);
}

/** Formatea un porcentaje */
export function formatoPorcentaje(valor, decimales = 1) {
  const num = Number(valor) || 0;
  return `${num >= 0 ? '+' : ''}${num.toFixed(decimales)}%`;
}

/** Calcula variación porcentual entre dos valores */
export function variacionPct(actual, anterior) {
  if (!anterior || anterior === 0) return null;
  return ((actual - anterior) / Math.abs(anterior)) * 100;
}

/** Formatea una fecha (string o Date) como "Ene 2025" */
export function formatoMesAno(fecha) {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  if (isNaN(d)) return String(fecha);
  return d.toLocaleDateString('es-MX', { month: 'short', year: 'numeric' });
}

/** Formatea hora como "HH:MM" */
export function formatoHora(fecha) {
  if (!fecha) return '';
  const d = fecha instanceof Date ? fecha : new Date(fecha);
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

/** Parsea una fecha de la hoja (puede ser string "dd/mm/yyyy", "yyyy-mm-dd", número serial) */
export function parsearFecha(valor) {
  if (!valor) return null;

  // Número serial de Google Sheets (días desde 30-dic-1899)
  if (typeof valor === 'number') {
    const base = new Date(1899, 11, 30);
    base.setDate(base.getDate() + valor);
    return base;
  }

  // Intentar parsear como string
  const str = String(valor).trim();

  // Formato dd/mm/yyyy
  const matchDMY = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchDMY) {
    return new Date(Number(matchDMY[3]), Number(matchDMY[2]) - 1, Number(matchDMY[1]));
  }

  // Formato yyyy-mm-dd
  const matchISO = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (matchISO) {
    return new Date(Number(matchISO[1]), Number(matchISO[2]) - 1, Number(matchISO[3]));
  }

  const d = new Date(str);
  return isNaN(d) ? null : d;
}

/** Obtiene el año de una fecha de la hoja */
export function getAnio(valorFecha) {
  const d = parsearFecha(valorFecha);
  return d ? d.getFullYear() : null;
}

/** Obtiene el mes (1-12) de una fecha de la hoja */
export function getMes(valorFecha) {
  const d = parsearFecha(valorFecha);
  return d ? d.getMonth() + 1 : null;
}

/** Nombres de meses en español */
export const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Colores cíclicos para gráficas y avatares */
export const COLORES_CICLICOS = [
  '#C8102E', '#3B82F6', '#F97316', '#10B981', '#8B5CF6', '#06B6D4',
  '#EC4899', '#EAB308', '#14B8A6', '#6366F1',
];

/** Obtiene un color cíclico por índice */
export function colorPorIndice(i) {
  return COLORES_CICLICOS[i % COLORES_CICLICOS.length];
}

/** Genera la inicial (primer letra) de un nombre */
export function inicial(nombre) {
  return String(nombre || '?')[0].toUpperCase();
}

/** Trunca un texto a maxLen caracteres */
export function truncar(texto, maxLen = 30) {
  if (!texto) return '';
  return texto.length > maxLen ? texto.slice(0, maxLen - 1) + '…' : texto;
}
