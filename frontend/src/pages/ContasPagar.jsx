import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const FORM_INICIAL = { descricao: '', categoria: 'OUTROS', valor: '', vencimento: '' };

const badge = {
  PENDENTE: 'bg-yellow-100 text-yellow-800',
  ATRASADO: 'bg-red-100 text-red-800',
  PAGO: 'bg-green-100 text-green-800',
};

export default function ContasPagar() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);

  async function carregar() {
    const { data } = await api.get('/contas-pagar');
    setLista(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setForm(FORM_INICIAL);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    await api.post('/contas-pagar', { ...form, valor: Number(form.valor) });
    setModalAberto(false);
    carregar();
  }

  async function marcarPago(id) {
    if (!confirm('Confirmar pagamento desta conta?')) return;
    await api.post(`/contas-pagar/${id}/pagar`);
    carregar();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Contas a Pagar</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Nova Despesa
        </button>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Descrição</th>
            <th className="p-3">Categoria</th>
            <th className="p-3">Valor</th>
            <th className="p-3">Vencimento</th>
            <th className="p-3">Status</th>
            <th className="p-3 w-28">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.descricao}</td>
              <td className="p-3">{c.categoria}</td>
              <td className="p-3">R$ {Number(c.valor).toFixed(2)}</td>
              <td className="p-3">{new Date(c.vencimento).toLocaleDateString('pt-BR')}</td>
              <td className="p-3">
                <span className={`px-2 py-1 rounded text-xs ${badge[c.status]}`}>{c.status}</span>
              </td>
              <td className="p-3">
                {c.status !== 'PAGO' && (
                  <button
                    onClick={() => marcarPago(c.id)}
                    className="text-green-700 hover:underline"
                  >
                    Marcar pago
                  </button>
                )}
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={6} className="p-3 text-center text-gray-400">
                Nenhuma conta a pagar cadastrada
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal open={modalAberto} title="Nova Despesa" onClose={() => setModalAberto(false)}>
        <form onSubmit={salvar}>
          <label className="block text-sm mb-1">Descrição</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.descricao}
            onChange={(e) => setForm({ ...form, descricao: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Categoria</label>
          <select
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.categoria}
            onChange={(e) => setForm({ ...form, categoria: e.target.value })}
          >
            <option value="COMBUSTIVEL">Combustível</option>
            <option value="MANUTENCAO">Manutenção</option>
            <option value="IMPOSTO">Imposto</option>
            <option value="MERCADORIA">Mercadoria</option>
            <option value="OUTROS">Outros</option>
          </select>
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
            className="w-full border rounded px-3 py-2 mb-6"
            value={form.vencimento}
            onChange={(e) => setForm({ ...form, vencimento: e.target.value })}
            required
          />
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
