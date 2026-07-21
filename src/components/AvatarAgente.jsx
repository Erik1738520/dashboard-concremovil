import { colorPorIndice, inicial } from '../utils/formatters';

/** Avatar circular con inicial del agente */
export default function AvatarAgente({ nombre, indice = 0, size = 'md' }) {
  const bg = colorPorIndice(indice);
  const sizes = { sm: 'w-7 h-7 text-xs', md: 'w-9 h-9 text-sm', lg: 'w-11 h-11 text-base' };
  return (
    <div
      className={`${sizes[size]} rounded-full flex items-center justify-center font-semibold text-white shrink-0`}
      style={{ backgroundColor: bg }}
    >
      {inicial(nombre)}
    </div>
  );
}
