import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const ITEM_VAZIO = { produtoId: '', quantidade: '', precoUnitario: '', custoUnitario: null };

export default function Vendas() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [formaPagamento, setFormaPagamento] = useState('A_VISTA');
  const [vencimento, setVencimento] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState('');
  const [ultimaVenda, setUltimaVenda] = useState(null);

  async function carregar() {
    const [vendasRes, clientesRes, produtosRes, empresasRes] = await Promise.all([
      api.get('/vendas', { params: empresaFiltro ? { empresaId: empresaFiltro } : {} }),
      api.get('/clientes'),
      api.get('/produtos'),
      api.get('/empresas'),
    ]);
    setLista(vendasRes.data);
    setClientes(clientesRes.data);
    setProdutos(produtosRes.data);
    setEmpresas(empresasRes.data);
  }

  useEffect(() => {
    carregar();
  }, [empresaFiltro]);

  function abrirNovo() {
    setEmpresaId(empresas[0]?.id ? String(empresas[0].id) : '');
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

  async function usarItensDaUltimaVenda() {
    if (!ultimaVenda) return;
    const novosItens = ultimaVenda.itens.map((i) => ({
      produtoId: String(i.produtoId),
      quantidade: Number(i.quantidade),
      precoUnitario: Number(i.precoUnitario),
      custoUnitario: null,
    }));
    setItens(novosItens);

    const custos = await Promise.all(
      novosItens.map((i) => api.get(`/produtos/${i.produtoId}/ultimo-custo`))
    );
    setItens((atual) =>
      atual.map((item, idx) => ({
        ...item,
        custoUnitario: custos[idx]?.data.custoUnitario ?? null,
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

  async function selecionarProduto(index, produtoId) {
    const produto = produtos.find((p) => String(p.id) === String(produtoId));
    const novosItens = [...itens];
    novosItens[index].produtoId = produtoId;
    novosItens[index].precoUnitario = produto ? Number(produto.precoVenda) : '';
    novosItens[index].custoUnitario = null;
    setItens(novosItens);

    if (!produtoId) return;
    const { data } = await api.get(`/produtos/${produtoId}/ultimo-custo`);
    setItens((atual) => {
      const copia = [...atual];
      if (copia[index]) copia[index].custoUnitario = data.custoUnitario;
      return copia;
    });
  }

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    try {
      const { data: vendaCriada } = await api.post('/vendas', {
        empresaId: Number(empresaId),
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

      <div className="mb-4">
        <label className="block text-sm mb-1">Filtrar por Empresa</label>
        <select
          className="border rounded px-3 py-2 text-sm"
          value={empresaFiltro}
          onChange={(e) => setEmpresaFiltro(e.target.value)}
        >
          <option value="">Todas as empresas</option>
          {empresas.map((emp) => (
            <option key={emp.id} value={emp.id}>
              {emp.razaoSocial}
            </option>
          ))}
        </select>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">ID</th>
            <th className="p-3">Empresa</th>
            <th className="p-3">Data</th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Forma Pagamento</th>
            <th className="p-3">Itens</th>
            <th className="p-3">Total</th>
            <th className="p-3">Lucro</th>
            <th className="p-3 w-24">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((v) => {
            const total = v.itens.reduce(
              (acc, i) => acc + Number(i.quantidade) * Number(i.precoUnitario),
              0
            );
            const lucro = v.lucroTotal ?? 0;
            return (
              <tr key={v.id} className="border-t">
                <td className="p-3">#{v.id}</td>
                <td className="p-3">{v.empresa?.razaoSocial}</td>
                <td className="p-3">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                <td className="p-3">{v.cliente?.nome}</td>
                <td className="p-3">{v.formaPagamento}</td>
                <td className="p-3">
                  {v.itens.map((i) => `${i.produto.nome} (${Number(i.quantidade)})`).join(', ')}
                </td>
                <td className="p-3">R$ {total.toFixed(2)}</td>
                <td className={`p-3 font-medium ${lucro < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  R$ {lucro.toFixed(2)}
                </td>
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
              <td colSpan={9} className="p-3 text-center text-gray-400">
                Nenhuma venda registrada
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal open={modalAberto} title="Nova Venda" onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar}>
          {erro && <div className="mb-3 text-sm text-red-600">{erro}</div>}

          <label className="block text-sm mb-1">Empresa (venda feita por)</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
            required
          >
            <option value="">Selecione...</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.razaoSocial}
              </option>
            ))}
          </select>

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
          {itens.map((item, index) => {
            const temCusto = item.custoUnitario !== null && item.custoUnitario !== undefined;
            const lucroUnitario = temCusto
              ? Number(item.precoUnitario || 0) - Number(item.custoUnitario)
              : null;
            const lucroItem = lucroUnitario !== null ? lucroUnitario * Number(item.quantidade || 0) : null;

            return (
              <div key={index} className="mb-2">
                <div className="grid grid-cols-12 gap-2 items-center">
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
                {item.produtoId && (
                  <div className="text-xs text-gray-500 mt-1 pl-1">
                    {temCusto ? (
                      <>
                        Custo última compra: R$ {Number(item.custoUnitario).toFixed(2)} — Lucro
                        {lucroItem !== null && (
                          <span className={lucroItem < 0 ? 'text-red-600 font-medium' : 'text-green-700 font-medium'}>
                            {' '}
                            R$ {lucroItem.toFixed(2)}
                          </span>
                        )}
                      </>
                    ) : (
                      'Sem histórico de compra deste produto para calcular lucro'
                    )}
                  </div>
                )}
              </div>
            );
          })}
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
