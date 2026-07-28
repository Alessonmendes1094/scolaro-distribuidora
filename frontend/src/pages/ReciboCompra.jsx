import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import { FORMA_PAGAMENTO_LABEL } from '../lib/formaPagamento';
import Logo from '../components/Logo.jsx';

export default function ReciboCompra() {
  const { compraId } = useParams();
  const [compra, setCompra] = useState(null);
  const [erro, setErro] = useState('');
  const [exibirFormaPagamento, setExibirFormaPagamento] = useState(true);

  useEffect(() => {
    async function carregar() {
      try {
        const { data } = await api.get(`/compras/${compraId}`);
        setCompra(data);
      } catch (err) {
        setErro(err.response?.data?.error || 'Erro ao carregar compra');
      }
    }
    carregar();
  }, [compraId]);

  if (erro) return <div className="p-8 text-red-600">{erro}</div>;
  if (!compra) return <div className="p-8">Carregando...</div>;

  const contaPagar = compra.contasPagar?.[0];
  const total = compra.itens.reduce(
    (acc, i) => acc + Number(i.quantidade) * Number(i.custoUnitario),
    0
  );

  function handleImprimir() {
    const mostrar = confirm('Deseja exibir a forma de pagamento no recibo impresso?');
    setExibirFormaPagamento(mostrar);
    setTimeout(() => window.print(), 100);
  }

  return (
    <div className="min-h-screen bg-white text-black p-4 max-w-2xl mx-auto text-xs recibo-meia-folha">
      <style>{`@media print { @page { size: 210mm 148.5mm; margin: 8mm; } }`}</style>
      <div className="no-print flex justify-end mb-4">
        <button
          onClick={handleImprimir}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <div className="flex items-center gap-3 border-b-2 border-black pb-2 mb-2">
        <Logo className="h-12 w-auto" />
        <div>
          <h1 className="text-xl font-bold">Comprovante de Compra #{compra.id}</h1>
          <p className="text-gray-600">Nota Fiscal: {compra.comNota ? 'Sim' : 'Não'}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <div className="font-semibold">Fornecedor</div>
          <div>{compra.fornecedor.nome}</div>
          {compra.fornecedor.telefone && <div>Tel: {compra.fornecedor.telefone}</div>}
        </div>
        <div className="text-right">
          <div className="font-semibold">Data da Compra</div>
          <div>{formatarData(compra.data)}</div>
          {exibirFormaPagamento && (
            <>
              <div className="font-semibold mt-2">Forma de Pagamento</div>
              <div>{FORMA_PAGAMENTO_LABEL[compra.formaPagamento]}</div>
              {contaPagar && (
                <div className="mt-1">
                  Vencimento: {formatarData(contaPagar.vencimento)}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b-2 border-black text-left">
            <th className="py-2">Produto</th>
            <th className="py-2 text-right">Qtd.</th>
            <th className="py-2 text-right">Custo Unit.</th>
            <th className="py-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {compra.itens.map((item) => (
            <tr key={item.id} className="border-b border-gray-300">
              <td className="py-2">
                {item.produto.nome} ({item.produto.unidade})
              </td>
              <td className="py-2 text-right">{Number(item.quantidade)}</td>
              <td className="py-2 text-right">R$ {Number(item.custoUnitario).toFixed(2)}</td>
              <td className="py-2 text-right">
                R$ {(Number(item.quantidade) * Number(item.custoUnitario)).toFixed(2)}
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

      <div className="mt-3 pt-2 border-t border-gray-300 text-[10px] text-gray-500 text-center">
        Documento gerado em {new Date().toLocaleString('pt-BR')} — sem valor fiscal.
      </div>
    </div>
  );
}
