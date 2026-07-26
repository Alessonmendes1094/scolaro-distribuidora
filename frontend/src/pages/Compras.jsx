import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const ITEM_VAZIO = { produtoId: '', quantidade: '', custoUnitario: '' };

export default function Compras() {
  const [lista, setLista] = useState([]);
  const [fornecedores, setFornecedores] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [fornecedorId, setFornecedorId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [comNota, setComNota] = useState(false);
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState('');

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

  function abrirNovo() {
    setFornecedorId('');
    setData(new Date().toISOString().slice(0, 10));
    setComNota(false);
    setItens([{ ...ITEM_VAZIO }]);
    setErro('');
    setModalAberto(true);
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
      await api.post('/compras', {
        fornecedorId: Number(fornecedorId),
        data,
        comNota,
        itens: itens.map((i) => ({
          produtoId: Number(i.produtoId),
          quantidade: Number(i.quantidade),
          custoUnitario: Number(i.custoUnitario),
        })),
      });
      setModalAberto(false);
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar compra');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Compras</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Nova Compra
        </button>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Data</th>
            <th className="p-3">Fornecedor</th>
            <th className="p-3">Nota Fiscal</th>
            <th className="p-3">Itens</th>
            <th className="p-3">Total</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((c) => {
            const total = c.itens.reduce(
              (acc, i) => acc + Number(i.quantidade) * Number(i.custoUnitario),
              0
            );
            return (
              <tr key={c.id} className="border-t">
                <td className="p-3">{new Date(c.data).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">{c.fornecedor?.nome}</td>
                <td className="p-3">{c.comNota ? 'Sim' : 'Não'}</td>
                <td className="p-3">
                  {c.itens.map((i) => `${i.produto.nome} (${Number(i.quantidade)})`).join(', ')}
                </td>
                <td className="p-3">R$ {total.toFixed(2)}</td>
              </tr>
            );
          })}
          {lista.length === 0 && (
            <tr>
              <td colSpan={5} className="p-3 text-center text-gray-400">
                Nenhuma compra registrada
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal open={modalAberto} title="Nova Compra" onClose={() => setModalAberto(false)}>
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
            Salvar Compra
          </button>
        </form>
      </Modal>
    </div>
  );
}
