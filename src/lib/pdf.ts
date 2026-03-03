import jsPDF from 'jspdf';
import { Loan } from './types';

export function generateLoanPDF(loan: Loan) {
  const doc = new jsPDF();

  doc.addFont('/fonts/NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = 20;

  const loanNumber = loan.id.slice(0, 8).toUpperCase();
  const date = new Date(loan.createdAt).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const totalAmount = loan.amount + (loan.amount * loan.interestRate) / 100;

  // Title
  doc.setFontSize(14);
  const title = `ДОГОВОР ЗАЙМА № ${loanNumber}`;
  doc.text(title, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  doc.text(`г. ${loan.city}`, margin, y);
  doc.text(`«${date}»`, pageWidth - margin, y, { align: 'right' });
  y += 12;

  doc.setFontSize(10);

  const addWrappedText = (text: string) => {
    const lines = doc.splitTextToSize(text, usableWidth);
    doc.text(lines, margin, y);
    y += lines.length * 5.5;
  };

  const addSection = (title: string) => {
    y += 4;
    doc.setFontSize(11);
    doc.text(title, margin, y);
    y += 7;
    doc.setFontSize(10);
  };

  // Preamble
  addWrappedText(
    `Гражданин Российской Федерации ${loan.lenderName}, паспорт: ${loan.lenderPassport}, именуемый в дальнейшем «Займодавец», с одной стороны, и гражданин Российской Федерации ${loan.borrowerName}, паспорт: ${loan.borrowerPassport}, именуемый в дальнейшем «Заемщик», с другой стороны, заключили настоящий договор о нижеследующем.`
  );

  // Section 1
  addSection('1. Предмет договора');
  addWrappedText(
    `1.1. Займодавец передает Заемщику денежные средства в размере ${loan.amount.toLocaleString('ru-RU')} рублей.`
  );
  addWrappedText(
    `1.2. Заемщик обязуется вернуть указанную сумму займа в срок до ${new Date(loan.repaymentDate).toLocaleDateString('ru-RU')}.`
  );

  // Section 2
  addSection('2. Проценты по займу');
  addWrappedText(
    `2.1. За пользование денежными средствами устанавливается процентная ставка ${loan.interestRate} %.`
  );
  addWrappedText(
    `2.2. Общая сумма к возврату составляет ${totalAmount.toLocaleString('ru-RU')} рублей.`
  );

  // Section 3
  addSection('3. Порядок передачи денежных средств');
  addWrappedText(
    '3.1. Передача денежных средств осуществляется путем банковского перевода либо иным способом, согласованным сторонами.'
  );
  addWrappedText(
    '3.2. Моментом передачи денежных средств считается момент их зачисления на счет Заемщика.'
  );

  // Section 4
  addSection('4. Ответственность сторон');
  addWrappedText(
    `4.1. В случае просрочки возврата займа Заемщик обязан уплатить неустойку в размере ${loan.penaltyRate} % от суммы задолженности за каждый день просрочки.`
  );

  // Section 5
  addSection('5. Разрешение споров');
  addWrappedText(
    '5.1. Все споры и разногласия, возникающие из настоящего договора, подлежат разрешению в судебном порядке в соответствии с законодательством Российской Федерации.'
  );

  // Section 6
  addSection('6. Заключительные положения');
  addWrappedText(
    '6.1. Настоящий договор вступает в силу с момента его подписания сторонами.'
  );
  addWrappedText(
    '6.2. Договор составлен в электронной форме и подписан электронной подписью сторон.'
  );

  // Signatures
  y += 10;
  doc.setLineWidth(0.3);

  doc.text('Займодавец:', margin, y);
  doc.text('Заемщик:', pageWidth / 2 + 10, y);
  y += 7;
  doc.text(loan.lenderName, margin, y);
  doc.text(loan.borrowerName, pageWidth / 2 + 10, y);
  y += 10;
  doc.text('Подпись: ___________________', margin, y);
  doc.text('Подпись: ___________________', pageWidth / 2 + 10, y);

  doc.save(`договор-займа-${loanNumber}.pdf`);
}
