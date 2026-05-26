/**
 * ============================================================
 *  sheets.js — Google Sheets Integration
 *  Reads and updates resident data from Google Sheets
 * ============================================================
 *
 * SHEET STRUCTURE (columns):
 *  A: Resident Name
 *  B: Address
 *  C: Phone Number
 *  D: Outstanding Amount (₦)
 *  E: Last Payment Date
 *  F: Last Payment Amount
 *  G: Last Receipt Number
 *  H: Total Paid
 *  I: Notes
 */

require('dotenv').config();
const { google } = require('googleapis');

// ─── AUTH SETUP ──────────────────────────────────────────────
// On Railway: reads credentials from GOOGLE_CREDENTIALS_JSON env variable
// Locally: reads from credentials.json file
function getAuth() {
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  return new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

// Column index map (0-based)
const COL = {
  NAME: 0,       // A
  ADDRESS: 1,    // B
  PHONE: 2,      // C
  OUTSTANDING: 3, // D
  LAST_DATE: 4,  // E
  LAST_AMOUNT: 5, // F
  LAST_RECEIPT: 6, // G
  TOTAL_PAID: 7, // H
  NOTES: 8,      // I
};

/**
 * Normalizes a name for fuzzy comparison:
 * - lowercase
 * - removes extra spaces
 * - splits into parts so "John Doe" == "Doe John"
 */
function normalizeName(name) {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .split(' ')
    .sort()
    .join(' ');
}

/**
 * Normalizes an address for comparison:
 * - lowercase
 * - removes common words like "no", "number", "plot", "close"
 * - extracts just the number/identifier
 */
function normalizeAddress(address) {
  return address
    .toLowerCase()
    .trim()
    .replace(/\b(no|number|plot|house|flat|apt|apartment|airport|close)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Checks if two names match (handles first/last name swap)
 */
function namesMatch(nameA, nameB) {
  if (!nameA || !nameB) return false;
  const a = normalizeName(nameA);
  const b = normalizeName(nameB);
  if (a === b) return true;

  // Check if one contains all words of the other
  const partsA = a.split(' ');
  const partsB = b.split(' ');
  const allMatch = partsA.every(part => partsB.includes(part));
  if (allMatch && partsA.length >= 2) return true;

  // Check partial match (at least 2 words in common)
  const commonWords = partsA.filter(p => partsB.includes(p) && p.length > 2);
  return commonWords.length >= 2;
}

/**
 * Checks if two addresses match
 */
function addressesMatch(addrA, addrB) {
  if (!addrA || !addrB) return false;
  const a = normalizeAddress(addrA);
  const b = normalizeAddress(addrB);
  if (a === b) return true;
  // Check if the number parts match
  const numA = a.match(/\d+[a-z]?/)?.[0];
  const numB = b.match(/\d+[a-z]?/)?.[0];
  if (numA && numB && numA === numB) return true;
  return a.includes(b) || b.includes(a);
}

/**
 * Looks up a resident in the Google Sheet by name and address
 * Returns the resident's row data and row index, or null if not found
 */
async function findResident(name, address) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: 'Residents!A2:I', // Skip header row
    });

    const rows = res.data.values || [];
    console.log(`🔍 Searching ${rows.length} residents for: "${name}" at "${address}"`);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const sheetName = row[COL.NAME] || '';
      const sheetAddress = row[COL.ADDRESS] || '';

      const nameOk = namesMatch(name, sheetName);
      const addrOk = addressesMatch(address, sheetAddress);

      console.log(`   Row ${i + 2}: "${sheetName}" / "${sheetAddress}" → name:${nameOk} addr:${addrOk}`);

      if (nameOk && addrOk) {
        const outstanding = parseFloat((row[COL.OUTSTANDING] || '0').toString().replace(/[₦,\s]/g, '')) || 0;
        const totalPaid = parseFloat((row[COL.TOTAL_PAID] || '0').toString().replace(/[₦,\s]/g, '')) || 0;

        console.log(`✅ Resident found at row ${i + 2}`);
        return {
          rowIndex: i + 2, // actual sheet row number (1-based, with header)
          name: sheetName,
          address: sheetAddress,
          phone: row[COL.PHONE] || '',
          outstanding,
          lastDate: row[COL.LAST_DATE] || '',
          lastAmount: row[COL.LAST_AMOUNT] || '',
          lastReceipt: row[COL.LAST_RECEIPT] || '',
          totalPaid,
          notes: row[COL.NOTES] || '',
        };
      }
    }

    console.log(`❌ Resident not found`);
    return null;

  } catch (err) {
    console.error('❌ Error reading Google Sheet:', err.message);
    throw err;
  }
}

/**
 * Updates the resident's row after payment:
 * - Deducts amount from outstanding
 * - Updates last payment date, amount, receipt number
 * - Adds to total paid
 */
async function updateResidentAfterPayment(rowIndex, amountPaid, receiptNo, paymentDate) {
  try {
    const auth = getAuth();
    const sheets = google.sheets({ version: 'v4', auth });

    // First read the current row to get existing values
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SHEET_ID,
      range: `Residents!A${rowIndex}:I${rowIndex}`,
    });

    const row = res.data.values?.[0] || [];
    const currentOutstanding = parseFloat((row[COL.OUTSTANDING] || '0').toString().replace(/[₦,\s]/g, '')) || 0;
    const currentTotalPaid = parseFloat((row[COL.TOTAL_PAID] || '0').toString().replace(/[₦,\s]/g, '')) || 0;

    const newOutstanding = Math.max(0, currentOutstanding - amountPaid);
    const newTotalPaid = currentTotalPaid + amountPaid;

    const nowStr = new Date().toLocaleString('en-NG', {
      dateStyle: 'short',
      timeZone: 'Africa/Lagos',
    });

    // Update columns D (outstanding), E (last date), F (last amount), G (last receipt), H (total paid)
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.SHEET_ID,
      range: `Residents!D${rowIndex}:H${rowIndex}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          `₦${newOutstanding.toLocaleString()}`,   // D: new outstanding
          paymentDate || nowStr,                    // E: last payment date
          `₦${amountPaid.toLocaleString()}`,        // F: last amount paid
          receiptNo,                                // G: receipt number
          `₦${newTotalPaid.toLocaleString()}`,      // H: total paid
        ]],
      },
    });

    console.log(`✅ Sheet updated: row ${rowIndex}, outstanding: ₦${newOutstanding}, total paid: ₦${newTotalPaid}`);
    return { newOutstanding, newTotalPaid };

  } catch (err) {
    console.error('❌ Error updating Google Sheet:', err.message);
    throw err;
  }
}

module.exports = { findResident, updateResidentAfterPayment };
