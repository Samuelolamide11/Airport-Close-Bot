require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const EXTRACTION_PROMPT = `You are a payment verification assistant for a Nigerian residents association.

Look at this payment proof carefully and extract the following details. Return ONLY a valid JSON object, no extra text, no markdown backticks:

{
  "amount": "amount paid including currency symbol e.g. ₦5,000",
  "date": "date and time of the transaction",
  "reference": "transaction reference or ID number",
  "sender": "name of the sender if visible",
  "receiver": "name or account that received the payment if visible",
  "platform": "payment platform e.g. Opay, Palmpay, GTBank, Access Bank, Moniepoint, Kuda, etc.",
  "status": "transaction status e.g. Successful, Completed, Failed",
  "error": null
}

Rules:
- Set any field to null if not visible
- If this is NOT a payment proof at all, return: {"error": "Not a payment screenshot"}
- Return ONLY the JSON, no other text whatsoever`;

function detectImageMime(buffer) {
  const h = buffer.slice(0, 4);
  if (h[0] === 0xFF && h[1] === 0xD8) return 'image/jpeg';
  if (h[0] === 0x89 && h[1] === 0x50) return 'image/png';
  if (h[0] === 0x47 && h[1] === 0x49) return 'image/gif';
  if (h[0] === 0x52 && h[1] === 0x49) return 'image/webp';
  return 'image/jpeg';
}

function parseJSON(rawText) {
  let text = rawText.trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  return JSON.parse(text);
}

async function extractPaymentDetails(imageBuffer) {
  try {
    console.log('🤖 Sending image to Gemini AI for analysis...');
    const mimeType = detectImageMime(imageBuffer);
    console.log(`   Detected image type: ${mimeType}`);
    console.log(`   Buffer size: ${imageBuffer.length} bytes`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { mimeType, data: imageBuffer.toString('base64') } },
    ]);

    const rawText = result.response.text().trim();
    console.log('✅ Gemini raw response:', rawText);
    const extracted = parseJSON(rawText);
    console.log('✅ Parsed result:', JSON.stringify(extracted));
    return extracted;

  } catch (err) {
    console.error('❌ Error extracting from image:', err.message);
    return { error: err.message };
  }
}

async function extractPaymentDetailsFromPDF(pdfBuffer) {
  try {
    console.log('🤖 Sending PDF to Gemini AI for analysis...');
    console.log(`   PDF buffer size: ${pdfBuffer.length} bytes`);

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent([
      EXTRACTION_PROMPT,
      { inlineData: { mimeType: 'application/pdf', data: pdfBuffer.toString('base64') } },
    ]);

    const rawText = result.response.text().trim();
    console.log('✅ Gemini PDF raw response:', rawText);
    const extracted = parseJSON(rawText);
    console.log('✅ Parsed PDF result:', JSON.stringify(extracted));
    return extracted;

  } catch (err) {
    console.error('❌ Error extracting from PDF:', err.message);
    return { error: err.message };
  }
}

module.exports = { extractPaymentDetails, extractPaymentDetailsFromPDF };
