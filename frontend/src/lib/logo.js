import api from './api';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3333';
export const LOGO_PADRAO = '/logo-scolaro.png';

export async function buscarLogoUrl() {
  try {
    const { data } = await api.get('/configuracoes/logo');
    if (data.logoUrl) return `${API_URL}${data.logoUrl}`;
  } catch {
    // sem logo customizada ainda, ou erro de rede — usa o padrão
  }
  return LOGO_PADRAO;
}
