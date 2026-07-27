import { useMemo, useState } from 'react';

// Hook genérico de ordenação client-side para grids.
// accessors: { colunaKey: (linha) => valorComparavel }
// defaultKey/defaultDir definem a ordenação inicial (padrão: mais recente primeiro).
export function useSort(dados, accessors, defaultKey, defaultDir = 'desc') {
  const [sortKey, setSortKey] = useState(defaultKey);
  const [sortDir, setSortDir] = useState(defaultDir);

  function requestSort(key) {
    if (key === sortKey) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const dadosOrdenados = useMemo(() => {
    if (!sortKey || !accessors[sortKey]) return dados;
    const accessor = accessors[sortKey];
    const copia = [...dados];
    copia.sort((a, b) => {
      const va = accessor(a);
      const vb = accessor(b);
      if (va == null && vb == null) return 0;
      if (va == null) return 1;
      if (vb == null) return -1;
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return copia;
  }, [dados, accessors, sortKey, sortDir]);

  return { dadosOrdenados, sortKey, sortDir, requestSort };
}
