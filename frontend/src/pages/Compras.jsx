import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ShoppingCart, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import Modal from '../components/Modal.jsx';
import CompraDetalheModal from '../components/CompraDetalheModal.jsx';
import SortableTh from '../components/SortableTh.jsx';
import { useSort } from '../lib/useSort';
import { FORMA_PAGAMENTO_LABEL, FORMA_PAGAMENTO_OPCOES, FORMAS_PAGAMENTO_IMEDIATAS } from '../lib/formaPagamento';

function totalCompra(c) {
  return c.itens.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.custoUnitario), 0);
}

const ITEM_VAZIO = { produtoId: '', quantidade: '', custoUnitario: '' };

export default function Compras() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lista, setLista] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [fornecedorId, setFornecedorId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [comNota, setComNota] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('BOLETO');
  const [vencimento, setVencimento] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [compraDetalheId, setCompraDetalheId] = useState(null);

  const { dadosOrdenados, sortKey, sortDir, requestSort } = useSort(
    lista,
    {
      id: (c) => c.id,
      data: (c) => c.data,
      fornecedor: (c) => c.fornecedor?.nome?.toLowerCase(),
      comNota: (c) => c.comNota,
      formaPagamento: (c) => c.formaPagamento,
      total: (c) => totalCompra(c),
    },
    'data',
    'desc'
  );

  async function carregar() {
    const [comprasRes, fornecedoresRes, produtosRes] = await Promise.all([
      api.get('/compras'),
      api.get('/fornecedores'),
      api.get('/produtos'),
    ]);
    setLista(comprasRes.data);
    setFornecedores(fornecedoresRes.data);
    setProdutos(produtosRes.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  useEffect(() => {
    if (searchParams.get('nova')) {
      abrirNovo();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams]);

  function abrirNovo() {
    setEditandoId(null);
    setFornecedorId('');
    setData(new Date().toISOString().slice(0, 10));
    setComNota(false);
    setFormaPagamento('BOLETO');
    setVencimento('');
    setItens([{ ...ITEM_VAZIO }]);
    setErro('');
    setModalAberto(true);
  }

  function abrirEdicao(compra) {
    setEditandoId(compra.id);
    setFornecedorId(String(compra.fornecedorId));
    setData(new Date(compra.data).toISOString().slice(0, 10));
    setComNota(compra.comNota);
    setFormaPagamento(compra.formaPagamento);
    setVencimento(compra.vencimento ? new Date(compra.vencimento).toISOString().slice(0, 10) : '');
    setItens(
      compra.itens.map((i) => ({
        produtoId: String(i.produtoId),
        quantidade: Number(i.quantidade),
        custoUnitario: Number(i.custoUnitario),
      }))
    );
    setErro('');
    setModalAberto(true);
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir esta compra? O estoque será estornado.')) return;
    try {
      await api.delete(`/compras/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir compra');
    }
  }

  function atualizarItem(index, campo, valor) {
    const novosItens = [...itens];
    novosItens[index][campo] = valor;
    setItens(novosItens);
  }

  function adicionarItem() {
    setItens([...itens, { ...ITEM_VAZIO }]);
  }

  function removerItem(index) {
    setItens(itens.filter((_, i) => i !== index));
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      const payload = {
        fornecedorId: Number(fornecedorId),
        data,
        comNota,
        formaPagamento,
        vencimento: !FORMAS_PAGAMENTO_IMEDIATAS.includes(formaPagamento)
          ? vencimento || undefined
          : undefined,
        itens: itens.map((i) => ({
          produtoId: Number(i.produtoId),
          quantidade: Number(i.quantidade),
          custoUnitario: Number(i.custoUnitario),
        })),
      };
      if (editandoId) {
        await api.put(`/compras/${editandoId}`, payload);
      } else {
        await api.post('/compras', payload);
      }
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar compra');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingCart className="w-6 h-6 text-slate-700" />
          Compras
        </h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nova Compra
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <SortableTh label="ID" sortKey="id" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Data" sortKey="data" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Fornecedor" sortKey="fornecedor" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Nota Fiscal" sortKey="comNota" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Pagamento" sortKey="formaPagamento" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3">Itens</th>
            <SortableTh label="Total" sortKey="total" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {dadosOrdenados.map((c) => {
            const total = totalCompra(c);
            const contaPaga = c.contasPagar?.some((cp) => cp.status === 'PAGO');
            return (
              <tr key={c.id} className="border-t">
                <td className="p-3">
                  <button
                    onClick={() => setCompraDetalheId(c.id)}
                    className="text-blue-600 hover:underline"
                  >
                    #{c.id}
                  </button>
                </td>
                <td className="p-3">{formatarData(c.data)}</td>
                <td className="p-3">{c.fornecedor?.nome}</td>
                <td className="p-3">{c.comNota ? 'Sim' : 'Não'}</td>
                <td className="p-3">
                  {FORMA_PAGAMENTO_LABEL[c.formaPagamento]}
                  {!FORMAS_PAGAMENTO_IMEDIATAS.includes(c.formaPagamento) && c.vencimento && (
                    <div className="text-xs text-gray-500">
                      Venc.: {formatarData(c.vencimento)}
                    </div>
                  )}
                </td>
                <td className="p-3">
                  {c.itens.map((i) => `${i.produto.nome} (${Number(i.quantidade)})`).join(', ')}
                </td>
                <td className="p-3">R$ {total.toFixed(2)}</td>
                <td className="p-3 space-x-2">
                  {contaPaga ? (
                    <span className="text-gray-400 text-xs">Conta já paga</span>
                  ) : (
                    <>
                      <button
                        onClick={() => abrirEdicao(c)}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(c.id)}
                        className="text-red-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Excluir
                      </button>
                    </>
                  )}
                </td>
              </tr>
            );
          })}
          {dadosOrdenados.length === 0 && (
            <tr>
              <td colSpan={8} className="p-3 text-center text-gray-400">
                Nenhuma compra registrada
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <Modal
        open={modalAberto}
        title={editandoId ? 'Editar Compra' : 'Nova Compra'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar}>
          {erro && <div className="mb-3 text-sm text-red-600">{erro}</div>}
          <label className="block text-sm mb-1">Fornecedor</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={fornecedorId}
            onChange={(e) => setFornecedorId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {fornecedores.map((f) => (
              <option key={f.id} value={f.id}>
                {f.nome}
              </option>
            ))}
          </select>

          <label className="block text-sm mb-1">Data</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 mb-4"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />

          <label className="flex items-center gap-2 mb-4 text-sm">
            <input type="checkbox" checked={comNota} onChange={(e) => setComNota(e.target.checked)} />
            Compra com nota fiscal
          </label>

          <label className="block text-sm mb-1">Forma de Pagamento</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          >
            {FORMA_PAGAMENTO_OPCOES.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>

          {!FORMAS_PAGAMENTO_IMEDIATAS.includes(formaPagamento) && (
            <>
              <label className="block text-sm mb-1">Vencimento (opcional, padrão 30 dias)</label>
              <input
                type="date"
                className="w-full border rounded px-3 py-2 mb-4"
                value={vencimento}
                onChange={(e) => setVencimento(e.target.value)}
              />
            </>
          )}

          <div className="mb-2 font-medium text-sm">Itens</div>
          {itens.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-2 mb-2 items-center">
              <select
                className="col-span-5 border rounded px-2 py-1.5 text-sm"
                value={item.produtoId}
                onChange={(e) => atualizarItem(index, 'produtoId', e.target.value)}
                required
              >
                <option value="">Produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome}
                  </option>
                ))}
              </select>
              <input
                type="number"
                step="0.001"
                placeholder="Qtd"
                className="col-span-3 border rounded px-2 py-1.5 text-sm"
                value={item.quantidade}
                onChange={(e) => atualizarItem(index, 'quantidade', e.target.value)}
                required
              />
              <input
                type="number"
                step="0.01"
                placeholder="Custo Unit."
                className="col-span-3 border rounded px-2 py-1.5 text-sm"
                value={item.custoUnitario}
                onChange={(e) => atualizarItem(index, 'custoUnitario', e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => removerItem(index)}
                className="col-span-1 text-red-600"
              >
                ✕
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={adicionarItem}
            className="text-sm text-blue-600 hover:underline mb-4"
          >
            + Adicionar item
          </button>

          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
          >
            {editandoId ? 'Salvar Alterações' : 'Salvar Compra'}
          </button>
        </form>
      </Modal>

      <CompraDetalheModal compraId={compraDetalheId} onClose={() => setCompraDetalheId(null)} />
    </div>
  );
}
