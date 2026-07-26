import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';

const FORMA_PAGAMENTO_LABEL = {
  FIADO: 'Fiado',
  BOLETO: 'Boleto',
  A_VISTA: 'À Vista',
};

export default function Recibo() {
  const { vendaId } = useParams();
  const [venda, setVenda] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get(`/vendas/${vendaId}`);
        setVenda(data);
      } catch (err) {
        setErro(err.response?.data?.error || 'Erro ao carregar venda');
      }
    }
    carregar();
  }, [vendaId]);

  if (erro) return <div className="p-8 text-red-600">{erro}</div>;
  if (!venda) return <div className="p-8">Carregando...</div>;

  const contaReceber = venda.contasReceber?.[0];
  const total = venda.itens.reduce(
    (acc, i) => acc + Number(i.quantidade) * Number(i.precoUnitario),
    0
  );

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
          <h1 className="text-xl font-bold">{venda.empresa.razaoSocial}</h1>
          <p className="text-gray-600">CNPJ: {venda.empresa.cnpj}</p>
          <p className="text-gray-600">Comprovante de Venda #{venda.id}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="font-semibold">Cliente</div>
          <div>{venda.cliente.nome}</div>
          <div>CNPJ: {venda.cliente.cnpj}</div>
          {venda.cliente.endereco && <div>{venda.cliente.endereco}</div>}
          {venda.cliente.telefone && <div>Tel: {venda.cliente.telefone}</div>}
        </div>
        <div className="text-right">
          <div className="font-semibold">Data da Venda</div>
          <div>{new Date(venda.data).toLocaleDateString('pt-BR')}</div>
          <div className="font-semibold mt-2">Forma de Pagamento</div>
          <div>{FORMA_PAGAMENTO_LABEL[venda.formaPagamento]}</div>
          {contaReceber && (
            <div className="mt-1">
              Vencimento: {new Date(contaReceber.vencimento).toLocaleDateString('pt-BR')}
            </div>
          )}
        </div>
      </div>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Produto</th>
            <th className="py-2 text-right">Qtd.</th>
            <th className="py-2 text-right">Preço Unit.</th>
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {venda.itens.map((item) => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-2">
                {item.produto.nome} ({item.produto.unidade})
              </td>
              <td className="py-2 text-right">{Number(item.quantidade)}</td>
              <td className="py-2 text-right">R$ {Number(item.precoUnitario).toFixed(2)}</td>
              <td className="py-2 text-right">
                R$ {(Number(item.quantidade) * Number(item.precoUnitario)).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="flex justify-end">
        <div className="text-right">
          <div className="text-gray-600">Total</div>
          <div className="text-2xl font-bold">R$ {total.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-16 flex justify-center">
        <div className="w-80 text-center">
          <div className="border-t border-black pt-2">
            Assinatura do Cliente
          </div>
        </div>
      </div>

      <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        Documento gerado em {new Date().toLocaleString('pt-BR')} — sem valor fiscal.
      </div>
    </div>
  );
}
