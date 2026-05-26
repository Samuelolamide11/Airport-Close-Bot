# 📊 Google Sheets Setup Guide
### Airport Close Residents Association — Receipt Bot

---

## STEP 1 — Create the Google Sheet

1. Go to **https://sheets.google.com** and create a new spreadsheet
2. Rename it: **"Airport Close Residents"**
3. Rename the first sheet tab (bottom): **"Residents"**
4. Set up the header row exactly like this:

| A | B | C | D | E | F | G | H | I |
|---|---|---|---|---|---|---|---|---|
| Resident Name | Address | Phone Number | Outstanding Amount | Last Payment Date | Last Payment Amount | Last Receipt No | Total Paid | Notes |

5. Fill in your residents data starting from **Row 2**. Example:

| Resident Name | Address | Phone Number | Outstanding Amount | Last Payment Date | Last Payment Amount | Last Receipt No | Total Paid | Notes |
|---|---|---|---|---|---|---|---|---|
| John Adebayo | 12 Airport Close | 08012345678 | ₦15,000 | | | | ₦0 | |
| Mrs Chioma Okafor | 5B Airport Close | 08098765432 | ₦30,000 | | | | ₦0 | |
| Ahmed Musa | Flat 3 Airport Close | 07011223344 | ₦10,000 | | | | ₦0 | |

> ⚠️ Make sure the sheet tab is named exactly **Residents** (capital R)

---

## STEP 2 — Create a Google Service Account

This lets the bot read and write to your sheet automatically.

1. Go to: **https://console.cloud.google.com**
2. Click **"Select a project"** → **"New Project"**
3. Name it: **WhatsApp Receipt Bot** → Click **Create**
4. In the search bar, search: **"Google Sheets API"**
5. Click it → Click **"Enable"**
6. In the left menu, go to: **APIs & Services → Credentials**
7. Click **"+ Create Credentials"** → **"Service Account"**
8. Name: **receipt-bot** → Click **Create and Continue** → Click **Done**
9. Click on the service account you just created
10. Go to the **"Keys"** tab → **"Add Key"** → **"Create new key"**
11. Choose **JSON** → Click **Create**
12. A file will download — rename it to **credentials.json**
13. Move it into your **whatsapp-bot** folder

---

## STEP 3 — Share the Sheet with the Service Account

1. Open the **credentials.json** file with Notepad
2. Find the line that says **"client_email"** — copy that email address
   (it looks like: `receipt-bot@your-project.iam.gserviceaccount.com`)
3. Go back to your Google Sheet
4. Click **Share** (top right)
5. Paste the service account email
6. Set role to **Editor**
7. Uncheck "Notify people" → Click **Share**

---

## STEP 4 — Add the Sheet ID to your .env file

1. Open your Google Sheet in the browser
2. Look at the URL — it looks like:
   ```
   https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX/edit
   ```
3. Copy the long ID between `/d/` and `/edit`
4. Open your `.env` file and add:
   ```
   SHEET_ID=paste_your_sheet_id_here
   ```

---

## Final .env file should look like this:

```
GEMINI_API_KEY=your_gemini_key_here
SHEET_ID=your_google_sheet_id_here
```

---

## STEP 5 — Test it

Run `npm start`, send a payment screenshot, enter a name and address that exists in your sheet — the bot should:
1. Find the resident ✅
2. Show their outstanding balance ✅
3. Generate a receipt with remaining balance ✅
4. Update the sheet automatically ✅
