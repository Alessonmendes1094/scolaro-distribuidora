import { useEffect, useState } from 'react';
import api from '../lib/api';

export default function Caixa() {
  const [dataInicio, setDataInicio] = useState('');
  const [dataFim, setDataFim] = useState('');
  const [resumo, setResumo] = useState({ movimentos: [], totalEntradas: 0, totalSaidas: 0, saldo: 0 });

  async function carregar() {
    const params = {};
    if (dataInicio) params.dataInicio = dataInicio;
    if (dataFim) params.dataFim = dataFim;
    const { data } = await api.get('/caixa', { params });
    setResumo(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Caixa</h1>

      <div className="flex gap-3 items-end mb-4">
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
          onClick={carregar}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Filtrar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Entradas</div>
          <div className="text-xl font-bold text-green-700">
            R$ {resumo.totalEntradas.toFixed(2)}
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Saídas</div>
          <div className="text-xl font-bold text-red-700">R$ {resumo.totalSaidas.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Saldo</div>
          <div className="text-xl font-bold">R$ {resumo.saldo.toFixed(2)}</div>
        </div>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Data</th>
            <th className="p-3">Tipo</th>
            <th className="p-3">Descrição</th>
            <th className="p-3">Valor</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {resumo.movimentos.map((m) => (
            <tr key={m.id} className="border-t">
              <td className="p-3">{new Date(m.data).toLocaleDateString('pt-BR')}</td>
              <td className="p-3">
                <span
                  className={
                    m.tipo === 'ENTRADA'
                      ? 'text-green-700 font-medium'
                      : 'text-red-700 font-medium'
                  }
                >
                  {m.tipo}
                </span>
              </td>
              <td className="p-3">{m.descricao}</td>
              <td className="p-3">R$ {Number(m.valor).toFixed(2)}</td>
            </tr>
          ))}
          {resumo.movimentos.length === 0 && (
            <tr>
              <td colSpan={4} className="p-3 text-center text-gray-400">
                Nenhum movimento no período
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
