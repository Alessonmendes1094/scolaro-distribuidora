import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const ITEM_VAZIO = { produtoId: '', quantidade: '', precoUnitario: '' };

export default function Vendas() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [clienteId, setClienteId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState('A_VISTA');
  const [vencimento, setVencimento] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState('');
  const [ultimaVenda, setUltimaVenda] = useState(null);

  async function carregar() {
    const [vendasRes, clientesRes, produtosRes] = await Promise.all([
      api.get('/vendas'),
      api.get('/clientes'),
      api.get('/produtos'),
    ]);
    setLista(vendasRes.data);
    setClientes(clientesRes.data);
    setProdutos(produtosRes.data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setClienteId('');
    setData(new Date().toISOString().slice(0, 10));
    setFormaPagamento('A_VISTA');
    setVencimento('');
    setItens([{ ...ITEM_VAZIO }]);
    setErro('');
    setUltimaVenda(null);
    setModalAberto(true);
  }

  async function selecionarCliente(id) {
    setClienteId(id);
    setUltimaVenda(null);
    if (!id) return;
    const { data } = await api.get(`/vendas/ultima-por-cliente/${id}`);
    setUltimaVenda(data);
  }

  function usarItensDaUltimaVenda() {
    if (!ultimaVenda) return;
    setItens(
      ultimaVenda.itens.map((i) => ({
        produtoId: String(i.produtoId),
        quantidade: Number(i.quantidade),
        precoUnitario: Number(i.precoUnitario),
      }))
    );
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

  function selecionarProduto(index, produtoId) {
    const produto = produtos.find((p) => String(p.id) === String(produtoId));
    const novosItens = [...itens];
    novosItens[index].produtoId = produtoId;
    novosItens[index].precoUnitario = produto ? Number(produto.precoVenda) : '';
    setItens(novosItens);
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      const { data: vendaCriada } = await api.post('/vendas', {
        clienteId: Number(clienteId),
        data,
        formaPagamento,
        vencimento: formaPagamento !== 'A_VISTA' ? vencimento || undefined : undefined,
        itens: itens.map((i) => ({
          produtoId: Number(i.produtoId),
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
        })),
      });
      setModalAberto(false);
      carregar();
      window.open(`/recibo/${vendaCriada.id}`, '_blank');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar venda');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Vendas</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Nova Venda
        </button>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Data</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Forma Pagamento</th>
            <th className="p-3">Itens</th>
            <th className="p-3">Total</th>
            <th className="p-3 w-24">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((v) => {
            const total = v.itens.reduce(
              (acc, i) => acc + Number(i.quantidade) * Number(i.precoUnitario),
              0
            );
            return (
              <tr key={v.id} className="border-t">
                <td className="p-3">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">{v.cliente?.nome}</td>
                <td className="p-3">{v.formaPagamento}</td>
                <td className="p-3">
                  {v.itens.map((i) => `${i.produto.nome} (${Number(i.quantidade)})`).join(', ')}
                </td>
                <td className="p-3">R$ {total.toFixed(2)}</td>
                <td className="p-3">
                  <button
                    onClick={() => window.open(`/recibo/${v.id}`, '_blank')}
                    className="text-blue-600 hover:underline"
                  >
                    Imprimir
                  </button>
                </td>
              </tr>
            );
          })}
          {lista.length === 0 && (
            <tr>
              <td colSpan={6} className="p-3 text-center text-gray-400">
                Nenhuma venda registrada
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal open={modalAberto} title="Nova Venda" onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar}>
          {erro && <div className="mb-3 text-sm text-red-600">{erro}</div>}
          <label className="block text-sm mb-1">Cliente</label>
          <select
            className="w-full border rounded px-3 py-2 mb-2"
            value={clienteId}
            onChange={(e) => selecionarCliente(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>

          {clienteId && ultimaVenda === null && (
            <div className="text-xs text-gray-400 mb-4">
              Este cliente ainda não possui vendas anteriores.
            </div>
          )}

          {ultimaVenda && (
            <div className="bg-gray-50 border rounded p-3 mb-4 text-sm">
              <div className="flex justify-between items-center mb-2">
                <span className="font-medium">
                  Última venda ({new Date(ultimaVenda.data).toLocaleDateString('pt-BR')})
                </span>
                <button
                  type="button"
                  onClick={usarItensDaUltimaVenda}
                  className="text-blue-600 hover:underline text-xs"
                >
                  Usar estes itens
                </button>
              </div>
              <ul className="space-y-1">
                {ultimaVenda.itens.map((i) => (
                  <li key={i.id} className="flex justify-between text-gray-600">
                    <span>
                      {i.produto.nome} ({Number(i.quantidade)} {i.produto.unidade})
                    </span>
                    <span>R$ {Number(i.precoUnitario).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <label className="block text-sm mb-1">Data</label>
          <input
            type="date"
            className="w-full border rounded px-3 py-2 mb-4"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />

          <label className="block text-sm mb-1">Forma de Pagamento</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={formaPagamento}
            onChange={(e) => setFormaPagamento(e.target.value)}
          >
            <option value="A_VISTA">À Vista</option>
            <option value="FIADO">Fiado</option>
            <option value="BOLETO">Boleto</option>
          </select>

          {formaPagamento !== 'A_VISTA' && (
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
                onChange={(e) => selecionarProduto(index, e.target.value)}
                required
              >
                <option value="">Produto...</option>
                {produtos.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nome} (estoque: {Number(p.estoqueAtual)})
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
                placeholder="Preço Unit."
                className="col-span-3 border rounded px-2 py-1.5 text-sm"
                value={item.precoUnitario}
                onChange={(e) => atualizarItem(index, 'precoUnitario', e.target.value)}
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
            Salvar Venda
          </button>
        </form>
      </Modal>
    </div>
  );
}
