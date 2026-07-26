export const FORMA_PAGAMENTO_LABEL = {
  FIADO: 'Vale',
  BOLETO: 'Boleto',
  A_VISTA: 'À Vista',
  PIX: 'Pix',
  DINHEIRO: 'Dinheiro',
};

export const FORMA_PAGAMENTO_OPCOES = [
  { value: 'A_VISTA', label: 'À Vista' },
  { value: 'PIX', label: 'Pix' },
  { value: 'DINHEIRO', label: 'Dinheiro' },
  { value: 'BOLETO', label: 'Boleto' },
  { value: 'FIADO', label: 'Vale' },
];

// Formas cuja liquidação é imediata: geram movimento de caixa direto,
// sem criar conta a pagar/receber nem exigir vencimento.
export const FORMAS_PAGAMENTO_IMEDIATAS = ['A_VISTA', 'PIX', 'DINHEIRO'];
