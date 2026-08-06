import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { formatarData } from '../lib/date';
import { baixarCsv } from '../lib/csv';
import { baixarPdf } from '../lib/pdf';
import { STATUS_LABEL, STATUS_BADGE } from '../lib/status';
import { FORMA_PAGAMENTO_LABEL } from '../lib/formaPagamento';
import VendaDetalheModal from '../components/VendaDetalheModal.jsx';
import { FileBarChart, Filter, FileSpreadsheet, FileDown, Printer } from 'lucide-react';

const ABAS = [
  { id: 'vendas-por-cliente', label: 'Vendas por Cliente' },
  { id: 'pagamentos-recebidos', label: 'Pagamentos Recebidos' },
  { id: 'pagamentos-pendentes', label: 'Pagamentos Pendentes' },
  { id: 'resumo-mensal', label: 'Resumo Mensal por Cliente' },
  { id: 'resumo-anual', label: 'Resumo Anual por Cliente' },
  { id: 'perdas', label: 'Perdas (Inadimplência)' },
];

const TITULOS = {
  'vendas-por-cliente': 'Relatório de Vendas por Cliente',
  'pagamentos-recebidos': 'Relatório de Pagamentos Recebidos',
  'pagamentos-pendentes': 'Relatório de Pagamentos Pendentes',
  'resumo-mensal': 'Resumo Mensal por Cliente',
  'resumo-anual': 'Resumo Anual por Cliente',
  perdas: 'Relatório de Perdas (Inadimplência)',
};

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function labelMes(grupoMes) {
  return `${NOMES_MESES[grupoMes.mesNumero - 1]}/${grupoMes.ano}`;
}

function StatusPendenciaBadge({ status, diasAtraso }) {
  return (
    <span className={`px-2 py-1 rounded text-xs ${STATUS_BADGE[status]}`}>
      {STATUS_LABEL[status] || status}
      {status === 'ATRASADO' && diasAtraso != null && (
        <> · {diasAtraso} {diasAtraso === 1 ? 'dia' : 'dias'}</>
      )}
    </span>
  );
}

export default function Relatorios() {
  const [searchParams] = useSearchParams();
  const abaInicial = ABAS.some((a) => a.id === searchParams.get('aba'))
    ? searchParams.get('aba')
    : ABAS[0].id;
  const [aba, setAba] = useState(abaInicial);
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [clienteId, setClienteId] = useState('');
  const [clientes, setClientes] = useState([]);
  const [status, setStatus] = useState('');
  const [meses, setMeses] = useState(6);
  const [anos, setAnos] = useState(3);
  const [exibirVencimentoStatus, setExibirVencimentoStatus] = useState(true);
  const [resultado, setResultado] = useState([]);
  const [vendaDetalheId, setVendaDetalheId] = useState(null);

  useEffect(() => {
    api.get('/empresas').then((res) => setEmpresas(res.data));
    api.get('/clientes').then((res) => setClientes(res.data));
  }, []);

  useEffect(() => {
    setStatus('');
  }, [aba]);

  const opcoesStatus =
    aba === 'vendas-por-cliente'
      ? [
          { value: 'PAGO', label: 'Pago' },
          { value: 'PENDENTE', label: 'Em Aberto' },
          { value: 'ATRASADO', label: 'Vencida' },
        ]
      : aba === 'pagamentos-pendentes'
      ? [
          { value: 'PENDENTE', label: 'Em Aberto' },
          { value: 'ATRASADO', label: 'Vencida' },
        ]
      : [];

  function montarParams() {
    const params = {};
    if (aba === 'resumo-mensal') {
      params.meses = meses;
    } else if (aba === 'resumo-anual') {
      params.anos = anos;
    } else {
      if (dataInicio) params.dataInicio = dataInicio;
      if (dataFim) params.dataFim = dataFim;
      if (status) params.status = status;
    }
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
    if (aba === 'pagamentos-pendentes' && !exibirVencimentoStatus) {
      params.set('exibirVencimentoStatus', 'false');
    }
    window.open(`/relatorios/imprimir/${aba}?${params.toString()}`, '_blank');
  }

  function exportarCsv() {
    if (aba === 'resumo-mensal') {
      const linhasMensal = [];
      for (const grupoMes of resultado) {
        for (const c of grupoMes.clientes) {
          linhasMensal.push({
            mes: labelMes(grupoMes),
            cliente: c.clienteNome,
            quantidadeVendas: c.quantidadeVendas,
            valorTotal: c.valorTotal.toFixed(2),
            lucroTotal: c.lucroTotal.toFixed(2),
          });
        }
      }
      baixarCsv('resumo-mensal.csv', linhasMensal);
      return;
    }

    if (aba === 'resumo-anual') {
      const linhasAnual = [];
      for (const grupoAno of resultado) {
        for (const c of grupoAno.clientes) {
          linhasAnual.push({
            ano: grupoAno.ano,
            cliente: c.clienteNome,
            quantidadeVendas: c.quantidadeVendas,
            valorTotal: c.valorTotal.toFixed(2),
            lucroTotal: c.lucroTotal.toFixed(2),
          });
        }
      }
      baixarCsv('resumo-anual.csv', linhasAnual);
      return;
    }

    const linhas = [];
    for (const grupo of resultado) {
      if (aba === 'vendas-por-cliente') {
        for (const v of grupo.vendas) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: v.id,
            data: formatarData(v.data),
            formaPagamento: FORMA_PAGAMENTO_LABEL[v.formaPagamento] || v.formaPagamento,
            quantidade: v.quantidade,
            valorTotal: v.valorTotal.toFixed(2),
            statusPendencia: STATUS_LABEL[v.statusPendencia] || v.statusPendencia,
            diasAtraso: v.diasAtraso ?? '',
          });
        }
      } else if (aba === 'pagamentos-recebidos') {
        for (const p of grupo.pagamentos) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            dataVenda: formatarData(p.dataVenda),
            valorVenda: p.valorVenda.toFixed(2),
            valorPendencia: p.valor.toFixed(2),
            pagoEm: formatarData(p.pagoEm),
            codigoBaixa: p.codigoBaixa || '',
          });
        }
      } else if (aba === 'pagamentos-pendentes') {
        for (const p of grupo.pendencias) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            dataVenda: formatarData(p.dataVenda),
            valorVenda: p.valorVenda.toFixed(2),
            valorPendencia: p.valor.toFixed(2),
            ...(exibirVencimentoStatus
              ? {
                  vencimento: formatarData(p.vencimento),
                  status: STATUS_LABEL[p.status] || p.status,
                  diasAtraso: p.diasAtraso ?? '',
                }
              : {}),
          });
        }
      } else {
        for (const p of grupo.perdas) {
          linhas.push({
            cliente: grupo.clienteNome,
            vendaId: p.vendaId,
            dataVenda: formatarData(p.dataVenda),
            valorVenda: p.valorVenda.toFixed(2),
            valorPerdido: p.valor.toFixed(2),
            vencimentoOriginal: formatarData(p.vencimentoOriginal),
            perdidoEm: p.perdidoEm ? formatarData(p.perdidoEm) : '',
            motivo: p.motivo || '',
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

    if (aba === 'resumo-mensal') {
      subtitulos.push(`Últimos ${meses} meses`);
      const colunasMensal = ['Mês', 'Cliente', 'Qtd. Vendas', 'Valor Vendido', 'Lucro'];
      const linhasMensal = [];
      for (const grupoMes of resultado) {
        for (const c of grupoMes.clientes) {
          linhasMensal.push([
            labelMes(grupoMes),
            c.clienteNome,
            c.quantidadeVendas,
            `R$ ${c.valorTotal.toFixed(2)}`,
            `R$ ${c.lucroTotal.toFixed(2)}`,
          ]);
        }
      }
      baixarPdf({
        nomeArquivo: 'resumo-mensal.pdf',
        titulo: TITULOS[aba],
        subtitulos,
        colunas: colunasMensal,
        linhas: linhasMensal,
      });
      return;
    }

    if (aba === 'resumo-anual') {
      subtitulos.push(`Últimos ${anos} anos`);
      const colunasAnual = ['Ano', 'Cliente', 'Qtd. Vendas', 'Valor Vendido', 'Lucro'];
      const linhasAnual = [];
      for (const grupoAno of resultado) {
        for (const c of grupoAno.clientes) {
          linhasAnual.push([
            String(grupoAno.ano),
            c.clienteNome,
            c.quantidadeVendas,
            `R$ ${c.valorTotal.toFixed(2)}`,
            `R$ ${c.lucroTotal.toFixed(2)}`,
          ]);
        }
      }
      baixarPdf({
        nomeArquivo: 'resumo-anual.pdf',
        titulo: TITULOS[aba],
        subtitulos,
        colunas: colunasAnual,
        linhas: linhasAnual,
      });
      return;
    }

    if (status) subtitulos.push(`Status: ${STATUS_LABEL[status] || status}`);
    if (dataInicio || dataFim) {
      subtitulos.push(
        `Período: ${dataInicio ? formatarData(dataInicio) : '...'} até ${
          dataFim ? formatarData(dataFim) : '...'
        }`
      );
    }

    let colunas = [];
    const linhas = [];

    if (aba === 'vendas-por-cliente') {
      colunas = ['Cliente', 'Venda', 'Data', 'Pagamento', 'Qtd.', 'Valor', 'Status Pendência'];
      for (const grupo of resultado) {
        for (const v of grupo.vendas) {
          const statusTexto = STATUS_LABEL[v.statusPendencia] || v.statusPendencia;
          linhas.push([
            grupo.clienteNome,
            `#${v.id}`,
            formatarData(v.data),
            FORMA_PAGAMENTO_LABEL[v.formaPagamento] || v.formaPagamento,
            v.quantidade,
            `R$ ${v.valorTotal.toFixed(2)}`,
            v.diasAtraso != null ? `${statusTexto} (${v.diasAtraso}d)` : statusTexto,
          ]);
        }
      }
    } else if (aba === 'pagamentos-recebidos') {
      colunas = ['Cliente', 'Venda', 'Data Venda', 'Valor Venda', 'Valor Recebido', 'Recebido em', 'Cód. Baixa'];
      for (const grupo of resultado) {
        for (const p of grupo.pagamentos) {
          linhas.push([
            grupo.clienteNome,
            p.vendaId ? `#${p.vendaId}` : p.descricao || 'Manual',
            p.dataVenda ? formatarData(p.dataVenda) : '-',
            `R$ ${p.valorVenda.toFixed(2)}`,
            `R$ ${p.valor.toFixed(2)}`,
            formatarData(p.pagoEm),
            p.codigoBaixa || '-',
          ]);
        }
      }
    } else if (aba === 'pagamentos-pendentes') {
      colunas = ['Cliente', 'Venda', 'Data Venda', 'Valor Venda', 'Valor Pendente'];
      if (exibirVencimentoStatus) colunas.push('Vencimento', 'Status');
      for (const grupo of resultado) {
        for (const p of grupo.pendencias) {
          const statusTexto = STATUS_LABEL[p.status] || p.status;
          const linha = [
            grupo.clienteNome,
            p.vendaId ? `#${p.vendaId}` : p.descricao || 'Manual',
            p.dataVenda ? formatarData(p.dataVenda) : '-',
            `R$ ${p.valorVenda.toFixed(2)}`,
            `R$ ${p.valor.toFixed(2)}`,
          ];
          if (exibirVencimentoStatus) {
            linha.push(
              formatarData(p.vencimento),
              p.diasAtraso != null ? `${statusTexto} (${p.diasAtraso}d)` : statusTexto
            );
          }
          linhas.push(linha);
        }
      }
    } else {
      colunas = ['Cliente', 'Venda', 'Data Venda', 'Valor Venda', 'Valor Perdido', 'Venc. Original', 'Perdido em', 'Motivo'];
      for (const grupo of resultado) {
        for (const p of grupo.perdas) {
          linhas.push([
            grupo.clienteNome,
            `#${p.vendaId}`,
            formatarData(p.dataVenda),
            `R$ ${p.valorVenda.toFixed(2)}`,
            `R$ ${p.valor.toFixed(2)}`,
            formatarData(p.vencimentoOriginal),
            p.perdidoEm ? formatarData(p.perdidoEm) : '-',
            p.motivo || '-',
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
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <FileBarChart className="w-6 h-6 text-slate-700" />
        Relatórios
      </h1>

      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => {
              setAba(a.id);
              setResultado([]);
            }}
            className={`px-4 py-2 rounded text-sm whitespace-nowrap ${
              aba === a.id ? 'bg-slate-900 text-white' : 'bg-white text-slate-800'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 items-end mb-6">
        {aba === 'resumo-mensal' ? (
          <div>
            <label className="block text-sm mb-1">Quantos meses atrás</label>
            <input
              type="number"
              min="1"
              max="36"
              className="border rounded px-3 py-2 w-28"
              value={meses}
              onChange={(e) => setMeses(e.target.value)}
            />
          </div>
        ) : aba === 'resumo-anual' ? (
          <div>
            <label className="block text-sm mb-1">Quantos anos atrás</label>
            <input
              type="number"
              min="1"
              max="15"
              className="border rounded px-3 py-2 w-28"
              value={anos}
              onChange={(e) => setAnos(e.target.value)}
            />
          </div>
        ) : (
          <>
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
          </>
        )}
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
        {opcoesStatus.length > 0 && (
          <div>
            <label className="block text-sm mb-1">Status</label>
            <select
              className="border rounded px-3 py-2"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">Todos os status</option>
              {opcoesStatus.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
        )}
        {aba === 'pagamentos-pendentes' && (
          <div>
            <label className="flex items-center gap-2 text-sm mb-1">
              <input
                type="checkbox"
                checked={exibirVencimentoStatus}
                onChange={(e) => setExibirVencimentoStatus(e.target.checked)}
              />
              Exibir vencimento e status
            </label>
          </div>
        )}
        <button
          onClick={gerar}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Filter className="w-4 h-4" />
          Gerar
        </button>
        <button
          onClick={exportarCsv}
          disabled={resultado.length === 0}
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Exportar CSV
        </button>
        <button
          onClick={exportarPdf}
          disabled={resultado.length === 0}
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
        >
          <FileDown className="w-4 h-4" />
          Baixar PDF
        </button>
        <button
          onClick={imprimir}
          disabled={
            resultado.length === 0 ||
            aba === 'resumo-mensal' ||
            aba === 'resumo-anual' ||
            aba === 'perdas'
          }
          title={
            aba === 'resumo-mensal' || aba === 'resumo-anual' || aba === 'perdas'
              ? 'Use "Baixar PDF" para este relatório'
              : undefined
          }
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Printer className="w-4 h-4" />
          Imprimir
        </button>
      </div>

      {aba === 'resumo-mensal' ? (
        <div className="space-y-6">
          {resultado.map((grupoMes) => (
            <div key={grupoMes.mes} className="bg-white rounded shadow overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex flex-wrap justify-between items-center gap-2">
                <div className="text-lg font-bold">{labelMes(grupoMes)}</div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="text-slate-300">Vendas no mês</div>
                    <div className="font-semibold">{grupoMes.quantidadeVendas}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Total Vendido</div>
                    <div className="font-semibold">R$ {grupoMes.totalVendido.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Lucro</div>
                    <div
                      className={`font-semibold ${
                        grupoMes.lucroTotal < 0 ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      R$ {grupoMes.lucroTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 bg-slate-50">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Qtd. Vendas</th>
                    <th className="p-3">Valor Vendido</th>
                    <th className="p-3">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {grupoMes.clientes.map((c) => (
                    <tr key={c.clienteId} className="border-t">
                      <td className="p-3">{c.clienteNome}</td>
                      <td className="p-3">{c.quantidadeVendas}</td>
                      <td className="p-3">R$ {c.valorTotal.toFixed(2)}</td>
                      <td
                        className={`p-3 font-medium ${
                          c.lucroTotal < 0 ? 'text-red-600' : 'text-green-700'
                        }`}
                      >
                        R$ {c.lucroTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {resultado.length === 0 && (
            <div className="text-center text-gray-400 py-8">Nenhum dado gerado ainda</div>
          )}
        </div>
      ) : aba === 'resumo-anual' ? (
        <div className="space-y-6">
          {resultado.map((grupoAno) => (
            <div key={grupoAno.ano} className="bg-white rounded shadow overflow-hidden">
              <div className="bg-slate-900 text-white p-4 flex flex-wrap justify-between items-center gap-2">
                <div className="text-lg font-bold">{grupoAno.ano}</div>
                <div className="flex gap-6 text-sm">
                  <div>
                    <div className="text-slate-300">Vendas no ano</div>
                    <div className="font-semibold">{grupoAno.quantidadeVendas}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Total Vendido</div>
                    <div className="font-semibold">R$ {grupoAno.totalVendido.toFixed(2)}</div>
                  </div>
                  <div>
                    <div className="text-slate-300">Lucro</div>
                    <div
                      className={`font-semibold ${
                        grupoAno.lucroTotal < 0 ? 'text-red-400' : 'text-green-400'
                      }`}
                    >
                      R$ {grupoAno.lucroTotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500 bg-slate-50">
                  <tr>
                    <th className="p-3">Cliente</th>
                    <th className="p-3">Qtd. Vendas</th>
                    <th className="p-3">Valor Vendido</th>
                    <th className="p-3">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {grupoAno.clientes.map((c) => (
                    <tr key={c.clienteId} className="border-t">
                      <td className="p-3">{c.clienteNome}</td>
                      <td className="p-3">{c.quantidadeVendas}</td>
                      <td className="p-3">R$ {c.valorTotal.toFixed(2)}</td>
                      <td
                        className={`p-3 font-medium ${
                          c.lucroTotal < 0 ? 'text-red-600' : 'text-green-700'
                        }`}
                      >
                        R$ {c.lucroTotal.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
          {resultado.length === 0 && (
            <div className="text-center text-gray-400 py-8">Nenhum dado gerado ainda</div>
          )}
        </div>
      ) : (
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
                      <td className="py-1">
                        <button
                          onClick={() => setVendaDetalheId(v.id)}
                          className="text-blue-600 hover:underline"
                        >
                          #{v.id}
                        </button>
                      </td>
                      <td className="py-1">{formatarData(v.data)}</td>
                      <td className="py-1">{FORMA_PAGAMENTO_LABEL[v.formaPagamento]}</td>
                      <td className="py-1">{v.quantidade}</td>
                      <td className="py-1">R$ {v.valorTotal.toFixed(2)}</td>
                      <td className="py-1">
                        <StatusPendenciaBadge status={v.statusPendencia} diasAtraso={v.diasAtraso} />
                      </td>
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
                      <td className="py-1">
                        {p.vendaId ? (
                          <button
                            onClick={() => setVendaDetalheId(p.vendaId)}
                            className="text-blue-600 hover:underline"
                          >
                            #{p.vendaId}
                          </button>
                        ) : (
                          <span className="text-gray-500">{p.descricao || 'Manual'}</span>
                        )}
                      </td>
                      <td className="py-1">{p.dataVenda ? formatarData(p.dataVenda) : '-'}</td>
                      <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                      <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                      <td className="py-1">{p.codigoBaixa || '-'}</td>
                      <td className="py-1">{formatarData(p.pagoEm)}</td>
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
                    {exibirVencimentoStatus && (
                      <>
                        <th className="py-1">Vencimento</th>
                        <th className="py-1">Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {grupo.pendencias.map((p) => (
                    <tr key={p.contaId} className="border-t">
                      <td className="py-1">
                        {p.vendaId ? (
                          <button
                            onClick={() => setVendaDetalheId(p.vendaId)}
                            className="text-blue-600 hover:underline"
                          >
                            #{p.vendaId}
                          </button>
                        ) : (
                          <span className="text-gray-500">{p.descricao || 'Manual'}</span>
                        )}
                      </td>
                      <td className="py-1">{p.dataVenda ? formatarData(p.dataVenda) : '-'}</td>
                      <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                      <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                      {exibirVencimentoStatus && (
                        <>
                          <td className="py-1">{formatarData(p.vencimento)}</td>
                          <td className="py-1">
                            <StatusPendenciaBadge status={p.status} diasAtraso={p.diasAtraso} />
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            )}

            {aba === 'perdas' && (
              <table className="w-full text-sm">
                <thead className="text-left text-gray-500">
                  <tr>
                    <th className="py-1">Venda</th>
                    <th className="py-1">Data Venda</th>
                    <th className="py-1">Valor Venda</th>
                    <th className="py-1">Valor Perdido</th>
                    <th className="py-1">Venc. Original</th>
                    <th className="py-1">Perdido em</th>
                    <th className="py-1">Motivo</th>
                  </tr>
                </thead>
                <tbody>
                  {grupo.perdas.map((p) => (
                    <tr key={p.contaId} className="border-t">
                      <td className="py-1">
                        <button
                          onClick={() => setVendaDetalheId(p.vendaId)}
                          className="text-blue-600 hover:underline"
                        >
                          #{p.vendaId}
                        </button>
                      </td>
                      <td className="py-1">{formatarData(p.dataVenda)}</td>
                      <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                      <td className="py-1 font-medium text-gray-700">
                        R$ {p.valor.toFixed(2)}
                      </td>
                      <td className="py-1">
                        {formatarData(p.vencimentoOriginal)}
                      </td>
                      <td className="py-1">
                        {p.perdidoEm ? formatarData(p.perdidoEm) : '-'}
                      </td>
                      <td className="py-1">{p.motivo || '-'}</td>
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
      )}

      <VendaDetalheModal vendaId={vendaDetalheId} onClose={() => setVendaDetalheId(null)} />
    </div>
  );
}
