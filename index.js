/**
 * ============================================================
 *  AIRPORT CLOSE RESIDENTS ASSOCIATION — WhatsApp Receipt Bot
 *  Built by Strongs Engineering
 * ============================================================
 */

require('dotenv').config();
const { default: makeWASocket, useMultiFileAuthState, DisconnectReason } = require('@whiskeysockets/baileys');
const fs = require('fs');
const { generateReceipt } = require('./receipt');
const { extractPaymentDetails, extractPaymentDetailsFromPDF } = require('./vision');
const { findResident, updateResidentAfterPayment } = require('./sheets');
const { startServer, setQR, setConnected } = require('./server');

const sessions = {};

// ─── OFFICIAL ACCOUNT DETAILS ────────────────────────────────
// For testing: accepts any recipient but flags mismatches
// Replace with real Airport Close account details later
const OFFICIAL_ACCOUNTS = [
  { accountNumber: '0123456789', accountName: 'AIRPORT CLOSE RESIDENTS ASSOCIATION', bank: 'GTBank' },
  { accountNumber: '9876543210', accountName: 'AIRPORT CLOSE RESIDENTS ASSOC', bank: 'Access Bank' },
];

function verifyRecipient(extracted) {
  const receiver = (extracted.receiver || '').toLowerCase().trim();
  if (!receiver) return { verified: false, reason: 'Recipient name not detected in screenshot' };

  for (const acc of OFFICIAL_ACCOUNTS) {
    const officialName = acc.accountName.toLowerCase();
    const keywords = officialName.split(' ').filter(w => w.length > 3);
    const matchCount = keywords.filter(kw => receiver.includes(kw)).length;
    if (matchCount / keywords.length >= 0.5) return { verified: true, account: acc };
    if ((extracted.reference || '').includes(acc.accountNumber)) return { verified: true, account: acc };
  }

  return { verified: false, reason: `Recipient "${extracted.receiver}" does not match Airport Close's official account` };
}

function parseAmount(amountStr) {
  if (!amountStr) return 0;
  return parseFloat(amountStr.toString().replace(/[₦,\s]/g, '')) || 0;
}

async function startBot() {
  // Start the web server first so /qr is available immediately
  startServer();

  const { state, saveCreds } = await useMultiFileAuthState('auth_info');

  const sock = makeWASocket({
    auth: state,
    printQRInTerminal: false, // We use web page instead
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      // Send QR to web server so it shows on the /qr page
      setQR(qr);
    }

    if (connection === 'close') {
      setConnected(false);
      const shouldReconnect =
        lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Connection closed. Reconnecting:', shouldReconnect);
      if (shouldReconnect) startBot();
    }

    if (connection === 'open') {
      setConnected(true);
      console.log('✅ WhatsApp Bot is connected and running!');
    }
  });

  sock.ev.on('messages.upsert', async ({ messages }) => {
    for (const msg of messages) {
      if (msg.key.fromMe) continue;

      const from = msg.key.remoteJid;
      const messageContent = msg.message;
      if (!messageContent) continue;

      const textBody =
        messageContent?.conversation ||
        messageContent?.extendedTextMessage?.text ||
        '';

      const isImage = !!messageContent?.imageMessage;
      const isDocument = !!messageContent?.documentMessage;
      const documentMime = messageContent?.documentMessage?.mimetype || '';
      const isPDF = isDocument && documentMime === 'application/pdf';

      console.log(`📩 From ${from} | image:${isImage} pdf:${isPDF} text:"${textBody}"`);

      if (!sessions[from]) sessions[from] = { step: 0, data: {} };
      const session = sessions[from];

      try {

        // ── STEP 0: Waiting for screenshot or PDF ──────────────
        if (session.step === 0) {
          if (isImage || isPDF) {
            const fileType = isPDF ? 'PDF' : 'screenshot';
            await sock.sendMessage(from, {
              text: `📸 *${fileType} received!* Please hold on while I read it...`,
            });

            const mediaBuffer = await downloadMedia(sock, msg);
            console.log(`   Buffer: ${mediaBuffer.length} bytes`);

            const extracted = isPDF
              ? await extractPaymentDetailsFromPDF(mediaBuffer)
              : await extractPaymentDetails(mediaBuffer);

            if (!extracted || extracted.error || !extracted.amount) {
              await sock.sendMessage(from, {
                text:
                  `⚠️ I could not read the payment details clearly from this ${fileType}.\n\n` +
                  `Please make sure it shows the full payment confirmation and try again.\n\n` +
                  `You can send:\n• A *screenshot* (image) of your payment\n• A *PDF* receipt from your bank app`,
              });
              continue;
            }

            session.data.extracted = extracted;
            session.step = 1;

            await sock.sendMessage(from, {
              text:
                `✅ I can see the following payment details:\n\n` +
                `💰 *Amount:* ${extracted.amount}\n` +
                `📅 *Date:* ${extracted.date || 'Not detected'}\n` +
                `🔖 *Reference:* ${extracted.reference || 'Not detected'}\n` +
                `🏦 *Platform:* ${extracted.platform || 'Not detected'}\n` +
                `👤 *Recipient:* ${extracted.receiver || 'Not detected'}\n\n` +
                `📝 *What is this payment for?*\n(e.g. Monthly levy, Security dues, Water bill, etc.)`,
            });
          } else {
            await sock.sendMessage(from, {
              text:
                '👋 Welcome to *Airport Close Residents Association* Receipt Bot!\n\n' +
                'To generate your receipt, please send:\n' +
                '📷 A *screenshot* of your payment confirmation, or\n' +
                '📄 A *PDF* receipt from your bank app\n\n' +
                'I will read it and generate your official receipt automatically.',
            });
          }
          continue;
        }

        // ── STEP 1: Payment purpose ────────────────────────────
        if (session.step === 1) {
          if (!textBody.trim()) {
            await sock.sendMessage(from, { text: 'Please type what this payment is for.' });
            continue;
          }
          session.data.purpose = textBody.trim();
          session.step = 2;
          await sock.sendMessage(from, { text: '👤 *What is your full name?*' });
          continue;
        }

        // ── STEP 2: Full name ──────────────────────────────────
        if (session.step === 2) {
          if (!textBody.trim()) {
            await sock.sendMessage(from, { text: 'Please type your full name.' });
            continue;
          }
          session.data.fullName = textBody.trim();
          session.step = 3;
          await sock.sendMessage(from, {
            text: '🏠 *What is your house/plot number on Airport Close?*\n(e.g. 12, 5B, Flat 3)',
          });
          continue;
        }

        // ── STEP 3: Address ────────────────────────────────────
        if (session.step === 3) {
          if (!textBody.trim()) {
            await sock.sendMessage(from, { text: 'Please type your house or plot number.' });
            continue;
          }
          session.data.address = textBody.trim();

          // Verify recipient account
          const verification = verifyRecipient(session.data.extracted);

          if (!verification.verified) {
            session.step = 4;
            await sock.sendMessage(from, {
              text:
                `⚠️ *Account Verification Warning*\n\n` +
                `The payment recipient on your screenshot is:\n` +
                `*"${session.data.extracted.receiver || 'Not detected'}"*\n\n` +
                `This does not match Airport Close Residents Association's official account.\n\n` +
                `Please double-check your screenshot and confirm:\n` +
                `• Did you pay to the correct Airport Close account?\n\n` +
                `Reply *YES* if you're sure this is correct, or *NO* to cancel and recheck.`,
            });
          } else {
            session.step = 5;
            await lookupAndPrompt(sock, from, session);
          }
          continue;
        }

        // ── STEP 4: Recipient warning confirmation ─────────────
        if (session.step === 4) {
          const reply = textBody.trim().toUpperCase();
          if (reply === 'YES' || reply === 'Y') {
            session.step = 5;
            await lookupAndPrompt(sock, from, session);
          } else if (reply === 'NO' || reply === 'N') {
            sessions[from] = { step: 0, data: {} };
            await sock.sendMessage(from, {
              text: '🔄 Cancelled. Please recheck your payment and send the correct screenshot when ready.',
            });
          } else {
            await sock.sendMessage(from, {
              text: 'Please reply *YES* if the payment is correct, or *NO* to cancel.',
            });
          }
          continue;
        }

        // ── STEP 5: Final YES/NO confirmation ──────────────────
        if (session.step === 5) {
          const reply = textBody.trim().toUpperCase();
          if (reply === 'YES' || reply === 'Y') {
            session.step = 6;
            await generateAndSend(sock, from, session);
          } else if (reply === 'NO' || reply === 'N') {
            sessions[from] = { step: 0, data: {} };
            await sock.sendMessage(from, {
              text: '🔄 No problem! Let\'s start over. Please send your payment screenshot again.',
            });
          } else {
            await sock.sendMessage(from, {
              text: 'Please reply *YES* to generate your receipt or *NO* to start over.',
            });
          }
          continue;
        }

      } catch (err) {
        console.error('❌ Error:', err);
        await sock.sendMessage(from, {
          text: '⚠️ Something went wrong on our end. Please try again or contact admin.',
        });
        sessions[from] = { step: 0, data: {} };
      }
    }
  });
}

async function lookupAndPrompt(sock, from, session) {
  const { fullName, address, extracted } = session.data;
  await sock.sendMessage(from, { text: '🔍 Looking up your details in our records...' });

  let resident = null;
  let sheetError = false;

  try {
    resident = await findResident(fullName, address);
  } catch (err) {
    console.error('Sheet error:', err.message);
    sheetError = true;
  }

  session.data.resident = resident;
  const amountPaid = parseAmount(extracted.amount);
  const outstanding = resident ? resident.outstanding : null;
  const remaining = outstanding !== null ? Math.max(0, outstanding - amountPaid) : null;
  session.data.amountPaid = amountPaid;
  session.data.remaining = remaining;

  let confirmMsg =
    `📋 *Please confirm your receipt details:*\n\n` +
    `👤 *Name:* ${session.data.fullName}\n` +
    `🏠 *Address:* ${session.data.address}\n` +
    `📝 *Payment for:* ${session.data.purpose}\n` +
    `💰 *Amount Paid:* ${extracted.amount}\n` +
    `📅 *Payment Date:* ${extracted.date || 'N/A'}\n` +
    `🔖 *Reference No:* ${extracted.reference || 'N/A'}\n` +
    `🏦 *Platform:* ${extracted.platform || 'N/A'}\n` +
    `👤 *Recipient:* ${extracted.receiver || 'N/A'}\n`;

  if (resident) {
    confirmMsg +=
      `\n📊 *Account Summary:*\n` +
      `   Previous Outstanding: ₦${resident.outstanding.toLocaleString()}\n` +
      `   Amount Paid: ₦${amountPaid.toLocaleString()}\n` +
      `   *Remaining Balance: ₦${remaining.toLocaleString()}*\n`;
  } else if (sheetError) {
    confirmMsg += `\n⚠️ Could not load account balance (sheet error). Receipt will be generated without balance info.\n`;
  } else {
    confirmMsg += `\n⚠️ *Resident not found in records.* Receipt will still be generated but please contact admin.\n`;
  }

  confirmMsg += `\nAre these details correct? Reply *YES* to generate receipt or *NO* to start over.`;
  await sock.sendMessage(from, { text: confirmMsg });
}

async function generateAndSend(sock, from, session) {
  await sock.sendMessage(from, { text: '⏳ Generating your receipt, please wait...' });

  const receiptNo = 'ACRA-' + Date.now().toString().slice(-6);
  session.data.receiptNo = receiptNo;

  const receiptPath = await generateReceipt(session.data, from, receiptNo);

  await sock.sendMessage(from, {
    document: fs.readFileSync(receiptPath),
    mimetype: 'application/pdf',
    fileName: `Receipt_${receiptNo}.pdf`,
    caption:
      `✅ *Receipt generated successfully!*\n\n` +
      `Thank you, *${session.data.fullName}*.\n` +
      `Receipt No: *${receiptNo}*\n` +
      (session.data.remaining !== null
        ? `Remaining Balance: *₦${session.data.remaining.toLocaleString()}*\n`
        : '') +
      `\n_Powered by Strongs Engineering_`,
  });

  fs.unlinkSync(receiptPath);

  if (session.data.resident) {
    try {
      await updateResidentAfterPayment(
        session.data.resident.rowIndex,
        session.data.amountPaid,
        receiptNo,
        session.data.extracted.date
      );
    } catch (err) {
      console.error('⚠️ Sheet update failed:', err.message);
    }
  }

  sessions[from] = { step: 0, data: {} };
}

async function downloadMedia(sock, msg) {
  const { downloadMediaMessage } = require('@whiskeysockets/baileys');
  return await downloadMediaMessage(msg, 'buffer', {});
}

startBot().catch(console.error);
