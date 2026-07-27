import { useEffect, useState } from 'react';
import { Building2, Plus, Pencil, Trash2 } from 'lucide-react';
import api from '../lib/api';
import Modal from '../components/Modal.jsx';
import SortableTh from '../components/SortableTh.jsx';
import { useSort } from '../lib/useSort';

const FORM_INICIAL = { cnpj: '', razaoSocial: '', telefone: '' };

export default function Empresas() {
  const [lista, setLista] = useState([]);
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState(FORM_INICIAL);
  const [editandoId, setEditandoId] = useState(null);

  const { dadosOrdenados, sortKey, sortDir, requestSort } = useSort(
    lista,
    {
      cnpj: (e) => e.cnpj,
      razaoSocial: (e) => e.razaoSocial?.toLowerCase(),
      telefone: (e) => e.telefone,
      createdAt: (e) => e.createdAt,
    },
    'createdAt',
    'desc'
  );

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
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Building2 className="w-6 h-6 text-slate-700" />
          Empresas
        </h1>
        <button
          onClick={abrirNovo}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 flex items-center gap-1.5"
        >
          <Plus className="w-4 h-4" />
          Nova Empresa
        </button>
      </div>

      <div className="overflow-x-auto">
      <table className="w-full bg-white rounded shadow overflow-hidden">
        <thead className="bg-slate-100 text-left text-sm">
          <tr>
            <SortableTh label="CNPJ" sortKey="cnpj" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Razão Social" sortKey="razaoSocial" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <SortableTh label="Telefone" sortKey="telefone" currentKey={sortKey} currentDir={sortDir} onSort={requestSort} />
            <th className="p-3 w-32">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {dadosOrdenados.map((e) => (
            <tr key={e.id} className="border-t">
              <td className="p-3">{e.cnpj}</td>
              <td className="p-3">{e.razaoSocial}</td>
              <td className="p-3">{e.telefone}</td>
              <td className="p-3 space-x-3">
                <button onClick={() => abrirEdicao(e)} className="text-blue-600 hover:underline inline-flex items-center gap-1">
                  <Pencil className="w-3.5 h-3.5" />
                  Editar
                </button>
                <button onClick={() => excluir(e.id)} className="text-red-600 hover:underline inline-flex items-center gap-1">
                  <Trash2 className="w-3.5 h-3.5" />
                  Excluir
                </button>
              </td>
            </tr>
          ))}
          {dadosOrdenados.length === 0 && (
            <tr>
              <td colSpan={4} className="p-3 text-center text-gray-400">
                Nenhuma empresa cadastrada
              </td>
            </tr>
          )}
        </tbody>
      </table>
      </div>

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
