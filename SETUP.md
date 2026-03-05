# Google Sheets Setup Guide

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Name it (e.g., "Tester Contact Form") and click **Create**

## Step 2: Enable the Google Sheets API

1. In your project, go to **APIs & Services** → **Library**
2. Search for **Google Sheets API**
3. Click it and press **Enable**

## Step 3: Create a Service Account

1. In the left sidebar, go to **IAM & Admin** → **Service Accounts**
2. Click **+ Create Service Account** at the top
3. Name it (e.g., "sheets-writer") and click **Create and Continue**
4. Skip the optional role/access steps — click **Continue**, then **Done**
5. Click on the service account you just created
6. Go to the **Keys** tab → **Add Key** → **Create New Key** → **JSON**
7. A `.json` file downloads. Open it and find these two values:
   - `client_email` — looks like `name@project.iam.gserviceaccount.com`
   - `private_key` — starts with `-----BEGIN PRIVATE KEY-----`

## Step 4: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. In Row 1, add these headers: **Timestamp | Name | Email | Message**
3. Copy the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_IS_HERE/edit
   ```
4. Click **Share** → paste your service account's `client_email` → give it **Editor** access

## Step 5: Configure .env

1. Copy `.env.example` to `.env`:
   ```
   cp .env.example .env
   ```
2. Fill in the values:
   - `SPREADSHEET_ID` — from Step 4
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` — the `client_email` from the JSON key
   - `GOOGLE_PRIVATE_KEY` — the `private_key` from the JSON key (keep the quotes and `\n` characters)

## Step 6: Run the Server

```bash
npm install
npm start
```

Open http://localhost:3000 in your browser. The contact form is directly below the hero section.

## Testing Without Google Sheets

The server works without Google Sheets configured — form submissions will log to the console instead. This lets you test the form flow (submit → thank you → presell) without setting up credentials first.

## Troubleshooting

- **"Google Sheets auth failed"** — Check that your private key in `.env` has `\n` for newlines, not actual line breaks
- **"Failed to save"** — Make sure you shared the spreadsheet with the service account email as an Editor
- **Form not submitting** — Make sure you're running `node server.js` (not `serve.mjs`) and accessing via `http://localhost:3000`
