/**
 * ============================================================
 *  server.js — QR Code Web Server
 *  Serves a webpage so you can scan the WhatsApp QR code
 *  from any browser without needing terminal access
 * ============================================================
 */

const express = require('express');
const QRCode = require('qrcode');

const app = express();
const PORT = process.env.PORT || 3000;

// Stores the latest QR code and connection status
let currentQR = null;
let isConnected = false;
let lastUpdated = null;

/**
 * Called by index.js whenever a new QR code is generated
 */
function setQR(qrString) {
  currentQR = qrString;
  isConnected = false;
  lastUpdated = new Date();
  console.log('📱 New QR code ready at /qr');
}

/**
 * Called by index.js when WhatsApp connects successfully
 */
function setConnected(status) {
  isConnected = status;
  if (status) {
    currentQR = null;
    lastUpdated = new Date();
    console.log('✅ WhatsApp connected — QR page updated');
  }
}

// ─── ROUTES ──────────────────────────────────────────────────

// Main QR page — open this in your browser to scan
app.get('/qr', async (req, res) => {
  if (isConnected) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt Bot — Connected</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f0f4f0;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: white; border-radius: 16px; padding: 40px;
            text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 400px; width: 90%;
          }
          .icon { font-size: 64px; margin-bottom: 16px; }
          h1 { color: #1A5C38; font-size: 22px; margin-bottom: 8px; }
          p { color: #666; font-size: 14px; line-height: 1.6; }
          .badge {
            display: inline-block; background: #E8F5E9; color: #1A5C38;
            padding: 6px 16px; border-radius: 20px; font-size: 13px;
            font-weight: 600; margin-top: 16px;
          }
          .time { color: #999; font-size: 12px; margin-top: 12px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="icon">✅</div>
          <h1>WhatsApp Bot is Connected!</h1>
          <p>Airport Close Residents Association Receipt Bot is running and ready to receive payments.</p>
          <div class="badge">🟢 Online</div>
          <p class="time">Connected at: ${lastUpdated?.toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) || 'N/A'}</p>
        </div>
      </body>
      </html>
    `);
  }

  if (!currentQR) {
    return res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt Bot — Loading</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="3">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f0f4f0;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh;
          }
          .card {
            background: white; border-radius: 16px; padding: 40px;
            text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 400px; width: 90%;
          }
          .spinner {
            width: 48px; height: 48px; border: 4px solid #E8F5E9;
            border-top-color: #1A5C38; border-radius: 50%;
            animation: spin 1s linear infinite; margin: 0 auto 20px;
          }
          @keyframes spin { to { transform: rotate(360deg); } }
          h1 { color: #1A5C38; font-size: 20px; margin-bottom: 8px; }
          p { color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="spinner"></div>
          <h1>Starting up...</h1>
          <p>QR code is being generated. This page will refresh automatically.</p>
        </div>
      </body>
      </html>
    `);
  }

  // Generate QR code as image
  try {
    const qrImageUrl = await QRCode.toDataURL(currentQR, {
      width: 300,
      margin: 2,
      color: { dark: '#1A5C38', light: '#FFFFFF' },
    });

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt Bot — Scan QR</title>
        <meta name="viewport" content="width=device-width, initial-scale=1">
        <meta http-equiv="refresh" content="30">
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: #f0f4f0;
            display: flex; align-items: center; justify-content: center;
            min-height: 100vh; padding: 20px;
          }
          .card {
            background: white; border-radius: 16px; padding: 32px;
            text-align: center; box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            max-width: 420px; width: 100%;
          }
          .logo { font-size: 32px; margin-bottom: 8px; }
          h1 { color: #1A5C38; font-size: 20px; margin-bottom: 4px; }
          .subtitle { color: #888; font-size: 13px; margin-bottom: 24px; }
          .qr-wrapper {
            background: #f8faf8; border: 2px solid #E8F5E9;
            border-radius: 12px; padding: 16px; display: inline-block;
            margin-bottom: 20px;
          }
          .qr-wrapper img { display: block; width: 260px; height: 260px; }
          .steps { text-align: left; background: #f8faf8; border-radius: 10px; padding: 16px; margin-bottom: 16px; }
          .steps h3 { color: #1A5C38; font-size: 13px; margin-bottom: 10px; }
          .step { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; font-size: 13px; color: #555; }
          .step-num {
            background: #1A5C38; color: white; border-radius: 50%;
            width: 20px; height: 20px; display: flex; align-items: center;
            justify-content: center; font-size: 11px; flex-shrink: 0; margin-top: 1px;
          }
          .warning { color: #e65100; font-size: 12px; margin-top: 4px; }
          .refresh { color: #999; font-size: 11px; margin-top: 12px; }
          .badge {
            display: inline-block; background: #FFF3E0; color: #e65100;
            padding: 4px 12px; border-radius: 20px; font-size: 12px; margin-bottom: 16px;
          }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="logo">📱</div>
          <h1>Airport Close Receipt Bot</h1>
          <p class="subtitle">Powered by Strongs Engineering</p>
          <div class="badge">⚡ Scan to Activate</div>
          <div class="qr-wrapper">
            <img src="${qrImageUrl}" alt="WhatsApp QR Code" />
          </div>
          <div class="steps">
            <h3>HOW TO SCAN:</h3>
            <div class="step">
              <div class="step-num">1</div>
              <span>Open <strong>WhatsApp</strong> on your phone</span>
            </div>
            <div class="step">
              <div class="step-num">2</div>
              <span>Tap <strong>Settings → Linked Devices → Link a Device</strong></span>
            </div>
            <div class="step">
              <div class="step-num">3</div>
              <span>Point your camera at the QR code above</span>
            </div>
          </div>
          <p class="warning">⚠️ QR code expires in ~60 seconds. Page auto-refreshes every 30s.</p>
          <p class="refresh">Last generated: ${lastUpdated?.toLocaleString('en-NG', { timeZone: 'Africa/Lagos' }) || 'just now'}</p>
        </div>
      </body>
      </html>
    `);
  } catch (err) {
    res.status(500).send('Error generating QR code: ' + err.message);
  }
});

// Health check endpoint — Railway uses this to know the app is alive
app.get('/', (req, res) => {
  res.json({
    status: isConnected ? 'connected' : 'waiting_for_qr',
    app: 'Airport Close Residents Association Receipt Bot',
    powered_by: 'Strongs Engineering',
    qr_page: '/qr',
  });
});

app.get('/status', (req, res) => {
  res.json({
    connected: isConnected,
    hasQR: !!currentQR,
    lastUpdated,
  });
});

function startServer() {
  app.listen(PORT, () => {
    console.log(`🌐 Web server running on port ${PORT}`);
    console.log(`📱 Open /qr in your browser to scan WhatsApp QR code`);
  });
}

module.exports = { startServer, setQR, setConnected };
