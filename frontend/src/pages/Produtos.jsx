import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const FORM_INICIAL = { nome: '', unidade: '', estoqueAtual: 0, precoVenda: 0 };

export default function Produtos() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);
  const [modalAjusteAberto, setModalAjusteAberto] = useState(false);
  const [produtoAjuste, setProdutoAjuste] = useState(null);
  const [novaQuantidade, setNovaQuantidade] = useState('');
  const [motivoAjuste, setMotivoAjuste] = useState('');
  const [erroAjuste, setErroAjuste] = useState('');

  async function carregar() {
    const { data } = await api.get('/produtos');
    setLista(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto) {
    setForm({
      nome: produto.nome,
      unidade: produto.unidade,
      estoqueAtual: produto.estoqueAtual,
      precoVenda: produto.precoVenda,
    });
    setEditandoId(produto.id);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    const payload = {
      ...form,
      estoqueAtual: Number(form.estoqueAtual),
      precoVenda: Number(form.precoVenda),
    };
    if (editandoId) {
      await api.put(`/produtos/${editandoId}`, payload);
    } else {
      await api.post('/produtos', payload);
    }
    setModalAberto(false);
    carregar();
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir este produto?')) return;
    await api.delete(`/produtos/${id}`);
    carregar();
  }

  function abrirAjusteEstoque(produto) {
    setProdutoAjuste(produto);
    setNovaQuantidade(Number(produto.estoqueAtual));
    setMotivoAjuste('');
    setErroAjuste('');
    setModalAjusteAberto(true);
  }

  async function salvarAjusteEstoque(e) {
    e.preventDefault();
    setErroAjuste('');
    try {
      await api.post(`/produtos/${produtoAjuste.id}/ajuste-estoque`, {
        quantidade: Number(novaQuantidade),
        motivo: motivoAjuste || undefined,
      });
      setModalAjusteAberto(false);
      carregar();
    } catch (err) {
      setErroAjuste(err.response?.data?.error || 'Erro ao ajustar estoque');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Produtos</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Novo Produto
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Unidade</th>
            <th className="p-3">Estoque</th>
            <th className="p-3">Preço de Venda</th>
            <th className="p-3 w-64">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((p) => (
            <tr key={p.id} className="border-t">
              <td className="p-3">{p.nome}</td>
              <td className="p-3">{p.unidade}</td>
              <td className="p-3">{Number(p.estoqueAtual)}</td>
              <td className="p-3">R$ {Number(p.precoVenda).toFixed(2)}</td>
              <td className="p-3 space-x-2">
                <button onClick={() => abrirEdicao(p)} className="text-blue-600 hover:underline">
                  Editar
                </button>
                <button
                  onClick={() => abrirAjusteEstoque(p)}
                  className="text-amber-600 hover:underline"
                >
                  Ajustar Estoque
                </button>
                <button onClick={() => excluir(p.id)} className="text-red-600 hover:underline">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={5} className="p-3 text-center text-gray-400">
                Nenhum produto cadastrado
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <Modal
        open={modalAberto}
        title={editandoId ? 'Editar Produto' : 'Novo Produto'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar}>
          <label className="block text-sm mb-1">Nome</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Unidade (ex: KG, UN, CX)</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.unidade}
            onChange={(e) => setForm({ ...form, unidade: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Estoque Atual</label>
          <input
            type="number"
            step="0.001"
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.estoqueAtual}
            onChange={(e) => setForm({ ...form, estoqueAtual: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Preço de Venda</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2 mb-6"
            value={form.precoVenda}
            onChange={(e) => setForm({ ...form, precoVenda: e.target.value })}
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
        open={modalAjusteAberto}
        title={`Ajustar Estoque${produtoAjuste ? ` — ${produtoAjuste.nome}` : ''}`}
        onClose={() => setModalAjusteAberto(false)}
      >
        <form onSubmit={salvarAjusteEstoque}>
          {erroAjuste && <div className="mb-3 text-sm text-red-600">{erroAjuste}</div>}
          {produtoAjuste && (
            <div className="text-sm text-gray-500 mb-4">
              Estoque atual: <strong>{Number(produtoAjuste.estoqueAtual)}</strong>{' '}
              {produtoAjuste.unidade}
              <br />
              Informe a nova quantidade — o estoque passará a contar a partir
              deste valor.
            </div>
          )}
          <label className="block text-sm mb-1">Nova quantidade em estoque</label>
          <input
            type="number"
            step="0.001"
            className="w-full border rounded px-3 py-2 mb-4"
            value={novaQuantidade}
            onChange={(e) => setNovaQuantidade(e.target.value)}
            required
          />
          <label className="block text-sm mb-1">Motivo (opcional)</label>
          <input
            className="w-full border rounded px-3 py-2 mb-6"
            value={motivoAjuste}
            onChange={(e) => setMotivoAjuste(e.target.value)}
            placeholder="Ex: contagem física, perda, avaria"
          />
          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
          >
            Confirmar Ajuste
          </button>
        </form>
      </Modal>
    </div>
  );
}
