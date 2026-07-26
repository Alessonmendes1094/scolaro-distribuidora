import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from './Modal.jsx';
import { STATUS_LABEL, STATUS_BADGE } from '../lib/status';
import { FORMA_PAGAMENTO_LABEL } from '../lib/formaPagamento';

export default function CompraDetalheModal({ compraId, onClose }) {
  const [compra, setCompra] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!compraId) return;
    setCompra(null);
    setErro('');
    api
      .get(`/compras/${compraId}`)
      .then((res) => setCompra(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Erro ao carregar compra'));
  }, [compraId]);

  const total = compra
    ? compra.itens.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.custoUnitario), 0)
    : 0;

  return (
    <Modal open={!!compraId} title={`Compra #${compraId}`} onClose={onClose}>
      {erro && <div className="text-sm text-red-600 mb-3">{erro}</div>}
      {!compra && !erro && <div className="text-sm text-gray-500">Carregando...</div>}

      {compra && (
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-gray-500">Fornecedor</div>
              <div className="font-medium">{compra.fornecedor?.nome}</div>
            </div>
            <div>
              <div className="text-gray-500">Nota Fiscal</div>
              <div className="font-medium">{compra.comNota ? 'Sim' : 'Não'}</div>
            </div>
            <div>
              <div className="text-gray-500">Data</div>
              <div className="font-medium">{new Date(compra.data).toLocaleDateString('pt-BR')}</div>
            </div>
            <div>
              <div className="text-gray-500">Forma de Pagamento</div>
              <div className="font-medium">{FORMA_PAGAMENTO_LABEL[compra.formaPagamento]}</div>
            </div>
          </div>

          {compra.contasPagar && compra.contasPagar.length > 0 && (
            <div className="mb-4">
              <div className="text-gray-500 mb-1">Situação Financeira</div>
              <div className="space-y-1">
                {compra.contasPagar.map((c) => (
                  <div key={c.id} className="flex justify-between items-center">
                    <span>
                      R$ {Number(c.valor).toFixed(2)} — venc.{' '}
                      {new Date(c.vencimento).toLocaleDateString('pt-BR')}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs ${STATUS_BADGE[c.status]}`}>
                      {STATUS_LABEL[c.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <table className="w-full text-sm mb-4">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-1">Produto</th>
                <th className="py-1 text-right">Qtd.</th>
                <th className="py-1 text-right">Custo</th>
                <th className="py-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {compra.itens.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-1">{item.produto.nome}</td>
                  <td className="py-1 text-right">{Number(item.quantidade)}</td>
                  <td className="py-1 text-right">R$ {Number(item.custoUnitario).toFixed(2)}</td>
                  <td className="py-1 text-right">
                    R$ {(Number(item.quantidade) * Number(item.custoUnitario)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center font-semibold mb-4">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          <button
            onClick={() => window.open(`/recibo-compra/${compra.id}`, '_blank')}
            className="w-full bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
          >
            Imprimir / Baixar Recibo
          </button>
        </div>
      )}
    </Modal>
  );
}
