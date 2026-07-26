import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import api from '../lib/api';
import { baixarPdf } from '../lib/pdf';
import { STATUS_LABEL } from '../lib/status';

const TITULOS = {
  'vendas-por-cliente': 'Relatório de Vendas por Cliente',
  'pagamentos-recebidos': 'Relatório de Pagamentos Recebidos',
  'pagamentos-pendentes': 'Relatório de Pagamentos Pendentes',
};

export default function RelatorioImpressao() {
  const { tipo } = useParams();
  const [searchParams] = useSearchParams();
  const [resultado, setResultado] = useState(null);
  const [erro, setErro] = useState('');

  const clienteNomeFiltro = searchParams.get('clienteNome');
  const dataInicio = searchParams.get('dataInicio');
  const dataFim = searchParams.get('dataFim');

  useEffect(() => {
    async function carregar() {
      try {
        const params = {};
        const clienteId = searchParams.get('clienteId');
        const empresaId = searchParams.get('empresaId');
        const status = searchParams.get('status');
        if (clienteId) params.clienteId = clienteId;
        if (empresaId) params.empresaId = empresaId;
        if (status) params.status = status;
        if (dataInicio) params.dataInicio = dataInicio;
        if (dataFim) params.dataFim = dataFim;
        const { data } = await api.get(`/relatorios/${tipo}`, { params });
        setResultado(data);
      } catch (err) {
        setErro(err.response?.data?.error || 'Erro ao carregar relatório');
      }
    }
    carregar();
  }, [tipo]);

  if (erro) return <div className="p-8 text-red-600">{erro}</div>;
  if (!resultado) return <div className="p-8">Carregando...</div>;

  const valorGeral = resultado.reduce((acc, g) => acc + g.valorTotal, 0);

  function exportarPdf() {
    const subtitulos = [];
    if (clienteNomeFiltro) subtitulos.push(`Cliente: ${clienteNomeFiltro}`);
    if (searchParams.get('status')) {
      const statusValor = searchParams.get('status');
      subtitulos.push(`Status: ${STATUS_LABEL[statusValor] || statusValor}`);
    }
    if (dataInicio || dataFim) {
      subtitulos.push(
        `Período: ${dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : '...'} até ${
          dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : '...'
        }`
      );
    }

    let colunas = [];
    const linhas = [];

    if (tipo === 'vendas-por-cliente') {
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
    } else if (tipo === 'pagamentos-recebidos') {
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
      nomeArquivo: `${tipo}.pdf`,
      titulo: TITULOS[tipo] || 'Relatório',
      subtitulos,
      colunas,
      linhas,
    });
  }

  return (
    <div className="min-h-screen bg-white text-black p-8 max-w-3xl mx-auto text-sm">
      <div className="no-print flex justify-end gap-2 mb-4">
        <button
          onClick={exportarPdf}
          className="bg-white border px-4 py-2 rounded hover:bg-gray-50"
        >
          Baixar PDF
        </button>
        <button
          onClick={() => window.print()}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Imprimir
        </button>
      </div>

      <div className="flex items-center gap-4 border-b-2 border-black pb-4 mb-4">
        <img src="/logo-scolaro.png" alt="Scolaro Distribuidora" className="h-16 w-auto" />
        <div>
          <h1 className="text-xl font-bold">{TITULOS[tipo] || 'Relatório'}</h1>
          {clienteNomeFiltro && <p className="text-gray-600">Cliente: {clienteNomeFiltro}</p>}
          {searchParams.get('status') && (
            <p className="text-gray-600">
              Status: {STATUS_LABEL[searchParams.get('status')] || searchParams.get('status')}
            </p>
          )}
          {(dataInicio || dataFim) && (
            <p className="text-gray-600">
              Período: {dataInicio ? new Date(dataInicio).toLocaleDateString('pt-BR') : '...'} até{' '}
              {dataFim ? new Date(dataFim).toLocaleDateString('pt-BR') : '...'}
            </p>
          )}
        </div>
      </div>

      {resultado.map((grupo) => (
        <div key={grupo.clienteId} className="mb-6">
          <div className="flex justify-between border-b border-black pb-1 mb-2">
            <div className="font-semibold">{grupo.clienteNome}</div>
            <div className="font-semibold">R$ {grupo.valorTotal.toFixed(2)}</div>
          </div>

          {tipo === 'vendas-por-cliente' && (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1">Venda</th>
                  <th className="py-1">Data</th>
                  <th className="py-1">Pagamento</th>
                  <th className="py-1">Qtd.</th>
                  <th className="py-1">Valor</th>
                  <th className="py-1 text-right">Status Pendência</th>
                </tr>
              </thead>
              <tbody>
                {grupo.vendas.map((v) => (
                  <tr key={v.id} className="border-t border-gray-200">
                    <td className="py-1">#{v.id}</td>
                    <td className="py-1">{new Date(v.data).toLocaleDateString('pt-BR')}</td>
                    <td className="py-1">{v.formaPagamento}</td>
                    <td className="py-1">{v.quantidade}</td>
                    <td className="py-1">R$ {v.valorTotal.toFixed(2)}</td>
                    <td className="py-1 text-right">
                      {STATUS_LABEL[v.statusPendencia] || v.statusPendencia}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tipo === 'pagamentos-recebidos' && (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1">Venda</th>
                  <th className="py-1">Data Venda</th>
                  <th className="py-1">Valor Venda</th>
                  <th className="py-1">Valor Recebido</th>
                  <th className="py-1">Código Baixa</th>
                  <th className="py-1 text-right">Recebido em</th>
                </tr>
              </thead>
              <tbody>
                {grupo.pagamentos.map((p) => (
                  <tr key={p.contaId} className="border-t border-gray-200">
                    <td className="py-1">#{p.vendaId}</td>
                    <td className="py-1">{new Date(p.dataVenda).toLocaleDateString('pt-BR')}</td>
                    <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                    <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                    <td className="py-1">{p.codigoBaixa || '-'}</td>
                    <td className="py-1 text-right">
                      {new Date(p.pagoEm).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {tipo === 'pagamentos-pendentes' && (
            <table className="w-full text-sm">
              <thead className="text-left text-gray-500">
                <tr>
                  <th className="py-1">Venda</th>
                  <th className="py-1">Data Venda</th>
                  <th className="py-1">Valor Venda</th>
                  <th className="py-1">Valor Pendente</th>
                  <th className="py-1">Vencimento</th>
                  <th className="py-1 text-right">Status</th>
                </tr>
              </thead>
              <tbody>
                {grupo.pendencias.map((p) => (
                  <tr key={p.contaId} className="border-t border-gray-200">
                    <td className="py-1">#{p.vendaId}</td>
                    <td className="py-1">{new Date(p.dataVenda).toLocaleDateString('pt-BR')}</td>
                    <td className="py-1">R$ {p.valorVenda.toFixed(2)}</td>
                    <td className="py-1">R$ {p.valor.toFixed(2)}</td>
                    <td className="py-1">{new Date(p.vencimento).toLocaleDateString('pt-BR')}</td>
                    <td className="py-1 text-right">{STATUS_LABEL[p.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}

      {resultado.length === 0 && (
        <div className="text-center text-gray-400 py-8">Nenhum dado para este filtro</div>
      )}

      <div className="flex justify-end border-t-2 border-black pt-2 mt-4">
        <div className="text-right">
          <div className="text-gray-600">Total Geral</div>
          <div className="text-xl font-bold">R$ {valorGeral.toFixed(2)}</div>
        </div>
      </div>

      <div className="mt-12 pt-4 border-t border-gray-300 text-xs text-gray-500 text-center">
        Documento gerado em {new Date().toLocaleString('pt-BR')}.
      </div>
    </div>
  );
}
