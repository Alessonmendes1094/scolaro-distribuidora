import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export function baixarPdf({ nomeArquivo, titulo, subtitulos = [], colunas, linhas }) {
  const doc = new jsPDF();

  doc.setFontSize(14);
  doc.text(titulo, 14, 16);

  let cursorY = 22;
  doc.setFontSize(10);
  doc.setTextColor(100);
  for (const linha of subtitulos) {
    doc.text(linha, 14, cursorY);
    cursorY += 5;
  }

  autoTable(doc, {
    startY: cursorY + 2,
    head: [colunas],
    body: linhas,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 23, 42] },
  });

  doc.save(nomeArquivo);
}
