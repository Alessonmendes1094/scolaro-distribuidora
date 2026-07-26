import { useEffect, useState } from 'react';
import api from '../lib/api';
import { baixarCsv } from '../lib/csv';
import { baixarPdf } from '../lib/pdf';
import { STATUS_LABEL } from '../lib/status';

const ABAS = [
  { id: 'vendas-por-cliente', label: 'Vendas por Cliente' },
  { id: 'pagamentos-recebidos', label: 'Pagamentos Recebidos' },
  { id: 'pagamentos-pendentes', label: 'Pagamentos Pendentes' },
];

const TITULOS = {
  'vendas-por-cliente': 'Relatório de Vendas por Cliente',
  'pagamentos-recebidos': 'Relatório de Pagamentos Recebidos',
  'pagamentos-pendentes': 'Relatório de Pagamentos Pendentes',
};

export default function Relatorios() {
  const [aba, setAba] = useState(ABAS[0].id);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState([]);
  const [resultado, setResultado] = useState([]);

  useEffect(() => {
    api.get('/empresas').then((res) => setEmpresas(res.data));
    api.get('/clientes').then((res) => setClientes(res.data));
  }, []);

  function montarParams() {
    const params = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    if (empresaId) params.empresaId = empresaId;
    if (clienteId) params.clienteId = clienteId;
    return params;
  }

  async function gerar() {
    const { data } = await api.get(`/relatorios/${aba}`, { params: montarParams() });
    setResultado(data);
  }

  function imprimir() {
    const params = new URLSearchParams(montarParams());
    const clienteNome = clientes.find((c) => String(c.id) === String(clienteId))?.nome;
    if (clienteNome) params.set('clienteNome', clienteNome);
    window.open(`/relatorios/imprimir/${aba}?${params.toString()}`, '_blank');
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
            statusPendencia: STATUS_LABEL[v.statusPendencia] || v.statusPendencia,
          });
        }
      } else if (aba === 'pagamentos-recebidos') {
        for (const p of grupo.pagamentos) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            dataVenda: new Date(p.dataVenda).toLocaleDateString('pt-BR'),
            valorVenda: p.valorVenda.toFixed(2),
            valorPendencia: p.valor.toFixed(2),
            pagoEm: new Date(p.pagoEm).toLocaleDateString('pt-BR'),
            codigoBaixa: p.codigoBaixa || '',
          });
        }
      } else {
        for (const p of grupo.pendencias) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            dataVenda: new Date(p.dataVenda).toLocaleDateString('pt-BR'),
            valorVenda: p.valorVenda.toFixed(2),
            valorPendencia: p.valor.toFixed(2),
            vencimento: new Date(p.vencimento).toLocaleDateString('pt-BR'),
            status: STATUS_LABEL[p.status] || p.status,
          });
        }
      }
    }
    baixarCsv(`${aba}.csv`, linhas);
  }

  function exportarPdf() {
    const clienteNome = clientes.find((c) => String(c.id) === String(clienteId))?.nome;
    const subtitulos = [];
    if (clienteNome) subtitulos.push(`Cliente: ${clienteNome}`);
    if (dataInicio || dataFim) {
      subtitulos.push(
        `Período: ${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : '...'} até ${
          dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : '...'
        }`
      );
    }

    let colunas = [];
    const linhas = [];

    if (aba === 'vendas-por-cliente') {
      colunas = ['Cliente', 'Venda', 'Data', 'Pagamento', 'Qtd.', 'Valor', 'Status Pendência'];
      for (const grupo of resultado) {
        for (const v of grupo.vendas) {
          linhas.push([
            grupo.clienteNome,
            `#${v.id}`,
            new Date(v.data).toLocaleDateString('pt-BR'),
            v.formaPagamento,
            v.quantidade,
            `R$ ${v.valorTotal.toFixed(2)}`,
            STATUS_LABEL[v.statusPendencia] || v.statusPendencia,
          ]);
        }
      }
    } else if (aba === 'pagamentos-recebidos') {
      colunas = ['Cliente', 'Venda', 'Data Venda', 'Valor Venda', 'Valor Recebido', 'Recebido em', 'Cód. Baixa'];
      for (const grupo of resultado) {
        for (const p of grupo.pagamentos) {
          linhas.push([
            grupo.clienteNome,
            `#${p.vendaId}`,
            new Date(p.dataVenda).toLocaleDateString('pt-BR'),
            `R$ ${p.valorVenda.toFixed(2)}`,
            `R$ ${p.valor.toFixed(2)}`,
            new Date(p.pagoEm).toLocaleDateString('pt-BR'),
            p.codigoBaixa || '-',
          ]);
        }
      }
    } else {
      colunas = ['Cliente', 'Venda', 'Data Venda', 'Valor Venda', 'Valor Pendente', 'Vencimento', 'Status'];
      for (const grupo of resultado) {
        for (const p of grupo.pendencias) {
          linhas.push([
            grupo.clienteNome,
            `#${p.vendaId}`,
            new Date(p.dataVenda).toLocaleDateString('pt-BR'),
            `R$ ${p.valorVenda.toFixed(2)}`,
            `R$ ${p.valor.toFixed(2)}`,
            new Date(p.vencimento).toLocaleDateString('pt-BR'),
            STATUS_LABEL[p.status] || p.status,
          ]);
        }
      }
    }

    baixarPdf({
      nomeArquivo: `${aba}.pdf`,
      titulo: TITULOS[aba],
      subtitulos,
      colunas,
      linhas,
    });
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

      <div className="flex flex-wrap gap-3 items-end mb-6">
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
          <label className="block text-sm mb-1">Empresa</label>
          <select
            className="border rounded px-3 py-2"
            value={empresaId}
            onChange={(e) => setEmpresaId(e.target.value)}
          >
            <option value="">Todas as empresas</option>
            {empresas.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.razaoSocial}
              </option>
            ))}
          </select>
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
        <div>
          <label className="block text-sm mb-1">Cliente</label>
          <select
            className="border rounded px-3 py-2"
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
        <button
          onClick={exportarPdf}
          disabled={resultado.length === 0}
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Baixar PDF
        </button>
        <button
          onClick={imprimir}
          disabled={resultado.length === 0}
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50"
        >
          Imprimir
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
                    <th className="py-1">Status Pendência</th>
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
                      <td className="py-1">{STATUS_LABEL[v.statusPendencia] || v.statusPendencia}</td>
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
                    <th className="py-1">Data Venda</th>
                    <th className="py-1">Valor Venda</th>
                    <th className="py-1">Valor Recebido</th>
                    <th className="py-1">Código Baixa</th>
                    <th className="py-1">Recebido em</th>
                    <th className="py-1"></th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.pagamentos.map((p) => (
                    <tr key={p.contaId} className="border-t">
                      <td className="py-1">#{p.vendaId}</td>
                      <td className="py-1">{new Date(p.dataVenda).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                      <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                      <td className="py-1">{p.codigoBaixa || '-'}</td>
                      <td className="py-1">{new Date(p.pagoEm).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1">
                        {p.baixaId && (
                          <button
                            onClick={() => window.open(`/recibo-pagamento/${p.baixaId}`, '_blank')}
                            className="text-blue-600 hover:underline"
                          >
                            Recibo
                          </button>
                        )}
                      </td>
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
                    <th className="py-1">Data Venda</th>
                    <th className="py-1">Valor Venda</th>
                    <th className="py-1">Valor Pendente</th>
                    <th className="py-1">Vencimento</th>
                    <th className="py-1">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.pendencias.map((p) => (
                    <tr key={p.contaId} className="border-t">
                      <td className="py-1">#{p.vendaId}</td>
                      <td className="py-1">{new Date(p.dataVenda).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                      <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                      <td className="py-1">{new Date(p.vencimento).toLocaleDateString('pt-BR')}</td>
                      <td className="py-1">{STATUS_LABEL[p.status]}</td>
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
