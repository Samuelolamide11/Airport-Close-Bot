# 🚀 Deployment Guide — GitHub + Railway
### Airport Close Residents Association Receipt Bot
### Built by Strongs Engineering

---

## OVERVIEW

This guide walks you through:
1. Putting your code on GitHub (free cloud storage for code)
2. Deploying to Railway (free server that runs 24/7)
3. Scanning the WhatsApp QR code from your browser

---

## PART 1 — UPLOAD CODE TO GITHUB

### Step 1 — Create a GitHub Account
1. Go to **https://github.com**
2. Sign up for a free account if you don't have one

### Step 2 — Create a New Repository
1. Click the **"+"** button (top right) → **"New repository"**
2. Name it: `airport-close-receipt-bot`
3. Set it to **Private** (important — keeps your code secure)
4. Click **"Create repository"**

### Step 3 — Install Git on your PC
1. Go to **https://git-scm.com/download/win**
2. Download and install Git (click Next → Next → Finish)
3. Open **Command Prompt** and verify: `git --version`

### Step 4 — Upload your code
Open Command Prompt inside your `whatsapp-bot` folder and run these commands one by one:

```cmd
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/airport-close-receipt-bot.git
git push -u origin main
```

> Replace `YOUR_USERNAME` with your actual GitHub username.
> GitHub will ask for your username and password the first time.

---

## PART 2 — DEPLOY TO RAILWAY

### Step 1 — Create a Railway Account
1. Go to **https://railway.app**
2. Click **"Login"** → **"Login with GitHub"**
3. Authorize Railway to access your GitHub

### Step 2 — Create a New Project
1. Click **"New Project"**
2. Click **"Deploy from GitHub repo"**
3. Select your `airport-close-receipt-bot` repository
4. Railway will automatically detect it's a Node.js app

### Step 3 — Add Environment Variables
This is where you add your secret keys (instead of the .env file):

1. Click on your project → Click **"Variables"** tab
2. Add these one by one (click "New Variable" for each):

| Variable Name | Value |
|--------------|-------|
| `GEMINI_API_KEY` | your Gemini API key |
| `SHEET_ID` | your Google Sheet ID |
| `NODE_ENV` | production |

### Step 4 — Add your Google credentials
The `credentials.json` file can't go to GitHub (it's in .gitignore for security).
Add it as an environment variable instead:

1. Open your `credentials.json` file with Notepad
2. Select all the text (Ctrl+A) and copy it
3. In Railway Variables, add:
   - Name: `GOOGLE_CREDENTIALS_JSON`
   - Value: paste the entire JSON content

Then update `sheets.js` to read from this env variable (see note below*).

### Step 5 — Get your Railway URL
1. Click the **"Settings"** tab in your Railway project
2. Under **"Domains"**, click **"Generate Domain"**
3. You'll get a URL like: `https://airport-close-receipt-bot.up.railway.app`

### Step 6 — Scan the QR Code
1. Open your Railway URL + `/qr` in your browser:
   `https://your-app.up.railway.app/qr`
2. Scan the QR code with WhatsApp
3. The page will update to show ✅ Connected

---

## PART 3 — KEEPING IT RUNNING

### Auto-restart on crash
Railway automatically restarts your bot if it crashes (configured in railway.toml).

### When QR expires / session drops
If your bot disconnects, just visit `/qr` again and rescan.

### Updating your bot
Whenever you make changes to the code:
```cmd
git add .
git commit -m "describe what you changed"
git push
```
Railway automatically redeploys within ~2 minutes.

---

## * Updating sheets.js for credentials from environment

Replace the `getAuth()` function in `sheets.js` with this:

```javascript
function getAuth() {
  // On Railway: read credentials from environment variable
  // Locally: read from credentials.json file
  if (process.env.GOOGLE_CREDENTIALS_JSON) {
    const credentials = JSON.parse(process.env.GOOGLE_CREDENTIALS_JSON);
    return new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  // Fallback to file (for local development)
  return new google.auth.GoogleAuth({
    keyFile: 'credentials.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}
```

---

## TROUBLESHOOTING

| Problem | Fix |
|---------|-----|
| Bot not starting | Check Railway logs tab for errors |
| QR page shows "Loading..." | Wait 30 seconds, then refresh |
| QR keeps expiring | Normal — just rescan |
| Sheet not updating | Check GOOGLE_CREDENTIALS_JSON is set correctly |
| Bot goes offline | Visit /qr and rescan |

---

## FREE TIER LIMITS

Railway gives you **$5 free credit per month**.
Your bot uses approximately **$0.15–$0.20/day** on Railway's free tier.
This gives you roughly **25–30 days** of free running per month.

When the credit runs out, upgrade to **Oracle Cloud Free Tier** for permanent free hosting.
Ask Strongs Engineering to help migrate when ready.
