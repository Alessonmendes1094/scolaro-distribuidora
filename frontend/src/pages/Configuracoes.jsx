import { useEffect, useRef, useState } from 'react';
import { Settings, Upload, ImageIcon } from 'lucide-react';
import api from '../lib/api';
import { buscarLogoUrl, LOGO_PADRAO } from '../lib/logo';

export default function Configuracoes() {
  const [logoAtual, setLogoAtual] = useState(LOGO_PADRAO);
  const [preview, setPreview] = useState(null);
  const [arquivo, setArquivo] = useState(null);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');
  const inputRef = useRef(null);

  async function carregarLogo() {
    const url = await buscarLogoUrl();
    setLogoAtual(url);
  }

  useEffect(() => {
    carregarLogo();
  }, []);

  function selecionarArquivo(e) {
    const file = e.target.files?.[0];
    setErro('');
    setSucesso('');
    if (!file) {
      setArquivo(null);
      setPreview(null);
      return;
    }
    if (!file.type.startsWith('image/')) {
      setErro('Selecione um arquivo de imagem (PNG, JPG, etc.)');
      return;
    }
    setArquivo(file);
    setPreview(URL.createObjectURL(file));
  }

  async function enviarLogo() {
    if (!arquivo) return;
    setEnviando(true);
    setErro('');
    setSucesso('');
    try {
      const formData = new FormData();
      formData.append('logo', arquivo);
      await api.post('/configuracoes/logo', formData);
      setSucesso('Logo atualizada com sucesso!');
      setArquivo(null);
      setPreview(null);
      if (inputRef.current) inputRef.current.value = '';
      await carregarLogo();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao enviar a logo');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4 flex items-center gap-2">
        <Settings className="w-6 h-6 text-slate-700" />
        Configurações
      </h1>

      <div className="bg-white rounded shadow p-6 max-w-xl">
        <h2 className="text-lg font-semibold mb-1 flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          Logo do Sistema
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Essa imagem aparece nos recibos e relatórios impressos. Formatos
          aceitos: PNG, JPG (até 5MB).
        </p>

        <div className="flex items-center gap-6 mb-4">
          <div>
            <div className="text-xs text-gray-500 mb-1">Atual</div>
            <img
              src={logoAtual}
              alt="Logo atual"
              className="h-20 w-auto bg-gray-50 border rounded p-2"
              onError={(e) => {
                e.target.src = LOGO_PADRAO;
              }}
            />
          </div>
          {preview && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Nova (pré-visualização)</div>
              <img src={preview} alt="Pré-visualização" className="h-20 w-auto bg-gray-50 border rounded p-2" />
            </div>
          )}
        </div>

        {erro && <div className="text-sm text-red-600 mb-3">{erro}</div>}
        {sucesso && <div className="text-sm text-green-700 mb-3">{sucesso}</div>}

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          onChange={selecionarArquivo}
          className="block w-full text-sm mb-4"
        />

        <button
          onClick={enviarLogo}
          disabled={!arquivo || enviando}
          className="bg-slate-900 text-white px-4 py-2 rounded hover:bg-slate-800 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Upload className="w-4 h-4" />
          {enviando ? 'Enviando...' : 'Salvar Nova Logo'}
        </button>
      </div>
    </div>
  );
}
