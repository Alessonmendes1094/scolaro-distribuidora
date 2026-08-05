import { useEffect, useMemo, useState } from 'react';
import { HandCoins, Printer, Undo2, Ban, Plus, Trash2 } from 'lucide-react';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import { STATUS_LABEL, STATUS_BADGE } from '../lib/status';
import VendaDetalheModal from '../components/VendaDetalheModal.jsx';
import SortableTh from '../components/SortableTh.jsx';
import { useSort } from '../lib/useSort';
import Modal from '../components/Modal.jsx';

const FORM_INICIAL = { descricao: '', valor: '', vencimento: '', lucro: '' };

export default function ContasReceber() {
  const [modalNovaAberto, setModalNovaAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [erroForm, setErroForm] = useState('');
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selecionadas, setSelecionadas] = useState([]);
  const [valorBaixa, setValorBaixa] = useState('');
  const [dataRecebimento, setDataRecebimento] = useState(() => new Date().toISOString().slice(0, 10));
  const [erro, setErro] = useState('');
  const [vendaDetalheId, setVendaDetalheId] = useState(null);

  async function carregar() {
    const params = {};
    if (clienteId) params.clienteId = clienteId;
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    const [contasRes, clientesRes] = await Promise.all([
      api.get('/contas-receber', { params }),
      api.get('/clientes'),
    ]);
    setLista(contasRes.data);
    setClientes(clientesRes.data);
    setSelecionadas([]);
  }

  useEffect(() => {
    carregar();
  }, [clienteId, dataInicio, dataFim]);

  const somaSelecionada = useMemo(() => {
    return lista
      .filter((c) => selecionadas.includes(c.id))
      .reduce((acc, c) => acc + Number(c.valor), 0);
  }, [lista, selecionadas]);

  useEffect(() => {
    setValorBaixa(somaSelecionada ? somaSelecionada.toFixed(2) : '');
  }, [somaSelecionada]);

  function alternarSelecao(id) {
    setSelecionadas((atual) =>
      atual.includes(id) ? atual.filter((x) => x !== id) : [...atual, id]
    );
  }

  async function baixarSelecionadas() {
    setErro('');
    const valor = Number(valorBaixa);
    if (!valor || valor <= 0) {
      setErro('Informe um valor de baixa maior que zero');
      return;
    }
    if (valor > somaSelecionada) {
      setErro('O valor da baixa não pode ser maior que a soma das pendências selecionadas');
      return;
    }
    if (!confirm(`Confirmar baixa de R$ ${valor.toFixed(2)} nas pendências selecionadas?`)) return;

    try {
      const { data } = await api.post('/contas-receber/baixar', {
        contaIds: selecionadas,
        valorBaixado: valor,
        dataPagamento: dataRecebimento,
      });
      carregar();
      if (data.baixaId) {
        window.open(`/recibo-pagamento/${data.baixaId}`, '_blank');
      }
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao baixar pendências');
    }
  }

  async function cancelarBaixa(id) {
    if (!confirm('Cancelar a baixa desta conta? Ela voltará a ficar pendente.')) return;
    try {
      await api.post(`/contas-receber/${id}/cancelar-baixa`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao cancelar baixa');
    }
  }

  async function marcarPerdido(id) {
    const motivo = prompt(
      'Cliente não pagou e nega a dívida. Descreva o motivo (opcional):'
    );
    if (motivo === null) return;
    try {
      await api.post(`/contas-receber/${id}/perda`, { motivo: motivo || undefined });
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao marcar como perdido');
    }
  }

  async function reverterPerda(id) {
    if (!confirm('Reverter a perda desta conta? Ela voltará a ficar pendente/atrasada.')) return;
    try {
      await api.post(`/contas-receber/${id}/reverter-perda`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao reverter perda');
    }
  }

  function abrirNova() {
    setForm(FORM_INICIAL);
    setErroForm('');
    setModalNovaAberto(true);
  }

  async function salvarNova(e) {
    e.preventDefault();
    setErroForm('');
    try {
      await api.post('/contas-receber', {
        descricao: form.descricao,
        valor: Number(form.valor),
        vencimento: form.vencimento,
        lucro: form.lucro !== '' ? Number(form.lucro) : null,
      });
      setModalNovaAberto(false);
      carregar();
    } catch (err) {
      setErroForm(err.response?.data?.error || 'Erro ao salvar conta a receber');
    }
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir esta conta a receber?')) return;
    try {
      await api.delete(`/contas-receber/${id}`);
      carregar();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao excluir conta');
    }
  }

  const pendentesSelecionaveis = lista.filter(
    (c) => c.status !== 'PAGO' && c.status !== 'PERDIDO'
  );

  const { dadosOrdenados, sortKey, sortDir, requestSort } = useSort(
    lista,
    {
      cliente: (c) => (c.venda?.cliente?.nome || c.descricao || '').toLowerCase(),
      venda: (c) => c.vendaId,
      valor: (c) => Number(c.valor),
      vencimento: (c) => c.vencimento,
      status: (c) => c.status,
      codigoBaixa: (c) => c.baixa?.codigo,
    },
    'vencimento',
    'desc'
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <HandCoins className="w-6 h-6 text-slate-700" />
          Contas a Receber
        </h1>
        <button
          onClick={abrirNova}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nova Conta a Receber
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-4">
        <div>
          <label className="block text-sm mb-1">Cliente</label>
          <select
            className="border rounded px-3 py-2 text-sm"
            value={clienteId}
            onChange={(e) => setClienteId(e.target.value)}
          >
            <option value="">Todos os clientes</option>
            {clientes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">Vencimento de</label>
          <input
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Vencimento até</label>
          <input
            type="date"
            className="border rounded px-3 py-2 text-sm"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
      </div>

      {selecionadas.length > 0 && (
        <div className="bg-white border rounded p-4 mb-4 flex flex-wrap items-end gap-4">
          <div>
            <div className="text-sm text-gray-500">Pendências selecionadas</div>
            <div className="font-semibold">{selecionadas.length}</div>
          </div>
          <div>
            <div className="text-sm text-gray-500">Soma selecionada</div>
            <div className="font-semibold">R$ {somaSelecionada.toFixed(2)}</div>
          </div>
          <div>
            <label className="block text-sm mb-1">Valor a baixar</label>
            <input
              type="number"
              step="0.01"
              max={somaSelecionada}
              className="border rounded px-3 py-2 text-sm w-40"
              value={valorBaixa}
              onChange={(e) => setValorBaixa(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Data do Recebimento</label>
            <input
              type="date"
              className="border rounded px-3 py-2 text-sm"
              value={dataRecebimento}
              onChange={(e) => setDataRecebimento(e.target.value)}
            />
          </div>
          <button
            onClick={baixarSelecionadas}
            className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
          >
            Baixar Selecionadas
          </button>
          {erro && <div className="text-sm text-red-600">{erro}</div>}
        </div>
      )}

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3 w-10"></th>
            <SortableTh label="Cliente" sortKey="cliente" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Venda" sortKey="venda" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Valor" sortKey="valor" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Vencimento" sortKey="vencimento" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Status" sortKey="status" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Código Baixa" sortKey="codigoBaixa" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3 w-40">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {dadosOrdenados.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">
                {c.status !== 'PAGO' && c.status !== 'PERDIDO' && (
                  <input
                    type="checkbox"
                    checked={selecionadas.includes(c.id)}
                    onChange={() => alternarSelecao(c.id)}
                  />
                )}
              </td>
              <td className="p-3">
                {c.venda?.cliente?.nome || (
                  <span className="text-gray-500">{c.descricao || 'Lançamento manual'}</span>
                )}
              </td>
              <td className="p-3">
                {c.vendaId ? (
                  <button
                    onClick={() => setVendaDetalheId(c.vendaId)}
                    className="text-blue-600 hover:underline"
                  >
                    #{c.vendaId}
                  </button>
                ) : (
                  '-'
                )}
              </td>
              <td className="p-3">R$ {Number(c.valor).toFixed(2)}</td>
              <td className="p-3">{formatarData(c.vencimento)}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${STATUS_BADGE[c.status]}`}>
                  {STATUS_LABEL[c.status]}
                </span>
                {c.status === 'PERDIDO' && c.motivoPerda && (
                  <div className="text-xs text-gray-400 mt-1 max-w-[180px]">{c.motivoPerda}</div>
                )}
              </td>
              <td className="p-3">{c.baixa?.codigo || '-'}</td>
              <td className="p-3 space-x-3">
                {c.status === 'PAGO' && (
                  <>
                    {c.baixaId && (
                      <button
                        onClick={() => window.open(`/recibo-pagamento/${c.baixaId}`, '_blank')}
                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        Recibo
                      </button>
                    )}
                    <button
                      onClick={() => cancelarBaixa(c.id)}
                      className="text-red-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Undo2 className="w-3.5 h-3.5" />
                      Cancelar baixa
                    </button>
                  </>
                )}
                {c.status === 'PERDIDO' && (
                  <button
                    onClick={() => reverterPerda(c.id)}
                    className="text-blue-600 hover:underline inline-flex items-center gap-1"
                  >
                    <Undo2 className="w-3.5 h-3.5" />
                    Reverter perda
                  </button>
                )}
                {(c.status === 'PENDENTE' || c.status === 'ATRASADO') && (
                  <>
                    <button
                      onClick={() => {
                        setSelecionadas([c.id]);
                        setValorBaixa(Number(c.valor).toFixed(2));
                      }}
                      className="text-green-700 hover:underline inline-flex items-center gap-1"
                    >
                      <HandCoins className="w-3.5 h-3.5" />
                      Marcar recebido
                    </button>
                    <button
                      onClick={() => marcarPerdido(c.id)}
                      className="text-gray-600 hover:underline inline-flex items-center gap-1"
                    >
                      <Ban className="w-3.5 h-3.5" />
                      Marcar perdido
                    </button>
                  </>
                )}
                {!c.vendaId && c.status !== 'PAGO' && (
                  <button
                    onClick={() => excluir(c.id)}
                    className="text-red-600 hover:underline inline-flex items-center gap-1"
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
              <td colSpan={8} className="p-3 text-center text-gray-400">
                Nenhuma conta a receber
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

      {pendentesSelecionaveis.length === 0 && lista.length > 0 && (
        <div className="text-xs text-gray-400 mt-2">Todas as pendências deste filtro já foram pagas.</div>
      )}

      <VendaDetalheModal vendaId={vendaDetalheId} onClose={() => setVendaDetalheId(null)} />

      <Modal
        open={modalNovaAberto}
        title="Nova Conta a Receber"
        onClose={() => setModalNovaAberto(false)}
      >
        <form onSubmit={salvarNova}>
          {erroForm && <div className="mb-3 text-sm text-red-600">{erroForm}</div>}
          <label className="block text-sm mb-1">Descrição</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            placeholder="Ex: Recebimento diverso - Cliente X"
            required
          />
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
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.vencimento}
            onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Lucro deste recebimento (opcional)</label>
          <input
            type="number"
            step="0.01"
            className="w-full border rounded px-3 py-2 mb-1"
            value={form.lucro}
            onChange={(e) => setForm({ ...form, lucro: e.target.value })}
          />
          <div className="text-xs text-gray-500 mb-6">
            Esse valor entra no cálculo de lucratividade do Dashboard, junto com o lucro das
            vendas.
          </div>
          <button
            type="submit"
            className="w-full bg-slate-900 text-white rounded px-3 py-2 hover:bg-slate-800"
          >
            Salvar
          </button>
        </form>
      </Modal>
    </div>
  );
}
