import { useEffect, useState } from 'react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';

const FORM_INICIAL = { cnpj: '', razaoSocial: '', telefone: '' };

export default function Empresas() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);

  async function carregar() {
    const { data } = await api.get('/empresas');
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

  function abrirEdicao(empresa) {
    setForm({
      cnpj: empresa.cnpj,
      razaoSocial: empresa.razaoSocial,
      telefone: empresa.telefone || '',
    });
    setEditandoId(empresa.id);
    setModalAberto(true);
  }

  async function salvar(e) {
    e.preventDefault();
    if (editandoId) {
      await api.put(`/empresas/${editandoId}`, form);
    } else {
      await api.post('/empresas', form);
    }
    setModalAberto(false);
    carregar();
  }

  async function excluir(id) {
    if (!confirm('Deseja realmente excluir esta empresa?')) return;
    await api.delete(`/empresas/${id}`);
    carregar();
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Empresas</h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800"
        >
          Nova Empresa
        </button>
      </div>

      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <th className="p-3">CNPJ</th>
            <th className="p-3">Razão Social</th>
            <th className="p-3">Telefone</th>
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {lista.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-3">{e.cnpj}</td>
              <td className="p-3">{e.razaoSocial}</td>
              <td className="p-3">{e.telefone}</td>
              <td className="p-3 space-x-2">
                <button onClick={() => abrirEdicao(e)} className="text-blue-600 hover:underline">
                  Editar
                </button>
                <button onClick={() => excluir(e.id)} className="text-red-600 hover:underline">
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {lista.length === 0 && (
            <tr>
              <td colSpan={4} className="p-3 text-center text-gray-400">
                Nenhuma empresa cadastrada
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <Modal
        open={modalAberto}
        title={editandoId ? 'Editar Empresa' : 'Nova Empresa'}
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
          <label className="block text-sm mb-1">Razão Social</label>
          <input
            className="w-full border rounded px-3 py-2 mb-4"
            value={form.razaoSocial}
            onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })}
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
