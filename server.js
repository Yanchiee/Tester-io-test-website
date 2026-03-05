import express from 'express';
import { google } from 'googleapis';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 3000;

// ── Middleware ────────────────────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());
app.use(express.static(__dirname));

// ── Google Sheets Auth ───────────────────────────────
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';

let sheets;
try {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: (process.env.GOOGLE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheets = google.sheets({ version: 'v4', auth });
} catch (err) {
  console.error('Google Sheets auth failed:', err.message);
  console.log('Form submissions will be logged to console instead.');
}

// ── Submit Endpoint ──────────────────────────────────
app.post('/submit', async (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  const timestamp = new Date().toISOString();
  const row = [timestamp, name, email, message];

  // Always log to console
  console.log('New submission:', { timestamp, name, email, message });

  // Push to Google Sheets if configured
  if (sheets && SPREADSHEET_ID) {
    try {
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${SHEET_NAME}!A:D`,
        valueInputOption: 'USER_ENTERED',
        requestBody: { values: [row] },
      });
      console.log('Row appended to Google Sheet.');
    } catch (err) {
      console.error('Google Sheets error:', err.message);
      return res.status(500).json({ success: false, error: 'Failed to save. Please try again.' });
    }
  } else {
    console.log('Google Sheets not configured — submission logged to console only.');
  }

  return res.json({ success: true });
});

// ── Start ────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  if (!SPREADSHEET_ID) {
    console.log('NOTE: SPREADSHEET_ID not set — form submissions will only log to console.');
    console.log('See SETUP.md for Google Sheets configuration instructions.');
  }
});
