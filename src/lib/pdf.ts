import jsPDF from 'jspdf';
import { Loan } from './types';

export function generateLoanPDF(loan: Loan) {
  const doc = new jsPDF();
  
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('DOGOVOR ZAJMA', pageWidth / 2, 30, { align: 'center' });
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`No ${loan.id.slice(0, 8)}`, pageWidth / 2, 38, { align: 'center' });
  doc.text(`Data sozdaniya: ${new Date(loan.createdAt).toLocaleDateString('ru-RU')}`, pageWidth / 2, 44, { align: 'center' });

  // Separator
  doc.setLineWidth(0.5);
  doc.line(20, 50, pageWidth - 20, 50);

  // Body
  let y = 65;
  doc.setFontSize(12);
  
  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(`${label}:`, 25, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value, 80, y);
    y += 10;
  };

  addField('Zajmodavec', loan.lenderName);
  addField('Zaemschik', loan.borrowerName);
  addField('Summa', `${loan.amount.toLocaleString('ru-RU')} rub.`);
  addField('Stavka', `${loan.interestRate}% godovyh`);
  addField('Data vozvrata', new Date(loan.repaymentDate).toLocaleDateString('ru-RU'));

  if (loan.notes) {
    y += 5;
    doc.setFont('helvetica', 'bold');
    doc.text('Primechaniya:', 25, y);
    y += 8;
    doc.setFont('helvetica', 'normal');
    const lines = doc.splitTextToSize(loan.notes, pageWidth - 50);
    doc.text(lines, 25, y);
    y += lines.length * 6;
  }

  // Signatures
  y += 20;
  doc.setLineWidth(0.3);
  doc.line(25, y, 90, y);
  doc.line(pageWidth - 90, y, pageWidth - 25, y);
  y += 6;
  doc.setFontSize(10);
  doc.text('Zajmodavec', 25, y);
  doc.text('Zaemschik', pageWidth - 90, y);

  doc.save(`dogovor-zajma-${loan.id.slice(0, 8)}.pdf`);
}
