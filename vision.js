/**
 * ============================================================
 *  vision.js — AI Payment Screenshot & PDF Reader
 *  Uses Claude AI to extract payment details from images or PDFs
 * ============================================================
 */

const Anthropic = require('@anthropic-ai/sdk');

const anthropic = new Anthropic();

// The prompt used for both image and PDF extraction
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

/**
 * Detects the actual image type from the buffer magic bytes
 * This fixes the bug where PNG files were being sent as image/jpeg
 */
function detectImageType(buffer) {
  // Check magic bytes at the start of the file
  const header = buffer.slice(0, 4);

  if (header[0] === 0xFF && header[1] === 0xD8) return 'image/jpeg';
  if (header[0] === 0x89 && header[1] === 0x50) return 'image/png';
  if (header[0] === 0x47 && header[1] === 0x49) return 'image/gif';
  if (header[0] === 0x52 && header[1] === 0x49) return 'image/webp';

  // Default to jpeg if unknown (most common for WhatsApp)
  return 'image/jpeg';
}

/**
 * Parses Claude's response safely — handles cases where
 * Claude wraps JSON in markdown code blocks
 */
function parseJSON(rawText) {
  let text = rawText.trim();

  // Strip markdown code blocks if present (```json ... ``` or ``` ... ```)
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();

  return JSON.parse(text);
}

/**
 * Extracts payment details from an IMAGE buffer (screenshot)
 * @param {Buffer} imageBuffer
 * @returns {Object}
 */
async function extractPaymentDetails(imageBuffer) {
  try {
    console.log('🤖 Sending image to Claude AI for analysis...');

    const base64Image = imageBuffer.toString('base64');
    const mediaType = detectImageType(imageBuffer);
    console.log(`   Detected image type: ${mediaType}`);

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType, // ← now correctly detected, not hardcoded
                data: base64Image,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content[0].text.trim();
    console.log('✅ Claude AI raw response (image):', rawText);

    const extracted = parseJSON(rawText);
    console.log('✅ Parsed result:', JSON.stringify(extracted));
    return extracted;

  } catch (err) {
    console.error('❌ Full error extracting from image:');
    console.error('   Message:', err.message);
    console.error('   Status:', err.status);
    console.error('   Stack:', err.stack);
    return { error: err.message };
  }
}

/**
 * Extracts payment details from a PDF buffer
 * Claude supports PDFs natively as a document type
 * @param {Buffer} pdfBuffer
 * @returns {Object}
 */
async function extractPaymentDetailsFromPDF(pdfBuffer) {
  try {
    console.log('🤖 Sending PDF to Claude AI for analysis...');

    const base64PDF = pdfBuffer.toString('base64');

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',           // ← Claude's native PDF support
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: base64PDF,
              },
            },
            {
              type: 'text',
              text: EXTRACTION_PROMPT,
            },
          ],
        },
      ],
    });

    const rawText = response.content[0].text.trim();
    console.log('✅ Claude AI PDF response (full):', rawText);

    const extracted = parseJSON(rawText);
    console.log('✅ Parsed PDF result:', JSON.stringify(extracted));
    return extracted;

  } catch (err) {
    console.error('❌ Full error extracting from PDF:');
    console.error('   Message:', err.message);
    console.error('   Status:', err.status);
    console.error('   Stack:', err.stack);
    return { error: err.message };
  }
}

module.exports = { extractPaymentDetails, extractPaymentDetailsFromPDF };
