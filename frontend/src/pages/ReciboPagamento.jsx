import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

export default function ReciboPagamento() {
  const { baixaId } = useParams();
  const [baixa, setBaixa] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get(`/contas-receber/baixas/${baixaId}`);
        setBaixa(data);
      } catch (err) {
        setErro(err.response?.data?.error || 'Erro ao carregar baixa');
      }
    }
    carregar();
  }, [baixaId]);

  if (erro) return <div className="p-8 text-red-600">{erro}</div>;
  if (!baixa) return <div className="p-8">Carregando...</div>;

  const clientesUnicos = [
    ...new Set(baixa.contas.map((c) => c.venda.cliente.nome)),
  ];

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-2xl mx-auto text-sm">
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <div className="flex items-center gap-4 border-b-2 border-black pb-4 mb-4">
        <img src="/logo-scolaro.png" alt="Scolaro Distribuidora" className="h-20 w-auto" />
        <div>
          <h1 className="text-xl font-bold">Recibo de Pagamento</h1>
          <p className="text-gray-600">Código da baixa: {baixa.codigo}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="font-semibold">Cliente(s)</div>
          <div>{clientesUnicos.join(', ')}</div>
        </div>
        <div className="text-right">
          <div className="font-semibold">Data do Recebimento</div>
          <div>{new Date(baixa.data).toLocaleDateString('pt-BR')}</div>
        </div>
      </div>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Cliente</th>
            <th className="py-2">Venda</th>
            <th className="py-2">Empresa</th>
            <th className="py-2 text-right">Valor Recebido</th>
          </tr>
        </thead>
        <tbody>
          {baixa.contas.map((conta) => (
            <tr key={conta.id} className="border-b border-gray-300">
              <td className="py-2">{conta.venda.cliente.nome}</td>
              <td className="py-2">#{conta.vendaId}</td>
              <td className="py-2">{conta.venda.empresa?.razaoSocial}</td>
              <td className="py-2 text-right">R$ {Number(conta.valor).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-gray-600">Total Recebido</div>
          <div className="text-2xl font-bold">R$ {Number(baixa.valorTotal).toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-16 flex justify-center">
        <div className="w-80 text-center">
          <div className="border-t border-black pt-2">Assinatura</div>
        </div>
      </div>

      <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        Documento gerado em {new Date().toLocaleString('pt-BR')} — sem valor fiscal.
      </div>
    </div>
  );
}
