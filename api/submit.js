import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';

function getSupabase() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key);
}

function getSheets() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  let key = process.env.GOOGLE_PRIVATE_KEY || '';

  // Handle different formats: Vercel may or may not include surrounding quotes
  key = key.replace(/^"(.*)"$/, '$1');
  key = key.replace(/\\n/g, '\n');

  if (!email || !key) return null;

  const auth = new google.auth.GoogleAuth({
    credentials: { client_email: email, private_key: key },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  return google.sheets({ version: 'v4', auth });
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ success: false, error: 'Method not allowed' });

  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, error: 'All fields are required.' });
  }

  const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
  const SHEET_NAME = process.env.SHEET_NAME || 'Sheet1';

  if (!SPREADSHEET_ID) {
    console.error('SPREADSHEET_ID env var is missing');
    return res.status(500).json({ success: false, error: 'Server configuration error.' });
  }

  const timestamp = new Date().toLocaleString('en-US', {
    timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short',
  });

  console.log('New submission:', { timestamp, name, email, message });

  let sheets;
  try {
    sheets = getSheets();
  } catch (err) {
    console.error('Google Sheets auth failed:', err.message);
    return res.status(500).json({ success: false, error: 'Server authentication error.' });
  }

  if (!sheets) {
    console.error('Sheets client is null — check GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY env vars');
    return res.status(500).json({ success: false, error: 'Server configuration error.' });
  }

  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });
    const rowNum = (existing.data.values ? existing.data.values.length : 1);
    const row = [rowNum, timestamp, name, email, message];

    await sheets.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID,
      range: `${SHEET_NAME}!A:E`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [row] },
    });
    console.log('Row appended to Google Sheet.');
  } catch (err) {
    console.error('Google Sheets error:', err.message);
    return res.status(500).json({ success: false, error: 'Failed to save. Please try again.' });
  }

  // Also insert into Supabase
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { error: sbError } = await supabase
        .from('contact_messages')
        .insert([{ name, email, message }]);
      if (sbError) {
        console.error('Supabase error:', sbError.message);
      } else {
        console.log('Row inserted into Supabase.');
      }
    } catch (err) {
      console.error('Supabase error:', err.message);
    }
  }

  return res.status(200).json({ success: true });
}
