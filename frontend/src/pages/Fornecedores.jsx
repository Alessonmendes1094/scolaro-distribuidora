import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

export default function Fornecedores() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', telefone: '' });
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    const { data } = await api.get('/fornecedores');
    setLista(data);
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setForm({ nome: '', telefone: '' });
    setEditandoId(null);
    setModalAberto(true);
  }

  function abrirEdicao(fornecedor) {
    setForm({ nome: fornecedor.nome, telefone: fornecedor.telefone || '' });
    setEditandoId(fornecedor.id);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (editandoId) {
      await api.put(`/fornecedores/${editandoId}`, form);
    } else {
      await api.post('/fornecedores', form);
    }
    setModalAberto(false);
    carregar();
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir este fornecedor?')) return;
    await api.delete(`/fornecedores/${id}`);
    carregar();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Fornecedores</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Novo Fornecedor
        </button>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">Nome</th>
            <th className="p-3">Telefone</th>
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((f) => (
            <tr key={f.id} className="border-t">
              <td className="p-3">{f.nome}</td>
              <td className="p-3">{f.telefone}</td>
              <td className="p-3 space-x-2">
                <button onClick={() => abrirEdicao(f)} className="text-blue-600 hover:underline">
                  Editar
                </button>
                <button onClick={() => excluir(f.id)} className="text-red-600 hover:underline">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={3} className="p-3 text-center text-gray-400">
                Nenhum fornecedor cadastrado
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal
        open={modalAberto}
        title={editandoId ? 'Editar Fornecedor' : 'Novo Fornecedor'}
        onClose={() => setModalAberto(false)}
      >
        <form onSubmit={salvar}>
          <label className="block text-sm mb-1">Nome</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.nome}
            onChange={(e) => setForm({ ...form, nome: e.target.value })}
            required
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
