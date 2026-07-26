export function baixarCsv(nomeArquivo, linhas) {
  if (!linhas.length) return;
  const cabecalho = Object.keys(linhas[0]).join(';');
  const corpo = linhas
    .map((linha) => Object.values(linha).map((v) => `"${v ?? ''}"`).join(';'))
    .join('\n');
  const conteudo = `${cabecalho}\n${corpo}`;

  const blob = new Blob([conteudo], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  link.click();
  URL.revokeObjectURL(url);
}
