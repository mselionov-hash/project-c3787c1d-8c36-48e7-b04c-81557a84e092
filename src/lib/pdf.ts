import jsPDF from 'jspdf';

interface SignatureData {
  role: string;
  signature_data: string;
  signed_at: string;
  signer_ip: string | null;
}

interface LoanPDFData {
  id: string;
  lender_name: string;
  borrower_name: string;
  lender_passport: string | null;
  borrower_passport: string | null;
  lender_address: string | null;
  borrower_address: string | null;
  amount: number;
  interest_rate: number;
  penalty_rate: number;
  repayment_date: string;
  issue_date: string;
  city: string;
  notes: string | null;
  created_at: string;
  transaction_id?: string;
  transfer_date?: string;
  signatures?: SignatureData[];
}

export function generateLoanPDF(loan: LoanPDFData) {
  const doc = new jsPDF();

  doc.addFont('/fonts/NotoSans-Regular.ttf', 'NotoSans', 'normal');
  doc.setFont('NotoSans');

  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const usableWidth = pageWidth - margin * 2;
  let y = 20;

  const loanNumber = loan.id.slice(0, 8).toUpperCase();
  const date = new Date(loan.created_at).toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });
  const totalAmount = Number(loan.amount) + (Number(loan.amount) * Number(loan.interest_rate)) / 100;

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

  const checkPage = () => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
  };

  // Title
  doc.setFontSize(14);
  doc.text(`ДОГОВОР ЗАЙМА № ${loanNumber}`, pageWidth / 2, y, { align: 'center' });
  y += 10;

  doc.setFontSize(11);
  doc.text(`г. ${loan.city}`, margin, y);
  doc.text(`«${date}»`, pageWidth - margin, y, { align: 'right' });
  y += 12;

  doc.setFontSize(10);

  // Preamble
  addWrappedText(
    `Гражданин Российской Федерации ${loan.lender_name}, паспорт: ${loan.lender_passport || '___________'}${loan.lender_address ? `, зарегистрированный по адресу: ${loan.lender_address}` : ''}, именуемый в дальнейшем «Займодавец», с одной стороны, и гражданин Российской Федерации ${loan.borrower_name}, паспорт: ${loan.borrower_passport || '___________'}${loan.borrower_address ? `, зарегистрированный по адресу: ${loan.borrower_address}` : ''}, именуемый в дальнейшем «Заемщик», с другой стороны, заключили настоящий договор о нижеследующем.`
  );

  checkPage();
  addSection('1. Предмет договора');
  addWrappedText(`1.1. Займодавец передает Заемщику денежные средства в размере ${Number(loan.amount).toLocaleString('ru-RU')} рублей.`);
  addWrappedText(`1.2. Дата выдачи займа: ${new Date(loan.issue_date).toLocaleDateString('ru-RU')}.`);
  addWrappedText(`1.3. Заемщик обязуется вернуть указанную сумму займа в срок до ${new Date(loan.repayment_date).toLocaleDateString('ru-RU')}.`);

  checkPage();
  addSection('2. Проценты по займу');
  addWrappedText(`2.1. За пользование денежными средствами устанавливается процентная ставка ${Number(loan.interest_rate)} %.`);
  addWrappedText(`2.2. Общая сумма к возврату составляет ${totalAmount.toLocaleString('ru-RU')} рублей.`);

  checkPage();
  addSection('3. Порядок передачи денежных средств');
  addWrappedText('3.1. Передача денежных средств осуществляется путем банковского перевода либо иным способом, согласованным сторонами.');
  addWrappedText('3.2. Моментом передачи денежных средств считается момент их зачисления на счет Заемщика.');

  if (loan.transaction_id && loan.transfer_date) {
    checkPage();
    y += 2;
    addWrappedText(
      `Факт передачи денежных средств подтверждается платежной операцией № ${loan.transaction_id} от ${new Date(loan.transfer_date).toLocaleDateString('ru-RU')}.`
    );
  }

  checkPage();
  addSection('4. Ответственность сторон');
  addWrappedText(`4.1. В случае просрочки возврата займа Заемщик обязан уплатить неустойку в размере ${Number(loan.penalty_rate)} % от суммы задолженности за каждый день просрочки.`);

  checkPage();
  addSection('5. Разрешение споров');
  addWrappedText('5.1. Все споры и разногласия, возникающие из настоящего договора, подлежат разрешению в судебном порядке в соответствии с законодательством Российской Федерации.');

  checkPage();
  addSection('6. Заключительные положения');
  addWrappedText('6.1. Настоящий договор вступает в силу с момента его подписания сторонами.');
  addWrappedText('6.2. Договор составлен в электронной форме и подписан электронной подписью сторон.');

  // Signatures section
  checkPage();
  y += 10;

  const lenderSig = loan.signatures?.find(s => s.role === 'lender');
  const borrowerSig = loan.signatures?.find(s => s.role === 'borrower');

  const sigLeftX = margin;
  const sigRightX = pageWidth / 2 + 10;

  doc.setFontSize(10);
  doc.text('Займодавец:', sigLeftX, y);
  doc.text('Заемщик:', sigRightX, y);
  y += 7;
  doc.text(loan.lender_name, sigLeftX, y);
  doc.text(loan.borrower_name, sigRightX, y);
  y += 5;

  // Add signature images if available
  if (lenderSig || borrowerSig) {
    y += 3;
    const sigHeight = 20;
    const sigWidth = 50;

    if (lenderSig) {
      try {
        doc.addImage(lenderSig.signature_data, 'PNG', sigLeftX, y, sigWidth, sigHeight);
        doc.setFontSize(7);
        doc.text(
          `Подписано: ${new Date(lenderSig.signed_at).toLocaleString('ru-RU')}${lenderSig.signer_ip ? ` | IP: ${lenderSig.signer_ip}` : ''}`,
          sigLeftX, y + sigHeight + 4
        );
      } catch (e) {
        doc.text('Подпись: [электронная подпись]', sigLeftX, y + 5);
      }
    } else {
      doc.setFontSize(10);
      doc.text('Подпись: ___________________', sigLeftX, y + 10);
    }

    if (borrowerSig) {
      try {
        doc.addImage(borrowerSig.signature_data, 'PNG', sigRightX, y, sigWidth, sigHeight);
        doc.setFontSize(7);
        doc.text(
          `Подписано: ${new Date(borrowerSig.signed_at).toLocaleString('ru-RU')}${borrowerSig.signer_ip ? ` | IP: ${borrowerSig.signer_ip}` : ''}`,
          sigRightX, y + sigHeight + 4
        );
      } catch (e) {
        doc.text('Подпись: [электронная подпись]', sigRightX, y + 5);
      }
    } else {
      doc.setFontSize(10);
      doc.text('Подпись: ___________________', sigRightX, y + 10);
    }
  } else {
    y += 5;
    doc.text('Подпись: ___________________', sigLeftX, y);
    doc.text('Подпись: ___________________', sigRightX, y);
  }

  doc.save(`договор-займа-${loanNumber}.pdf`);
}
