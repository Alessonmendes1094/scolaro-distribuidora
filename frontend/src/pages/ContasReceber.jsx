import { useEffect, useState } from 'react';
import api from '../lib/api';

const badge = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  ATRASADO: 'bg-red-100 text-red-800',
  PAGO: 'bg-green-100 text-green-800',
};

export default function ContasReceber() {
  const [lista, setLista] = useState([]);

  async function carregar() {
    const { data } = await api.get('/contas-receber');
    setLista(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function marcarPago(id) {
    if (!confirm('Confirmar recebimento desta conta?')) return;
    await api.post(`/contas-receber/${id}/pagar`);
    carregar();
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contas a Receber</h1>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Cliente</th>
            <th className="p-3">Venda</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Vencimento</th>
            <th className="p-3">Status</th>
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.venda?.cliente?.nome}</td>
              <td className="p-3">#{c.vendaId}</td>
              <td className="p-3">R$ {Number(c.valor).toFixed(2)}</td>
              <td className="p-3">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${badge[c.status]}`}>{c.status}</span>
              </td>
              <td className="p-3">
                {c.status !== 'PAGO' && (
                  <button
                    onClick={() => marcarPago(c.id)}
                    className="text-green-700 hover:underline"
                  >
                    Marcar recebido
                  </button>
                )}
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={6} className="p-3 text-center text-gray-400">
                Nenhuma conta a receber
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
