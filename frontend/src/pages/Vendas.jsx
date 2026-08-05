import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Receipt, Plus, Pencil, Trash2, Printer } from 'lucide-react';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import Modal from '../components/Modal.jsx';
import VendaDetalheModal from '../components/VendaDetalheModal.jsx';
import SortableTh from '../components/SortableTh.jsx';
import { useSort } from '../lib/useSort';
import { FORMA_PAGAMENTO_LABEL, FORMA_PAGAMENTO_OPCOES, FORMAS_PAGAMENTO_IMEDIATAS } from '../lib/formaPagamento';
import { unidadeParaCaixa, caixaParaUnidade } from '../lib/caixa';

const ITEM_VAZIO = {
  produtoId: '',
  quantidade: '',
  quantidadeCaixa: '',
  precoUnitario: '',
  custoUnitario: null,
  lucroManual: null,
};

function totalVenda(v) {
  return v.itens.reduce((acc, i) => acc + Number(i.quantidade) * Number(i.precoUnitario), 0);
}

export default function Vendas() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [empresas, setEmpresas] = useState([]);
  const [empresaFiltro, setEmpresaFiltro] = useState('');
  const [modalAberto, setModalAberto] = useState(false);
  const [empresaId, setEmpresaId] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [data, setData] = useState(() => new Date().toISOString().slice(0, 10));
  const [comNota, setComNota] = useState(false);
  const [formaPagamento, setFormaPagamento] = useState('A_VISTA');
  const [vencimento, setVencimento] = useState('');
  const [itens, setItens] = useState([{ ...ITEM_VAZIO }]);
  const [erro, setErro] = useState('');
  const [ultimaVenda, setUltimaVenda] = useState(null);
  const [editandoId, setEditandoId] = useState(null);
  const [vendaDetalheId, setVendaDetalheId] = useState(null);

  const { dadosOrdenados, sortKey, sortDir, requestSort } = useSort(
    lista,
    {
      id: (v) => v.id,
      empresa: (v) => v.empresa?.razaoSocial?.toLowerCase(),
      data: (v) => v.data,
      cliente: (v) => v.cliente?.nome?.toLowerCase(),
      formaPagamento: (v) => v.formaPagamento,
      comNota: (v) => v.comNota,
      total: (v) => totalVenda(v),
      lucro: (v) => v.lucroTotal ?? 0,
    },
    'data',
    'desc'
  );

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

  useEffect(() => {
    if (searchParams.get('nova') && empresas.length > 0) {
      abrirNovo();
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, empresas]);

  useEffect(() => {
    const editarId = searchParams.get('editar');
    if (editarId && empresas.length > 0) {
      api.get(`/vendas/${editarId}`).then((res) => {
        abrirEdicao(res.data);
      });
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, empresas]);

  function abrirNovo() {
    setEditandoId(null);
    setEmpresaId(empresas[0]?.id ? String(empresas[0].id) : '');
    setClienteId('');
    setData(new Date().toISOString().slice(0, 10));
    setComNota(false);
    setFormaPagamento('A_VISTA');
    setVencimento('');
    setItens([{ ...ITEM_VAZIO }]);
    setErro('');
    setUltimaVenda(null);
    setModalAberto(true);
  }

  function abrirEdicao(venda) {
    setEditandoId(venda.id);
    setEmpresaId(String(venda.empresaId));
    setClienteId(String(venda.clienteId));
    setData(new Date(venda.data).toISOString().slice(0, 10));
    setComNota(venda.comNota);
    setFormaPagamento(venda.formaPagamento);
    const contaReceber = venda.contasReceber?.[0];
    setVencimento(
      contaReceber ? new Date(contaReceber.vencimento).toISOString().slice(0, 10) : ''
    );
    setItens(
      venda.itens.map((i) => ({
        produtoId: String(i.produtoId),
        quantidade: Number(i.quantidade),
        quantidadeCaixa: unidadeParaCaixa(i.quantidade, i.produto?.unidadesPorCaixa),
        precoUnitario: Number(i.precoUnitario),
        custoUnitario: i.custoUnitario !== null ? Number(i.custoUnitario) : null,
        lucroManual: i.lucroManual !== null && i.lucroManual !== undefined ? Number(i.lucroManual) : null,
      }))
    );
    setErro('');
    setUltimaVenda(null);
    setModalAberto(true);
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir esta venda? O estoque será estornado.')) return;
    try {
      await api.delete(`/vendas/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir venda');
    }
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
    const novosItens = ultimaVenda.itens.map((i) => {
      const produto = produtos.find((p) => String(p.id) === String(i.produtoId));
      return {
        produtoId: String(i.produtoId),
        quantidade: Number(i.quantidade),
        quantidadeCaixa: unidadeParaCaixa(i.quantidade, produto?.unidadesPorCaixa),
        precoUnitario: Number(i.precoUnitario),
        custoUnitario: null,
        lucroManual: null,
      };
    });
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

  function produtoDoItem(item) {
    return produtos.find((p) => String(p.id) === String(item.produtoId));
  }

  function atualizarQuantidadeUnidade(index, valor) {
    const novosItens = [...itens];
    novosItens[index].quantidade = valor;
    novosItens[index].quantidadeCaixa = unidadeParaCaixa(
      valor,
      produtoDoItem(novosItens[index])?.unidadesPorCaixa
    );
    setItens(novosItens);
  }

  function atualizarQuantidadeCaixa(index, valor) {
    const novosItens = [...itens];
    novosItens[index].quantidadeCaixa = valor;
    novosItens[index].quantidade = caixaParaUnidade(
      valor,
      produtoDoItem(novosItens[index])?.unidadesPorCaixa
    );
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
    novosItens[index].lucroManual = null;
    novosItens[index].quantidadeCaixa = unidadeParaCaixa(
      novosItens[index].quantidade,
      produto?.unidadesPorCaixa
    );
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
      const payload = {
        empresaId: Number(empresaId),
        clienteId: Number(clienteId),
        data,
        comNota,
        formaPagamento,
        vencimento: !FORMAS_PAGAMENTO_IMEDIATAS.includes(formaPagamento)
          ? vencimento || undefined
          : undefined,
        itens: itens.map((i) => ({
          produtoId: Number(i.produtoId),
          quantidade: Number(i.quantidade),
          precoUnitario: Number(i.precoUnitario),
          lucroManual: i.lucroManual !== null && i.lucroManual !== undefined ? Number(i.lucroManual) : null,
        })),
      };

      if (editandoId) {
        await api.put(`/vendas/${editandoId}`, payload);
        setModalAberto(false);
        carregar();
      } else {
        const { data: vendaCriada } = await api.post('/vendas', payload);
        setModalAberto(false);
        carregar();
        window.open(`/recibo/${vendaCriada.id}`, '_blank');
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao salvar venda');
    }
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Receipt className="w-6 h-6 text-slate-700" />
          Vendas
        </h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
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

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <SortableTh label="ID" sortKey="id" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Empresa" sortKey="empresa" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Data" sortKey="data" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Cliente" sortKey="cliente" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Forma Pagamento" sortKey="formaPagamento" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Nota Fiscal" sortKey="comNota" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3">Itens</th>
            <SortableTh label="Total" sortKey="total" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Lucro" sortKey="lucro" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3 w-40">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {dadosOrdenados.map((v) => {
            const total = totalVenda(v);
            const lucro = v.lucroTotal ?? 0;
            const contaPaga = v.contasReceber?.some((cr) => cr.status === 'PAGO');
            return (
              <tr key={v.id} className="border-t">
                <td className="p-3">
                  <button
                    onClick={() => setVendaDetalheId(v.id)}
                    className="text-blue-600 hover:underline"
                  >
                    #{v.id}
                  </button>
                </td>
                <td className="p-3">{v.empresa?.razaoSocial}</td>
                <td className="p-3">{formatarData(v.data)}</td>
                <td className="p-3">{v.cliente?.nome}</td>
                <td className="p-3">{FORMA_PAGAMENTO_LABEL[v.formaPagamento]}</td>
                <td className="p-3">{v.comNota ? 'Sim' : 'Não'}</td>
                <td className="p-3">
                  {v.itens.map((i) => `${i.produto.nome} (${Number(i.quantidade)})`).join(', ')}
                </td>
                <td className="p-3">R$ {total.toFixed(2)}</td>
                <td className={`p-3 font-medium ${lucro < 0 ? 'text-red-600' : 'text-green-700'}`}>
                  R$ {lucro.toFixed(2)}
                </td>
                <td className="p-3 space-x-3">
                  <button
                    onClick={() => window.open(`/recibo/${v.id}`, '_blank')}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir
                  </button>
                  {contaPaga ? (
                    <span className="text-gray-400 text-xs block">Já recebida</span>
                  ) : (
                    <>
                      <button
                        onClick={() => abrirEdicao(v)}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        Editar
                      </button>
                      <button
                        onClick={() => excluir(v.id)}
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
              <td colSpan={10} className="p-3 text-center text-gray-400">
                Nenhuma venda registrada
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      <Modal
        open={modalAberto}
        title={editandoId ? 'Editar Venda' : 'Nova Venda'}
        onClose={() => setModalAberto(false)}
      >
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
                  Última venda ({formatarData(ultimaVenda.data)})
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

          <label className="flex items-center gap-2 mb-4 text-sm">
            <input type="checkbox" checked={comNota} onChange={(e) => setComNota(e.target.checked)} />
            Venda com nota fiscal
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
          {itens.map((item, index) => {
            const produto = produtoDoItem(item);
            const temCusto = item.custoUnitario !== null && item.custoUnitario !== undefined;
            const lucroUnitario = temCusto
              ? Number(item.precoUnitario || 0) - Number(item.custoUnitario)
              : null;
            const lucroItem = lucroUnitario !== null ? lucroUnitario * Number(item.quantidade || 0) : null;

            return (
              <div key={index} className="mb-2">
                <div className="grid grid-cols-12 gap-2 items-center">
                  <select
                    className="col-span-4 border rounded px-2 py-1.5 text-sm"
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
                    placeholder={produto ? `Qtd (${produto.unidade})` : 'Qtd'}
                    title={produto ? `Quantidade em ${produto.unidade}` : ''}
                    className="col-span-2 border rounded px-2 py-1.5 text-sm"
                    value={item.quantidade}
                    onChange={(e) => atualizarQuantidadeUnidade(index, e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    step="0.001"
                    placeholder="Qtd (Cx)"
                    title="Quantidade em caixas"
                    disabled={!produto?.unidadesPorCaixa}
                    className="col-span-2 border rounded px-2 py-1.5 text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    value={item.quantidadeCaixa}
                    onChange={(e) => atualizarQuantidadeCaixa(index, e.target.value)}
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
                    {produto?.unidadesPorCaixa && (
                      <div>
                        1 caixa = {Number(produto.unidadesPorCaixa)} {produto.unidade} · Preço da
                        caixa: R${' '}
                        {(Number(item.precoUnitario || 0) * Number(produto.unidadesPorCaixa)).toFixed(2)}
                      </div>
                    )}
                    {temCusto ? (
                      <div>Custo última compra: R$ {Number(item.custoUnitario).toFixed(2)}</div>
                    ) : (
                      <div>Sem histórico de compra deste produto para calcular lucro automaticamente</div>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span>Lucro do item:</span>
                      <input
                        type="number"
                        step="0.01"
                        className={`w-28 border rounded px-2 py-1 text-xs ${
                          item.lucroManual !== null && item.lucroManual !== undefined
                            ? 'border-amber-400 bg-amber-50'
                            : ''
                        }`}
                        value={
                          item.lucroManual !== null && item.lucroManual !== undefined
                            ? item.lucroManual
                            : lucroItem !== null
                              ? lucroItem.toFixed(2)
                              : ''
                        }
                        onChange={(e) => atualizarItem(index, 'lucroManual', e.target.value)}
                      />
                      {item.lucroManual !== null && item.lucroManual !== undefined && (
                        <button
                          type="button"
                          onClick={() => atualizarItem(index, 'lucroManual', null)}
                          className="text-blue-600 hover:underline"
                        >
                          Usar automático
                        </button>
                      )}
                    </div>
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
            {editandoId ? 'Salvar Alterações' : 'Salvar Venda'}
          </button>
        </form>
      </Modal>

      <VendaDetalheModal vendaId={vendaDetalheId} onClose={() => setVendaDetalheId(null)} />
    </div>
  );
}
