// api/products.js - Real-Time Public Product Catalog & Admin Updates
const { readDataAsync, writeData, verifyAdmin } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, authorization');
  // Prevent aggressive edge caching so new products appear on phones immediately
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = await readDataAsync();

  // GET: Public storefront data (sanitized, zero admin or order data leaked)
  if (req.method === 'GET') {
    const publicSettings = { ...data.settings };
    delete publicSettings.adminHash;
    delete publicSettings.adminId;

    return res.status(200).json({
      init: true,
      rev: data.rev || 1,
      products: data.products || [],
      settings: publicSettings
    });
  }

  // POST: Admin updating products and store settings
  if (req.method === 'POST') {
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized: Admin authentication required.' });
    }

    const { products, settings } = req.body || {};
    if (products && Array.isArray(products)) {
      data.products = products;
    }
    if (settings && typeof settings === 'object') {
      data.settings = { ...data.settings, ...settings };
    }

    await writeData(data);

    const publicSettings = { ...data.settings };
    delete publicSettings.adminHash;
    delete publicSettings.adminId;

    return res.status(200).json({
      ok: true,
      rev: data.rev,
      products: data.products,
      settings: publicSettings
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
