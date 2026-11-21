// api/track.js - Secure, Privacy-Preserving Customer Order Tracking
const { readData } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { ref, phone } = req.body || {};
  if (!ref || !phone) {
    return res.status(400).json({ error: 'Order reference and phone number are required.' });
  }

  const cleanRef = String(ref).trim().toUpperCase();
  const cleanPhone = String(phone).replace(/\D/g, '').slice(-10);

  if (cleanPhone.length !== 10) {
    return res.status(400).json({ error: 'Please enter a valid 10-digit phone number.' });
  }

  const data = readData();
  const orders = data.orders || [];

  // Privacy Rule: Strict match on BOTH ref and customer phone number
  const match = orders.find(o => 
    o.ref === cleanRef && 
    String(o.c.phone).replace(/\D/g, '').slice(-10) === cleanPhone
  );

  if (!match) {
    return res.status(404).json({
      error: 'No order found matching this order reference and phone number.'
    });
  }

  // Return strictly sanitized details for this customer's order only
  return res.status(200).json({
    found: true,
    order: {
      id: match.id,
      ref: match.ref,
      at: match.at,
      status: match.status,
      by: match.by || null,
      items: match.items,
      sub: match.sub,
      ship: match.ship,
      total: match.total,
      c: {
        name: match.c.name,
        city: match.c.city
        // Address and full phone are not returned to external API for maximum privacy
      }
    }
  });
};
