/**
 * ============================================================
 *  receipt.js — PDF Receipt Generator
 *  Generates branded receipts for Airport Close Residents Assoc.
 * ============================================================
 */

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

async function generateReceipt(sessionData, from, receiptNo) {
  return new Promise((resolve, reject) => {
    const { fullName, address, purpose, extracted, resident, amountPaid, remaining } = sessionData;
    const { amount, date, reference, platform, sender, receiver, status } = extracted;

    receiptNo = receiptNo || ('ACRA-' + Date.now().toString().slice(-6));

    const fileName = `receipt_${crypto.randomBytes(4).toString('hex')}.pdf`;
    const filePath = path.join(os.tmpdir(), fileName);

    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    const stream = fs.createWriteStream(filePath);
    doc.pipe(stream);

    const darkGreen = '#1A5C38';
    const lightGreen = '#E8F5E9';
    const accentGreen = '#2E7D32';
    const black = '#212121';
    const grey = '#757575';
    const white = '#FFFFFF';
    const dividerGrey = '#BDBDBD';
    const redBg = '#FFEBEE';
    const redText = '#C62828';

    const pageWidth = doc.page.width - 100;

    // ─── HEADER ─────────────────────────────────
    doc.rect(0, 0, doc.page.width, 130).fill(darkGreen);

    doc.fillColor(white).fontSize(20).font('Helvetica-Bold')
      .text('AIRPORT CLOSE RESIDENTS ASSOCIATION', 50, 30, { align: 'center', width: pageWidth });

    doc.fontSize(11).font('Helvetica').fillColor('#A5D6A7')
      .text('Official Payment Receipt', 50, 58, { align: 'center', width: pageWidth });

    doc.fontSize(9).fillColor('#C8E6C9')
      .text('Airport Close, Lagos State, Nigeria', 50, 78, { align: 'center', width: pageWidth });

    doc.roundedRect(doc.page.width / 2 - 80, 95, 160, 28, 14).fill('#FFFFFF');
    doc.fillColor(darkGreen).fontSize(10).font('Helvetica-Bold')
      .text('✓  PAYMENT CONFIRMED', doc.page.width / 2 - 70, 102, { width: 140, align: 'center' });

    // ─── RECEIPT NO & DATE ───────────────────────
    const nowStr = new Date().toLocaleString('en-NG', {
      dateStyle: 'long', timeStyle: 'short', timeZone: 'Africa/Lagos',
    });

    doc.y = 145;
    doc.fillColor(grey).fontSize(9).font('Helvetica')
      .text(`Receipt No: ${receiptNo}`, 50, 145)
      .text(`Issued: ${nowStr}`, 50, 158, { align: 'right', width: pageWidth });

    doc.moveTo(50, 175).lineTo(50 + pageWidth, 175).strokeColor(dividerGrey).lineWidth(0.5).stroke();

    // ─── RESIDENT DETAILS ───────────────────────
    doc.y = 185;
    sectionTitle(doc, 'RESIDENT DETAILS', accentGreen, pageWidth);
    tableRow(doc, 'Full Name', fullName || 'N/A', lightGreen, black, pageWidth);
    tableRow(doc, 'Address', address || 'N/A', white, black, pageWidth);
    tableRow(doc, 'WhatsApp Number', formatPhone(from), lightGreen, black, pageWidth);

    // ─── PAYMENT DETAILS ────────────────────────
    doc.moveDown(0.6);
    sectionTitle(doc, 'PAYMENT DETAILS', accentGreen, pageWidth);
    tableRow(doc, 'Purpose of Payment', purpose || 'N/A', lightGreen, black, pageWidth);
    tableRow(doc, 'Amount Paid', amount || 'N/A', white, black, pageWidth);
    tableRow(doc, 'Payment Date', date || 'N/A', lightGreen, black, pageWidth);
    tableRow(doc, 'Payment Platform', platform || 'N/A', white, black, pageWidth);
    tableRow(doc, 'Transaction Status', status || 'Successful', lightGreen, '#1B5E20', pageWidth);
    tableRow(doc, 'Reference / Trans. ID', reference || 'N/A', white, black, pageWidth);
    if (sender) tableRow(doc, 'Sender Name', sender, lightGreen, black, pageWidth);
    if (receiver) tableRow(doc, 'Recipient Account', receiver, white, black, pageWidth);

    // ─── BALANCE SUMMARY ─────────────────────────
    if (resident !== undefined) {
      doc.moveDown(0.6);
      sectionTitle(doc, 'ACCOUNT BALANCE SUMMARY', accentGreen, pageWidth);

      const prevOutstanding = resident ? resident.outstanding : null;
      const paid = amountPaid || 0;
      const balance = remaining !== null && remaining !== undefined ? remaining : null;

      if (prevOutstanding !== null) {
        tableRow(doc, 'Previous Outstanding', `₦${prevOutstanding.toLocaleString()}`, lightGreen, black, pageWidth);
      }
      tableRow(doc, 'Amount Paid', `₦${paid.toLocaleString()}`, white, '#1B5E20', pageWidth);

      if (balance !== null) {
        const balBg = balance > 0 ? redBg : '#E8F5E9';
        const balColor = balance > 0 ? redText : '#1B5E20';
        tableRow(doc, 'Remaining Balance', `₦${balance.toLocaleString()}`, balBg, balColor, pageWidth);

        if (balance > 0) {
          // Add a small notice
          const noticeY = doc.y + 4;
          doc.fillColor(redText).fontSize(8).font('Helvetica')
            .text(`* You still have an outstanding balance of ₦${balance.toLocaleString()}. Please clear this at your earliest convenience.`,
              60, noticeY, { width: pageWidth - 20 });
          doc.y = noticeY + 18;
        }
      }
    }

    // ─── STAMP AREA ──────────────────────────────
    doc.moveDown(1);
    const stampY = doc.y;

    doc.rect(50, stampY, 180, 60).strokeColor(dividerGrey).lineWidth(0.5).stroke();
    doc.fillColor(grey).fontSize(8).text('Authorized Signature', 50, stampY + 40, { width: 180, align: 'center' });
    doc.fillColor(accentGreen).fontSize(9).font('Helvetica-Bold')
      .text('Airport Close Residents Association', 50, stampY + 52, { width: 180, align: 'center' });

    doc.circle(50 + pageWidth - 45, stampY + 30, 38).strokeColor(accentGreen).lineWidth(1.5).stroke();
    doc.fillColor(accentGreen).fontSize(7).font('Helvetica-Bold')
      .text('OFFICIAL', 50 + pageWidth - 80, stampY + 20, { width: 70, align: 'center' })
      .text('RECEIPT', 50 + pageWidth - 80, stampY + 31, { width: 70, align: 'center' });
    doc.fontSize(6).font('Helvetica').fillColor(grey)
      .text('ACRA', 50 + pageWidth - 80, stampY + 43, { width: 70, align: 'center' });

    // ─── FOOTER ──────────────────────────────────
    const footerY = doc.page.height - 60;
    doc.moveTo(50, footerY).lineTo(50 + pageWidth, footerY).strokeColor(dividerGrey).lineWidth(0.5).stroke();
    doc.fillColor(grey).fontSize(8).font('Helvetica')
      .text('This is an electronically generated receipt. For inquiries, contact your estate management.',
        50, footerY + 8, { align: 'center', width: pageWidth });
    doc.fillColor('#BDBDBD').fontSize(7)
      .text('Powered by Strongs Engineering  |  Receipt Bot v1.0', 50, footerY + 22, { align: 'center', width: pageWidth });

    doc.end();
    stream.on('finish', () => { console.log(`✅ Receipt: ${filePath}`); resolve(filePath); });
    stream.on('error', reject);
  });
}

function sectionTitle(doc, title, color, pageWidth) {
  const y = doc.y;
  doc.rect(50, y, pageWidth, 20).fill(color);
  doc.fillColor('#FFFFFF').fontSize(9).font('Helvetica-Bold').text(title, 60, y + 5, { width: pageWidth - 20 });
  doc.y = y + 20;
}

function tableRow(doc, label, value, bgColor, textColor, pageWidth) {
  const y = doc.y;
  const rowHeight = 22;
  doc.rect(50, y, pageWidth, rowHeight).fill(bgColor);
  doc.fillColor('#666666').fontSize(8).font('Helvetica').text(label, 60, y + 6, { width: pageWidth * 0.38 });
  doc.fillColor(textColor).fontSize(8.5).font('Helvetica-Bold')
    .text(value || 'N/A', 60 + pageWidth * 0.4, y + 6, { width: pageWidth * 0.55 });
  doc.y = y + rowHeight;
}

function formatPhone(from) {
  if (!from) return 'N/A';
  const number = from.split('@')[0];
  if (number.startsWith('234') && number.length >= 13) {
    return `+${number.slice(0, 3)} ${number.slice(3, 6)} ${number.slice(6, 9)} ${number.slice(9)}`;
  }
  return `+${number}`;
}

module.exports = { generateReceipt };
