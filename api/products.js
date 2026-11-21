// api/products.js - Public Product Catalog & Protected Admin Updates
const { readData, writeData, verifyAdmin } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-admin-token, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = readData();

  // GET: Public storefront data (sanitized, zero admin or order data leaked)
  if (req.method === 'GET') {
    const publicSettings = { ...data.settings };
    delete publicSettings.adminHash;
    delete publicSettings.adminId;

    return res.status(200).json({
      init: true,
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
    data.rev = (data.rev || 0) + 1;
    writeData(data);

    const publicSettings = { ...data.settings };
    delete publicSettings.adminHash;
    delete publicSettings.adminId;

    return res.status(200).json({
      ok: true,
      products: data.products,
      settings: publicSettings
    });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
