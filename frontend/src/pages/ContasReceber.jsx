import { useEffect, useMemo, useState } from 'react';
import api from '../lib/api';

const badge = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  ATRASADO: 'bg-red-100 text-red-800',
  PAGO: 'bg-green-100 text-green-800',
};

export default function ContasReceber() {
  const [lista, setLista] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [selecionadas, setSelecionadas] = useState([]);
  const [valorBaixa, setValorBaixa] = useState('');
  const [erro, setErro] = useState('');

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
      await api.post('/contas-receber/baixar', {
        contaIds: selecionadas,
        valorBaixado: valor,
      });
      carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao baixar pendências');
    }
  }

  const pendentesSelecionaveis = lista.filter((c) => c.status !== 'PAGO');

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Contas a Receber</h1>

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
          <button
            onClick={baixarSelecionadas}
            className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
          >
            Baixar Selecionadas
          </button>
          {erro && <div className="text-sm text-red-600">{erro}</div>}
        </div>
      )}

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3 w-10"></th>
            <th className="p-3">Cliente</th>
            <th className="p-3">Venda</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Vencimento</th>
            <th className="p-3">Status</th>
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">
                {c.status !== 'PAGO' && (
                  <input
                    type="checkbox"
                    checked={selecionadas.includes(c.id)}
                    onChange={() => alternarSelecao(c.id)}
                  />
                )}
              </td>
              <td className="p-3">{c.venda?.cliente?.nome}</td>
              <td className="p-3">#{c.vendaId}</td>
              <td className="p-3">R$ {Number(c.valor).toFixed(2)}</td>
              <td className="p-3">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${badge[c.status]}`}>{c.status}</span>
              </td>
              <td className="p-3">
                {c.status !== 'PAGO' && (
                  <button
                    onClick={() => {
                      setSelecionadas([c.id]);
                      setValorBaixa(Number(c.valor).toFixed(2));
                    }}
                    className="text-green-700 hover:underline"
                  >
                    Marcar recebido
                  </button>
                )}
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={7} className="p-3 text-center text-gray-400">
                Nenhuma conta a receber
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {pendentesSelecionaveis.length === 0 && lista.length > 0 && (
        <div className="text-xs text-gray-400 mt-2">Todas as pendências deste filtro já foram pagas.</div>
      )}
    </div>
  );
}
