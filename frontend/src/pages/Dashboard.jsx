import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import api from '../lib/api';

function primeiroDiaMes() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes());
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [dados, setDados] = useState(null);

  async function carregar() {
    const { data } = await api.get('/dashboard', { params: { dataInicio, dataFim } });
    setDados(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  if (!dados) return <div>Carregando...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Dashboard</h1>

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
          onClick={carregar}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Filtrar
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Total Vendido no Período</div>
          <div className="text-2xl font-bold">R$ {dados.totalVendido.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Contas a Receber Pendente</div>
          <div className="text-2xl font-bold">R$ {dados.contasReceber.pendente.toFixed(2)}</div>
          {dados.contasReceber.atrasado > 0 && (
            <div className="text-sm text-red-600 font-medium mt-1">
              Atrasado: R$ {dados.contasReceber.atrasado.toFixed(2)}
            </div>
          )}
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Contas a Pagar Pendente</div>
          <div className="text-2xl font-bold">R$ {dados.contasPagar.pendente.toFixed(2)}</div>
          {dados.contasPagar.atrasado > 0 && (
            <div className="text-sm text-red-600 font-medium mt-1">
              Atrasado: R$ {dados.contasPagar.atrasado.toFixed(2)}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="text-sm text-gray-500 mb-2">Vendas por Dia</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dados.vendasPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
            <Line type="monotone" dataKey="total" stroke="#0f172a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
