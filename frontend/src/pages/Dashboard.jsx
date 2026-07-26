import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import api from '../lib/api';

function primeiroDiaMes() {
  const hoje = new Date();
  return new Date(hoje.getFullYear(), hoje.getMonth(), 1).toISOString().slice(0, 10);
}

export default function Dashboard() {
  const [dataInicio, setDataInicio] = useState(primeiroDiaMes());
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().slice(0, 10));
  const [empresaId, setEmpresaId] = useState('');
  const [empresas, setEmpresas] = useState([]);
  const [dados, setDados] = useState(null);

  async function carregar() {
    const { data } = await api.get('/dashboard', {
      params: { dataInicio, dataFim, empresaId: empresaId || undefined },
    });
    setDados(data);
  }

  useEffect(() => {
    api.get('/empresas').then((res) => setEmpresas(res.data));
    carregar();
  }, []);

  if (!dados) return <div>Carregando...</div>;

  const comparativoNota = [
    {
      tipo: 'Com Nota',
      Compras: dados.totalCompradoComNota,
      Vendas: dados.totalVendidoComNota,
    },
    {
      tipo: 'Sem Nota',
      Compras: dados.totalComprado - dados.totalCompradoComNota,
      Vendas: dados.totalVendido - dados.totalVendidoComNota,
    },
  ];

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
        <button
          onClick={carregar}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Filtrar
        </button>
      </div>

      <div className="text-sm font-semibold text-gray-500 mb-2">Movimento do Período</div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Total Vendido</div>
          <div className="text-2xl font-bold">R$ {dados.totalVendido.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Total Comprado</div>
          <div className="text-2xl font-bold">R$ {dados.totalComprado.toFixed(2)}</div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm text-gray-500">Lucro</div>
          <div
            className={`text-2xl font-bold ${
              dados.lucroTotal < 0 ? 'text-red-600' : 'text-green-700'
            }`}
          >
            R$ {dados.lucroTotal.toFixed(2)}
          </div>
        </div>
      </div>

      <div className="text-sm font-semibold text-gray-500 mb-2">Pendências (todas as datas)</div>
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Contas a Receber</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-500">Em Aberto</div>
              <div className="text-lg font-bold text-yellow-700">
                R$ {dados.contasReceber.pendente.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Vencido</div>
              <div className="text-lg font-bold text-red-600">
                R$ {dados.contasReceber.atrasado.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Geral</div>
              <div className="text-lg font-bold">R$ {dados.contasReceber.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
        <div className="bg-white rounded shadow p-4">
          <div className="text-sm font-medium text-gray-700 mb-3">Contas a Pagar</div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <div className="text-xs text-gray-500">Em Aberto</div>
              <div className="text-lg font-bold text-yellow-700">
                R$ {dados.contasPagar.pendente.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Vencido</div>
              <div className="text-lg font-bold text-red-600">
                R$ {dados.contasPagar.atrasado.toFixed(2)}
              </div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Total Geral</div>
              <div className="text-lg font-bold">R$ {dados.contasPagar.total.toFixed(2)}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded shadow p-4 mb-6">
        <div className="text-sm text-gray-500 mb-2">Vendas, Compras e Lucro por Dia</div>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={dados.vendasPorDia}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="data" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
            <Legend />
            <Line type="monotone" dataKey="vendas" name="Vendas" stroke="#0f172a" strokeWidth={2} />
            <Line type="monotone" dataKey="compras" name="Compras" stroke="#dc2626" strokeWidth={2} />
            <Line type="monotone" dataKey="lucro" name="Lucro" stroke="#16a34a" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="bg-white rounded shadow p-4">
        <div className="text-sm text-gray-500 mb-1">
          Comparativo Compras x Vendas — Com Nota x Sem Nota
        </div>
        <div className="text-xs text-gray-400 mb-2">
          Para apoio na apuração do que precisa ser declarado no período.
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={comparativoNota}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="tipo" />
            <YAxis />
            <Tooltip formatter={(value) => `R$ ${Number(value).toFixed(2)}`} />
            <Legend />
            <Bar dataKey="Compras" fill="#dc2626" />
            <Bar dataKey="Vendas" fill="#16a34a" />
          </BarChart>
        </ResponsiveContainer>
        <div className="grid grid-cols-2 gap-4 mt-4 text-sm">
          <div>
            <div className="text-gray-500">Total Comprado com Nota</div>
            <div className="font-semibold">R$ {dados.totalCompradoComNota.toFixed(2)}</div>
          </div>
          <div>
            <div className="text-gray-500">Total Vendido com Nota</div>
            <div className="font-semibold">R$ {dados.totalVendidoComNota.toFixed(2)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
