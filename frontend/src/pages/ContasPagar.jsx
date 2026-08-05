import { useEffect, useState } from 'react';
import { Wallet, Plus, CircleDollarSign, Undo2, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import Modal from '../components/Modal.jsx';
import CompraDetalheModal from '../components/CompraDetalheModal.jsx';
import SortableTh from '../components/SortableTh.jsx';
import { useSort } from '../lib/useSort';
import { STATUS_LABEL } from '../lib/status';

const FORM_INICIAL = { descricao: '', categoria: 'OUTROS', valor: '', vencimento: '' };

const badge = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  ATRASADO: 'bg-red-100 text-red-800',
  PAGO: 'bg-green-100 text-green-800',
};

export default function ContasPagar() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [modalPagarAberto, setModalPagarAberto] = useState(false);
  const [contaPagando, setContaPagando] = useState(null);
  const [dataPagamento, setDataPagamento] = useState('');
  const [compraDetalheId, setCompraDetalheId] = useState(null);

  const { dadosOrdenados, sortKey, sortDir, requestSort } = useSort(
    lista,
    {
      descricao: (c) => c.descricao?.toLowerCase(),
      categoria: (c) => c.categoria,
      valor: (c) => Number(c.valor),
      vencimento: (c) => c.vencimento,
      status: (c) => c.status,
      createdAt: (c) => c.createdAt,
    },
    'createdAt',
    'desc'
  );

  async function carregar() {
    const { data } = await api.get('/contas-pagar');
    setLista(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setForm(FORM_INICIAL);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    await api.post('/contas-pagar', { ...form, valor: Number(form.valor) });
    setModalAberto(false);
    carregar();
  }

  function abrirPagar(conta) {
    setContaPagando(conta);
    setDataPagamento(new Date().toISOString().slice(0, 10));
    setModalPagarAberto(true);
  }

  async function confirmarPagar(e) {
    e.preventDefault();
    await api.post(`/contas-pagar/${contaPagando.id}/pagar`, { dataPagamento });
    setModalPagarAberto(false);
    carregar();
  }

  async function cancelarBaixa(id) {
    if (!confirm('Cancelar a baixa desta conta? Ela voltará a ficar pendente.')) return;
    try {
      await api.post(`/contas-pagar/${id}/cancelar-baixa`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar baixa');
    }
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir esta conta a pagar?')) return;
    try {
      await api.delete(`/contas-pagar/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir conta');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Wallet className="w-6 h-6 text-slate-700" />
          Contas a Pagar
        </h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nova Despesa
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <SortableTh label="Descrição" sortKey="descricao" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3">Compra</th>
            <SortableTh label="Categoria" sortKey="categoria" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Valor" sortKey="valor" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Vencimento" sortKey="vencimento" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3 w-28">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {dadosOrdenados.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.descricao}</td>
              <td className="p-3">
                {c.compraId ? (
                  <button
                    onClick={() => setCompraDetalheId(c.compraId)}
                    className="text-blue-600 hover:underline"
                  >
                    #{c.compraId}
                  </button>
                ) : (
                  '-'
                )}
              </td>
              <td className="p-3">{c.categoria}</td>
              <td className="p-3">R$ {Number(c.valor).toFixed(2)}</td>
              <td className="p-3">{formatarData(c.vencimento)}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${badge[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
              </td>
              <td className="p-3 space-y-1">
                {c.status !== 'PAGO' ? (
                  <button
                    onClick={() => abrirPagar(c)}
                    className="text-green-700 hover:underline inline-flex items-center gap-1"
                  >
                    <CircleDollarSign className="w-3.5 h-3.5" />
                    Marcar pago
                  </button>
                ) : (
                  <button
                    onClick={() => cancelarBaixa(c.id)}
                    className="text-red-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Cancelar baixa
                  </button>
                )}
                {!c.compraId && c.status !== 'PAGO' && (
                  <button
                    onClick={() => excluir(c.id)}
                    className="text-red-600 hover:underline inline-flex items-center gap-1 block"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                )}
              </td>
            </tr>
          ))}
          {dadosOrdenados.length === 0 && (
            <tr>
              <td colSpan={7} className="p-3 text-center text-gray-400">
                Nenhuma conta a pagar cadastrada
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <Modal open={modalAberto} title="Nova Despesa" onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar}>
          <label className="block text-sm mb-1">Descrição</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Categoria</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          >
            <option value="COMBUSTIVEL">Combustível</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="IMPOSTO">Imposto</option>
            <option value="MERCADORIA">Mercadoria</option>
            <option value="OUTROS">Outros</option>
          </select>
          <label className="block text-sm mb-1">Valor</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.valor}
            onChange={(e) => setForm({ ...form, valor: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Vencimento</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 mb-6"
            value={form.vencimento}
            onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
            required
          />
          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
          >
            Salvar
          </button>
        </form>
      </Modal>

      <Modal
        open={modalPagarAberto}
        title="Confirmar Pagamento"
        onClose={() => setModalPagarAberto(false)}
      >
        <form onSubmit={confirmarPagar}>
          {contaPagando && (
            <div className="text-sm text-gray-500 mb-4">
              {contaPagando.descricao} — R$ {Number(contaPagando.valor).toFixed(2)}
            </div>
          )}
          <label className="block text-sm mb-1">Data do Pagamento</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 mb-6"
            value={dataPagamento}
            onChange={(e) => setDataPagamento(e.target.value)}
            required
          />
          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
          >
            Confirmar Pagamento
          </button>
        </form>
      </Modal>

      <CompraDetalheModal compraId={compraDetalheId} onClose={() => setCompraDetalheId(null)} />
    </div>
  );
}
