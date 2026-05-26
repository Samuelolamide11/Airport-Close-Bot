# 📱 Airport Close Residents Association — WhatsApp Receipt Bot
### Built by Strongs Engineering

---

## 🧠 How It Works

1. A resident sends their **payment screenshot** to the bot's WhatsApp number
2. The bot uses **Claude AI** to read the screenshot and extract: amount, date, reference, platform
3. The bot asks 3 confirmation questions:
   - What is this payment for?
   - Your full name?
   - Your house/plot number?
4. The bot shows a **summary** and asks for confirmation (YES/NO)
5. On YES → bot generates and sends a **PDF receipt** instantly

---

## 🛠️ SETUP GUIDE (Step by Step)

### STEP 1 — Install Node.js
1. Go to: **https://nodejs.org**
2. Download the **LTS version** (the green button)
3. Install it (just click Next → Next → Finish)
4. Open **Command Prompt** (Windows) or **Terminal** (Mac/Linux)
5. Type: `node --version` — you should see something like `v20.x.x`

---

### STEP 2 — Get Your Claude AI API Key (Free)
1. Go to: **https://console.anthropic.com**
2. Sign up for a free account
3. Click on **"API Keys"** in the left menu
4. Click **"Create Key"**
5. Copy the key (it starts with `sk-ant-...`)

---

### STEP 3 — Set Up the Bot
1. Download or copy the bot folder to your computer
2. Open the folder in Command Prompt / Terminal:
   ```
   cd path/to/whatsapp-bot
   ```
3. Install the required packages:
   ```
   npm install
   ```
4. Create your environment file:
   - Find the file called `.env.example`
   - Make a copy of it and rename the copy to `.env`
   - Open `.env` with Notepad or any text editor
   - Replace `your_anthropic_api_key_here` with your actual key from Step 2
   - Save and close

---

### STEP 4 — Run the Bot
1. In Command Prompt / Terminal (inside the bot folder), run:
   ```
   npm start
   ```
2. A **QR code** will appear in the terminal
3. Open WhatsApp on your phone
4. Go to **Settings → Linked Devices → Link a Device**
5. Scan the QR code
6. You'll see: `✅ WhatsApp Bot is connected and running!`

> ⚠️ **Important:** The WhatsApp number you scan with becomes the bot number.
> Use a dedicated number (e.g. a separate SIM) — not your personal WhatsApp.

---

### STEP 5 — Test It
1. From a **different** WhatsApp number, send a payment screenshot to your bot's number
2. The bot will automatically reply and guide you through the process
3. At the end, you'll receive a PDF receipt

---

## 📂 File Structure

```
whatsapp-bot/
├── index.js          ← Main bot logic (conversation flow)
├── vision.js         ← Claude AI image reader
├── receipt.js        ← PDF receipt generator
├── .env              ← Your API key (you create this)
├── .env.example      ← Template for .env
├── package.json      ← Project config
├── auth_info/        ← Created automatically after first login (your WhatsApp session)
└── SETUP.md          ← This file
```

---

## ⚠️ Important Notes

| Topic | Note |
|-------|------|
| **Baileys** | This uses an unofficial WhatsApp library. It works well for testing. For a production app used by many people, consider upgrading to the official Meta WhatsApp Cloud API. |
| **Keep the terminal open** | The bot only works while the terminal is running. Close the terminal = bot goes offline. |
| **24/7 running** | To keep it running always, you'd need to host it on a server (e.g. free tier on Railway.app or Render.com). Ask Strongs Engineering to help set this up. |
| **API Costs** | Claude AI has a free tier with generous limits. For testing, you won't pay anything. |
| **Session** | The `auth_info/` folder stores your login. Don't delete it or you'll need to scan the QR again. |

---

## 🔧 Customization (Future Updates)

These can be added in future versions:
- [ ] Admin panel to view all receipts
- [ ] Monthly levy tracking per resident
- [ ] Automatic reminder messages
- [ ] Official Meta WhatsApp Cloud API integration
- [ ] Logo on receipt
- [ ] Database to store all transactions

---

## 📞 Support
Built and maintained by **Strongs Engineering**
Contact for customization, hosting, or upgrades.
