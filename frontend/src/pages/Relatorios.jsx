import { useState } from 'react';
import api from '../lib/api';
import { baixarCsv } from '../lib/csv';

const ABAS = [
  { id: 'vendas-por-cliente', label: 'Vendas por Cliente' },
  { id: 'pagamentos-recebidos', label: 'Pagamentos Recebidos' },
  { id: 'pagamentos-pendentes', label: 'Pagamentos Pendentes' },
];

export default function Relatorios() {
  const [aba, setAba] = useState(ABAS[0].id);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [resultado, setResultado] = useState([]);

  async function gerar() {
    const params = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    const { data } = await api.get(`/relatorios/${aba}`, { params });
    setResultado(data);
  }

  function exportarCsv() {
    const linhas = [];
    for (const grupo of resultado) {
      if (aba === 'vendas-por-cliente') {
        for (const v of grupo.vendas) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: v.id,
            data: new Date(v.data).toLocaleDateString('pt-BR'),
            formaPagamento: v.formaPagamento,
            quantidade: v.quantidade,
            valorTotal: v.valorTotal.toFixed(2),
          });
        }
      } else if (aba === 'pagamentos-recebidos') {
        for (const p of grupo.pagamentos) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            valor: p.valor.toFixed(2),
            pagoEm: new Date(p.pagoEm).toLocaleDateString('pt-BR'),
          });
        }
      } else {
        for (const p of grupo.pendencias) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            valor: p.valor.toFixed(2),
            vencimento: new Date(p.vencimento).toLocaleDateString('pt-BR'),
            status: p.status,
          });
        }
      }
    }
    baixarCsv(`${aba}.csv`, linhas);
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Relatórios</h1>

      <div className="flex gap-2 mb-4">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setAba(a.id);
              setResultado([]);
            }}
            className={`px-4 py-2 rounded text-sm ${
              aba === a.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex gap-3 items-end mb-6">
        <div>
          <label className="block text-sm mb-1">Data Início</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dataInicio}
            onChange={(e) => setDataInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Data Fim</label>
          <input
            type="date"
            className="border rounded px-3 py-2"
            value={dataFim}
            onChange={(e) => setDataFim(e.target.value)}
          />
        </div>
        <button
          onClick={gerar}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Gerar
        </button>
        <button
          onClick={exportarCsv}
          disabled={resultado.length === 0}
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Exportar CSV
        </button>
      </div>

      <div className="space-y-4">
        {resultado.map((grupo) => (
          <div key={grupo.clienteId} className="bg-white rounded shadow p-4">
            <div className="flex justify-between mb-2">
              <div className="font-semibold">{grupo.clienteNome}</div>
              <div className="font-semibold">R$ {grupo.valorTotal.toFixed(2)}</div>
            </div>

            {aba === 'vendas-por-cliente' && (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-1">Venda</th>
                    <th className="py-1">Data</th>
                    <th className="py-1">Pagamento</th>
                    <th className="py-1">Qtd.</th>
                    <th className="py-1">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.vendas.map((v) => (
                    <tr key={v.id} className="border-t">
                      <td className="py-1">#{v.id}</td>
                      <td className="py-1">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1">{v.formaPagamento}</td>
                      <td className="py-1">{v.quantidade}</td>
                      <td className="py-1">R$ {v.valorTotal.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {aba === 'pagamentos-recebidos' && (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-1">Venda</th>
                    <th className="py-1">Valor</th>
                    <th className="py-1">Pago em</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.pagamentos.map((p) => (
                    <tr key={p.contaId} className="border-t">
                      <td className="py-1">#{p.vendaId}</td>
                      <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                      <td className="py-1">{new Date(p.pagoEm).toLocaleDateString('pt-BR')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {aba === 'pagamentos-pendentes' && (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-1">Venda</th>
                    <th className="py-1">Valor</th>
                    <th className="py-1">Vencimento</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.pendencias.map((p) => (
                    <tr key={p.contaId} className="border-t">
                      <td className="py-1">#{p.vendaId}</td>
                      <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                      <td className="py-1">{new Date(p.vencimento).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1">{p.status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        ))}
        {resultado.length === 0 && (
          <div className="text-center text-gray-400 py-8">Nenhum dado gerado ainda</div>
        )}
      </div>
    </div>
  );
}
