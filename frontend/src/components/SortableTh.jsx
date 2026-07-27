import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

// <th> clicável para ordenar grids. Mostra seta indicando a direção
// atual, ou um ícone neutro quando a coluna não é a ativa.
export default function SortableTh({ label, sortKey, currentKey, currentDir, onSort, className = '' }) {
  const ativo = sortKey === currentKey;
  return (
    <th className={`p-3 select-none ${className}`}>
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="flex items-center gap-1 hover:text-slate-900 whitespace-nowrap"
      >
        {label}
        {ativo ? (
          currentDir === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300" />
        )}
      </button>
    </th>
  );
}
