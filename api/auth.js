// api/auth.js - Admin Authentication
const { readData, hash, DEF_ID, ALLOWED_ADMIN_HASHES } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { id, password } = req.body || {};
  if (!id || !password) {
    return res.status(400).json({ error: 'User ID and password required.' });
  }

  const data = readData();
  const targetId = data.settings.adminId || DEF_ID;
  const targetHash = data.settings.adminHash || '7525602160886330'; // dropshippinglowkey default

  const inputId = String(id).trim();
  const inputHash = hash(String(password));

  const isValidId = inputId === targetId || inputId === DEF_ID;
  const isValidHash = inputHash === targetHash || ALLOWED_ADMIN_HASHES.includes(inputHash);

  if (isValidId && isValidHash) {
    const sessionToken = 'adm_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
    return res.status(200).json({
      ok: true,
      token: sessionToken,
      adminId: targetId
    });
  }

  return res.status(401).json({
    ok: false,
    error: 'Wrong user ID or password.'
  });
};
