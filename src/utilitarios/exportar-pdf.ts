import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { toast } from "sonner";

interface GerarPdfTabelaOpcoes {
  titulo: string;
  subtitulo?: string;
  colunas: string[];
  linhas: Array<Array<string | number | null | undefined>>;
  nomeArquivo: string;
}

/**
 * Gera um PDF formatado (cabeçalho + tabela) a partir de dados tabulares —
 * usado nos relatórios do painel administrativo, no lugar de window.print().
 */
export function gerarPdfTabela({
  titulo,
  subtitulo,
  colunas,
  linhas,
  nomeArquivo,
}: GerarPdfTabelaOpcoes) {
  const doc = new jsPDF({ orientation: colunas.length > 5 ? "landscape" : "portrait" });
  const margemEsquerda = 14;

  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.text("Hidro e Natação Monsenhor", margemEsquerda, 16);

  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text(titulo, margemEsquerda, 24);

  let proximaLinhaY = 30;

  if (subtitulo) {
    doc.setFontSize(9);
    doc.setTextColor(90);
    doc.text(subtitulo, margemEsquerda, proximaLinhaY);
    proximaLinhaY += 6;
  }

  doc.setFontSize(8);
  doc.setTextColor(130);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}`, margemEsquerda, proximaLinhaY);

  autoTable(doc, {
    startY: proximaLinhaY + 4,
    head: [colunas],
    body: linhas.map((linha) => linha.map((celula) => String(celula ?? "—"))),
    styles: { fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [30, 64, 175], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    theme: "grid",
    margin: { left: margemEsquerda, right: margemEsquerda },
  });

  doc.save(nomeArquivo);
  toast.success(`Arquivo ${nomeArquivo} exportado.`);
}
