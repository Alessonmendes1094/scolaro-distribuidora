import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import Modal from './Modal.jsx';
import { STATUS_LABEL, STATUS_BADGE } from '../lib/status';
import { FORMA_PAGAMENTO_LABEL } from '../lib/formaPagamento';

export default function VendaDetalheModal({ vendaId, onClose }) {
  const navigate = useNavigate();
  const [venda, setVenda] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    if (!vendaId) return;
    setVenda(null);
    setErro('');
    api
      .get(`/vendas/${vendaId}`)
      .then((res) => setVenda(res.data))
      .catch((err) => setErro(err.response?.data?.error || 'Erro ao carregar venda'));
  }, [vendaId]);

  const total = venda
    ? venda.itens.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.precoUnitario), 0)
    : 0;

  const podeEditar = venda && !venda.contasReceber?.some((c) => c.status === 'PAGO');

  function editarVenda() {
    navigate(`/vendas?editar=${venda.id}`);
    onClose();
  }

  return (
    <Modal open={!!vendaId} title={`Venda #${vendaId}`} onClose={onClose}>
      {erro && <div className="text-sm text-red-600 mb-3">{erro}</div>}
      {!venda && !erro && <div className="text-sm text-gray-500">Carregando...</div>}

      {venda && (
        <div className="text-sm">
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <div className="text-gray-500">Empresa</div>
              <div className="font-medium">{venda.empresa?.razaoSocial}</div>
            </div>
            <div>
              <div className="text-gray-500">Cliente</div>
              <div className="font-medium">{venda.cliente?.nome}</div>
            </div>
            <div>
              <div className="text-gray-500">Data</div>
              <div className="font-medium">{formatarData(venda.data)}</div>
            </div>
            <div>
              <div className="text-gray-500">Forma de Pagamento</div>
              <div className="font-medium">{FORMA_PAGAMENTO_LABEL[venda.formaPagamento]}</div>
            </div>
          </div>

          {venda.contasReceber && venda.contasReceber.length > 0 && (
            <div className="mb-4">
              <div className="text-gray-500 mb-1">Situação Financeira</div>
              <div className="space-y-1">
                {venda.contasReceber.map((c) => (
                  <div key={c.id} className="flex justify-between items-center">
                    <span>
                      R$ {Number(c.valor).toFixed(2)} — venc.{' '}
                      {formatarData(c.vencimento)}
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
                <th className="py-1 text-right">Preço</th>
                <th className="py-1 text-right">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              {venda.itens.map((item) => (
                <tr key={item.id} className="border-t">
                  <td className="py-1">{item.produto.nome}</td>
                  <td className="py-1 text-right">{Number(item.quantidade)}</td>
                  <td className="py-1 text-right">R$ {Number(item.precoUnitario).toFixed(2)}</td>
                  <td className="py-1 text-right">
                    R$ {(Number(item.quantidade) * Number(item.precoUnitario)).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex justify-between items-center font-semibold mb-4">
            <span>Total</span>
            <span>R$ {total.toFixed(2)}</span>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => window.open(`/recibo/${venda.id}`, '_blank')}
              className="flex-1 bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
            >
              Imprimir / Baixar Recibo
            </button>
            {podeEditar && (
              <button
                onClick={editarVenda}
                className="flex-1 bg-white border border-slate-900 text-slate-900 rounded px-3 py-2 hover:bg-gray-50"
              >
                Editar Venda
              </button>
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}
