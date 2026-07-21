/**
 * metricas.js — Cálculos de indicadores de negocio.
 * Recibe las ventas ya filtradas por Estatus producto (aplicado en DataContext).
 */

import { getAnio, getMes, parsearFecha } from './formatters';

/** Filtra ventas por año y/o mes. Mes es 1-12 o null para todos. */
export function filtrarVentasPorPeriodo(ventas, anio, mes = null) {
  return ventas.filter((v) => {
    const a = getAnio(v.falta_fac);
    if (anio && a !== Number(anio)) return false;
    if (mes) {
      const m = getMes(v.falta_fac);
      if (m !== Number(mes)) return false;
    }
    return true;
  });
}

/** Filtra ventas por rango de fechas (Date objects) */
export function filtrarPorRangoFechas(ventas, desde, hasta) {
  return ventas.filter((v) => {
    const d = parsearFecha(v.falta_fac);
    if (!d) return false;
    if (desde && d < desde) return false;
    if (hasta && d > hasta) return false;
    return true;
  });
}

/** Suma total de ventas ($) */
export function totalVentas(ventas) {
  return ventas.reduce((acc, v) => acc + (Number(v.total_fac) || 0), 0);
}

/** Suma total de unidades (respetando _contarCantidad) */
export function totalUnidades(ventas) {
  return ventas
    .filter((v) => v._contarCantidad !== false)
    .reduce((acc, v) => acc + (Number(v.cant_surt) || 0), 0);
}

/** Número de facturas únicas */
export function numeroFacturas(ventas) {
  return new Set(ventas.map((v) => v.no_fac).filter(Boolean)).size;
}

/** Número de clientes únicos */
export function numeroClientes(ventas) {
  return new Set(ventas.map((v) => String(v.nom_fac || '').trim()).filter(Boolean)).size;
}

/** Ticket promedio */
export function ticketPromedio(ventas) {
  const facturas = numeroFacturas(ventas);
  return facturas > 0 ? totalVentas(ventas) / facturas : 0;
}

/** Venta promedio por cliente */
export function ventaPromedioPorCliente(ventas) {
  const clientes = numeroClientes(ventas);
  return clientes > 0 ? totalVentas(ventas) / clientes : 0;
}

/**
 * Ventas mensuales agrupadas por año.
 * Retorna: { [anio]: { [mes1..12]: totalVentas } }
 */
export function ventasMensualesPorAnio(ventas) {
  const resultado = {};
  ventas.forEach((v) => {
    const a = getAnio(v.falta_fac);
    const m = getMes(v.falta_fac);
    if (!a || !m) return;
    if (!resultado[a]) resultado[a] = {};
    resultado[a][m] = (resultado[a][m] || 0) + (Number(v.total_fac) || 0);
  });
  return resultado;
}

/**
 * Ventas mensuales de unidades por año.
 */
export function unidadesMensualesPorAnio(ventas) {
  const resultado = {};
  ventas.forEach((v) => {
    if (!v._contarCantidad) return;
    const a = getAnio(v.falta_fac);
    const m = getMes(v.falta_fac);
    if (!a || !m) return;
    if (!resultado[a]) resultado[a] = {};
    resultado[a][m] = (resultado[a][m] || 0) + (Number(v.cant_surt) || 0);
  });
  return resultado;
}

/**
 * Top N productos (agrupados por cve_prod + desc_prod).
 * Retorna array ordenado por ventas descendente.
 */
export function topProductos(ventas, n = 20) {
  const mapa = {};
  const totalGeneral = totalVentas(ventas);

  ventas.forEach((v) => {
    const key = String(v.cve_prod);
    if (!mapa[key]) {
      mapa[key] = {
        cve_prod: v.cve_prod,
        desc_prod: v.desc_prod,
        unidad: v.unidad,
        ventas: 0,
        cantidad: 0,
      };
    }
    mapa[key].ventas += Number(v.total_fac) || 0;
    if (v._contarCantidad !== false) {
      mapa[key].cantidad += Number(v.cant_surt) || 0;
    }
  });

  return Object.values(mapa)
    .sort((a, b) => b.ventas - a.ventas)
    .slice(0, n)
    .map((p, i) => ({
      ...p,
      ranking: i + 1,
      pctTotal: totalGeneral > 0 ? (p.ventas / totalGeneral) * 100 : 0,
      precioPromedio: p.cantidad > 0 ? p.ventas / p.cantidad : 0,
    }));
}

/**
 * Ranking de agentes.
 * Retorna array ordenado por ventas descendente con nombre resuelto del mapa.
 */
export function rankingAgentes(ventas, mapaAgentes = {}) {
  const mapa = {};
  const totalGeneral = totalVentas(ventas);

  ventas.forEach((v) => {
    const key = String(v.cve_age);
    const agente = mapaAgentes[key];
    if (!mapa[key]) {
      mapa[key] = {
        cve_age: v.cve_age,
        nombre: agente?.['Nombre vendedor'] || `Agente ${v.cve_age}`,
        estatus: agente?.Estatus || 'ACTIVO',
        ventas: 0,
        cantidad: 0,
        facturas: new Set(),
        clientes: new Set(),
      };
    }
    mapa[key].ventas += Number(v.total_fac) || 0;
    if (v._contarCantidad !== false) {
      mapa[key].cantidad += Number(v.cant_surt) || 0;
    }
    if (v.no_fac) mapa[key].facturas.add(v.no_fac);
    if (v.nom_fac) mapa[key].clientes.add(String(v.nom_fac).trim());
  });

  return Object.values(mapa)
    .sort((a, b) => b.ventas - a.ventas)
    .map((a, i) => ({
      ...a,
      ranking: i + 1,
      facturas: a.facturas.size,
      clientes: a.clientes.size,
      ticketPromedio: a.facturas.size > 0 ? a.ventas / a.facturas.size : 0,
      pctTotal: totalGeneral > 0 ? (a.ventas / totalGeneral) * 100 : 0,
    }));
}

/**
 * Clientes nuevos por mes: clientes que aparecen por primera vez en ese mes.
 * Retorna: { [anio]: { [mes]: count } }
 */
export function clientesNuevosPorMes(ventas) {
  // Ordenar por fecha para detectar primera aparición
  const ordenadas = [...ventas]
    .map((v) => ({ ...v, _fecha: parsearFecha(v.falta_fac) }))
    .filter((v) => v._fecha)
    .sort((a, b) => a._fecha - b._fecha);

  const clientesVistos = new Set();
  const resultado = {};

  ordenadas.forEach((v) => {
    const cliente = String(v.nom_fac || '').trim();
    if (!cliente) return;
    const a = v._fecha.getFullYear();
    const m = v._fecha.getMonth() + 1;
    if (!clientesVistos.has(cliente)) {
      clientesVistos.add(cliente);
      if (!resultado[a]) resultado[a] = {};
      resultado[a][m] = (resultado[a][m] || 0) + 1;
    }
  });

  return resultado;
}

/** Obtiene años únicos presentes en las ventas, ordenados descendente */
export function aniosDisponibles(ventas) {
  const anios = new Set(ventas.map((v) => getAnio(v.falta_fac)).filter(Boolean));
  return Array.from(anios).sort((a, b) => b - a);
}

/** Promedio de crecimiento mensual (MoM %) dentro de un año */
export function promedioCrecimientoMensual(ventasMensuales, anio) {
  const datos = ventasMensuales[anio] || {};
  const meses = Object.keys(datos).map(Number).sort();
  if (meses.length < 2) return null;
  let suma = 0, count = 0;
  for (let i = 1; i < meses.length; i++) {
    const prev = datos[meses[i - 1]] || 0;
    const curr = datos[meses[i]] || 0;
    if (prev > 0) { suma += ((curr - prev) / prev) * 100; count++; }
  }
  return count > 0 ? suma / count : null;
}

/** Promedio de clientes únicos por mes en el período dado */
export function promedioClientesPorMes(ventas) {
  const porMes = {};
  ventas.forEach((v) => {
    const a = getAnio(v.falta_fac);
    const m = getMes(v.falta_fac);
    if (!a || !m) return;
    const key = `${a}-${m}`;
    if (!porMes[key]) porMes[key] = new Set();
    if (v.nom_fac) porMes[key].add(String(v.nom_fac).trim());
  });
  const vals = Object.values(porMes);
  if (!vals.length) return 0;
  return vals.reduce((s, set) => s + set.size, 0) / vals.length;
}

/** Desglose de unidades vendidas por tipo */
export function desglosePorUnidad(ventas) {
  const mapa = {};
  ventas.forEach((v) => {
    if (v._contarCantidad === false) return;
    const u = v.unidad || '—';
    mapa[u] = (mapa[u] || 0) + (Number(v.cant_surt) || 0);
  });
  return Object.entries(mapa)
    .map(([unidad, cantidad]) => ({ unidad, cantidad }))
    .sort((a, b) => b.cantidad - a.cantidad);
}

/** Ventas por agente con desglose de clientes y productos */
export function ventasPorAgente(ventas, mapaAgentes = {}) {
  const mapa = {};
  const totalGeneral = totalVentas(ventas);
  ventas.forEach((v) => {
    const key = String(v.cve_age);
    const agente = mapaAgentes[key];
    if (!mapa[key]) {
      mapa[key] = {
        cve_age: v.cve_age,
        nombre: agente?.['Nombre vendedor'] || `Agente ${v.cve_age}`,
        ventas: 0, facturas: new Set(), clientes: {}, productos: {},
      };
    }
    const a = mapa[key];
    a.ventas += Number(v.total_fac) || 0;
    if (v.no_fac) a.facturas.add(v.no_fac);
    const cli = String(v.nom_fac || '').trim();
    if (cli) {
      if (!a.clientes[cli]) a.clientes[cli] = { ventas: 0, facturas: new Set() };
      a.clientes[cli].ventas += Number(v.total_fac) || 0;
      if (v.no_fac) a.clientes[cli].facturas.add(v.no_fac);
    }
    const prod = String(v.cve_prod || '');
    if (prod) {
      if (!a.productos[prod]) a.productos[prod] = { desc: v.desc_prod || prod, ventas: 0, cantidad: 0 };
      a.productos[prod].ventas += Number(v.total_fac) || 0;
      a.productos[prod].cantidad += Number(v.cant_surt) || 0;
    }
  });
  return Object.values(mapa)
    .map((a) => ({
      ...a,
      facturas: a.facturas.size,
      pctTotal: totalGeneral > 0 ? (a.ventas / totalGeneral) * 100 : 0,
      clientes: Object.entries(a.clientes)
        .map(([nombre, d]) => ({ nombre, ventas: d.ventas, facturas: d.facturas.size }))
        .sort((x, y) => y.ventas - x.ventas),
      productos: Object.entries(a.productos)
        .map(([cve, d]) => ({ cve_prod: cve, desc_prod: d.desc, ventas: d.ventas, cantidad: d.cantidad }))
        .sort((x, y) => y.ventas - x.ventas),
    }))
    .sort((a, b) => b.ventas - a.ventas);
}

/**
 * Producto más vendido por volumen (cant_surt).
 * Retorna el producto con más m3 surtidos, con precioPorUnidad calculado.
 */
export function productoMasVendido(ventas) {
  const mapa = {};
  ventas.forEach((v) => {
    if (v._contarCantidad === false) return;
    const k = String(v.cve_prod || '');
    if (!k) return;
    if (!mapa[k]) mapa[k] = { cve_prod: k, desc_prod: v.desc_prod || k, ventas: 0, cantidad: 0 };
    mapa[k].ventas += Number(v.total_fac) || 0;
    mapa[k].cantidad += Number(v.cant_surt) || 0;
  });
  const lista = Object.values(mapa).sort((a, b) => b.cantidad - a.cantidad);
  if (!lista.length) return null;
  const top = lista[0];
  return { ...top, precioPorUnidad: top.cantidad > 0 ? top.ventas / top.cantidad : 0 };
}

/** Ventas por cliente con desglose de agentes y productos */
export function ventasPorCliente(ventas, mapaAgentes = {}) {
  const mapa = {};
  const totalGeneral = totalVentas(ventas);
  ventas.forEach((v) => {
    const cli = String(v.nom_fac || '').trim();
    if (!cli) return;
    if (!mapa[cli]) {
      mapa[cli] = { nombre: cli, ventas: 0, facturas: new Set(), agentes: {}, productos: {} };
    }
    const c = mapa[cli];
    c.ventas += Number(v.total_fac) || 0;
    if (v.no_fac) c.facturas.add(v.no_fac);
    const ageKey = String(v.cve_age);
    const agente = mapaAgentes[ageKey];
    const ageNombre = agente?.['Nombre vendedor'] || `Agente ${v.cve_age}`;
    if (!c.agentes[ageKey]) c.agentes[ageKey] = { nombre: ageNombre, ventas: 0 };
    c.agentes[ageKey].ventas += Number(v.total_fac) || 0;
    const prod = String(v.cve_prod || '');
    if (prod) {
      if (!c.productos[prod]) c.productos[prod] = { desc: v.desc_prod || prod, ventas: 0, cantidad: 0 };
      c.productos[prod].ventas += Number(v.total_fac) || 0;
      c.productos[prod].cantidad += Number(v.cant_surt) || 0;
    }
  });
  return Object.values(mapa)
    .map((c) => ({
      ...c,
      facturas: c.facturas.size,
      pctTotal: totalGeneral > 0 ? (c.ventas / totalGeneral) * 100 : 0,
      agentes: Object.values(c.agentes).sort((a, b) => b.ventas - a.ventas),
      productos: Object.entries(c.productos)
        .map(([cve, d]) => ({ cve_prod: cve, desc_prod: d.desc, ventas: d.ventas, cantidad: d.cantidad }))
        .sort((x, y) => y.ventas - x.ventas),
    }))
    .sort((a, b) => b.ventas - a.ventas);
}
