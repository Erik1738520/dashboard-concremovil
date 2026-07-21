/**
 * DataContext.jsx
 * Gestiona la carga global de datos desde Google Sheets.
 * Aplica las reglas de negocio de filtrado (Estatus producto, Estatus cantidad).
 */

import { createContext, useContext, useState, useCallback, useEffect, useMemo } from 'react';
import { cargarTodosLosDatos, invalidarCache } from '../api/sheetsService';

const DataContext = createContext(null);

function normalizar(valor) {
  return String(valor || '').trim().toUpperCase();
}

function esInactivo(valor) { return normalizar(valor) === 'INACTIVO'; }

export function DataProvider({ children }) {
  const [estado, setEstado] = useState({
    ventas: [],
    agentes: [],
    productos: [],
    totalFilas: 0,
    horaActualizacion: null,
    cargando: false,
    error: null,
  });

  const cargarDatos = useCallback(async (forzar = false) => {
    setEstado((prev) => ({ ...prev, cargando: true, error: null }));
    try {
      if (forzar) invalidarCache();
      const datos = await cargarTodosLosDatos();

      // Construir mapa de productos para aplicar reglas de negocio
      const mapaProductos = {};
      datos.productos.forEach((p) => {
        mapaProductos[String(p.cve_prod)] = p;
      });

      // Filtrar ventas según Estatus producto (excluir INACTIVO)
      const ventasFiltradas = datos.ventas.filter((v) => {
        const prod = mapaProductos[String(v.cve_prod)];
        if (!prod) return true;
        return !esInactivo(prod['Estatus producto']);
      });

      // Marcar ventas que no deben contar en cantidad (INACTIVO = no contar)
      const ventasConFlags = ventasFiltradas.map((v) => {
        const prod = mapaProductos[String(v.cve_prod)];
        const contarCantidad = prod ? !esInactivo(prod['Estatus cantidad']) : true;
        return { ...v, _contarCantidad: contarCantidad };
      });

      setEstado({
        ventas: ventasConFlags,
        agentes: datos.agentes,
        productos: datos.productos,
        totalFilas: datos.totalFilas,
        horaActualizacion: datos.horaActualizacion,
        cargando: false,
        error: null,
      });
    } catch (err) {
      setEstado((prev) => ({
        ...prev,
        cargando: false,
        error: err.message || 'Error al cargar datos',
      }));
    }
  }, []);

  // Carga inicial
  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const mapaAgentes = useMemo(() =>
    estado.agentes.reduce((acc, a) => {
      acc[String(a.cve_age)] = a;
      return acc;
    }, {}),
  [estado.agentes]);

  return (
    <DataContext.Provider value={{ ...estado, cargarDatos, mapaAgentes }}>
      {children}
    </DataContext.Provider>
  );
}

export function useDatos() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDatos debe usarse dentro de DataProvider');
  return ctx;
}
