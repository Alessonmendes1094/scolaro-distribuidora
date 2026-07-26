import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const FORM_INICIAL = { cnpj: '', nome: '', endereco: '', responsavel: '', telefone: '' };

export default function Clientes() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    const { data } = await api.get('/clientes');
    setLista(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setForm(FORM_INICIAL);
    setEditandoId(null);
    setModalAberto(true);
  }

  function abrirEdicao(cliente) {
    setForm({
      cnpj: cliente.cnpj,
      nome: cliente.nome,
      endereco: cliente.endereco || '',
      responsavel: cliente.responsavel || '',
      telefone: cliente.telefone || '',
    });
    setEditandoId(cliente.id);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (editandoId) {
      await api.put(`/clientes/${editandoId}`, form);
    } else {
      await api.post('/clientes', form);
    }
    setModalAberto(false);
    carregar();
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir este cliente?')) return;
    await api.delete(`/clientes/${id}`);
    carregar();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Clientes</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Novo Cliente
        </button>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">CNPJ</th>
            <th className="p-3">Nome</th>
            <th className="p-3">Responsável</th>
            <th className="p-3">Telefone</th>
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((c) => (
            <tr key={c.id} className="border-t">
              <td className="p-3">{c.cnpj}</td>
              <td className="p-3">{c.nome}</td>
              <td className="p-3">{c.responsavel}</td>
              <td className="p-3">{c.telefone}</td>
              <td className="p-3 space-x-2">
                <button onClick={() => abrirEdicao(c)} className="text-blue-600 hover:underline">
                  Editar
                </button>
                <button onClick={() => excluir(c.id)} className="text-red-600 hover:underline">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={5} className="p-3 text-center text-gray-400">
                Nenhum cliente cadastrado
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal
        open={modalAberto}
        title={editandoId ? 'Editar Cliente' : 'Novo Cliente'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar}>
          <label className="block text-sm mb-1">CNPJ</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.cnpj}
            onChange={(e) => setForm({ ...form, cnpj: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Nome</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
          />
          <label className="block text-sm mb-1">Endereço</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.endereco}
            onChange={(e) => setForm({ ...form, endereco: e.target.value })}
          />
          <label className="block text-sm mb-1">Responsável</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.responsavel}
            onChange={(e) => setForm({ ...form, responsavel: e.target.value })}
          />
          <label className="block text-sm mb-1">Telefone</label>
          <input
            className="w-full border rounded px-3 py-2 mb-6"
            value={form.telefone}
            onChange={(e) => setForm({ ...form, telefone: e.target.value })}
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
