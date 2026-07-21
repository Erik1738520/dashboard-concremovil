import { RefreshCw, Table2 } from 'lucide-react';
import { useDatos } from '../context/DataContext';
import { formatoHora } from '../utils/formatters';

export default function Header({ titulo }) {
  const { totalFilas, horaActualizacion, cargando, cargarDatos } = useDatos();

  return (
    <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-white border-b border-gray-200 sticky top-0 z-10 gap-3">
      <h1 className="text-lg md:text-xl font-bold text-gray-900 truncate">{titulo}</h1>

      <button
        onClick={() => cargarDatos(true)}
        disabled={cargando}
        className="flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-60 transition-colors rounded-full px-2.5 md:px-3 py-1.5 text-xs md:text-sm font-medium shrink-0"
        title="Actualizar datos"
      >
        <Table2 className="w-3.5 h-3.5 md:w-4 md:h-4" />
        <span className="hidden sm:inline">{totalFilas.toLocaleString('es-MX')} filas</span>
        {horaActualizacion && (
          <span className="hidden md:inline text-emerald-500">· {formatoHora(horaActualizacion)}</span>
        )}
        <RefreshCw className={`w-3.5 h-3.5 ${cargando ? 'animate-spin' : ''}`} />
      </button>
    </div>
  );
}
