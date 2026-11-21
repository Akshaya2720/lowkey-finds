// api/orders.js - Secure Order Handling with Strict Customer Privacy
const { readData, writeData, verifyAdmin } = require('./db');

module.exports = async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token, authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = readData();

  // GET: STRICTLY ADMIN ONLY! No regular customer can list store orders.
  if (req.method === 'GET') {
    if (!verifyAdmin(req)) {
      return res.status(401).json({
        error: 'Unauthorized: Order records are private and only accessible by the store admin.'
      });
    }
    return res.status(200).json({ orders: data.orders || [] });
  }

  // POST: Customer placing a new order
  if (req.method === 'POST') {
    try {
      const body = req.body || {};
      const { customer, items, sub, ship, total } = body;

      if (!customer || !customer.name || !customer.phone || !customer.addr || !customer.city || !customer.pin) {
        return res.status(400).json({ error: 'Please provide all delivery details.' });
      }

      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({ error: 'Cart is empty.' });
      }

      const cleanPhone = String(customer.phone).replace(/\D/g, '').slice(-10);
      if (cleanPhone.length !== 10) {
        return res.status(400).json({ error: 'Valid 10-digit phone number is required.' });
      }

      const ref = 'LF-' + Date.now().toString(36).toUpperCase().slice(-6);
      const newOrder = {
        id: 'o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
        ref: ref,
        at: Date.now(),
        status: 'New',
        c: {
          name: String(customer.name).trim(),
          phone: cleanPhone,
          addr: String(customer.addr).trim(),
          city: String(customer.city).trim(),
          pin: String(customer.pin).trim(),
          note: customer.note ? String(customer.note).trim() : ''
        },
        items: items.map(it => ({
          n: String(it.n || it.name),
          s: it.s || it.size || '',
          q: Number(it.q || it.qty || 1),
          pr: Number(it.pr || it.price || 0)
        })),
        sub: Number(sub || 0),
        ship: Number(ship || 0),
        total: Number(total || 0)
      };

      data.orders = data.orders || [];
      data.orders.unshift(newOrder);
      writeData(data);

      // Return ONLY this specific order reference and confirmation details.
      // Privacy guaranteed: No other customer's order is returned or exposed.
      return res.status(201).json({
        ok: true,
        ref: newOrder.ref,
        order: {
          id: newOrder.id,
          ref: newOrder.ref,
          at: newOrder.at,
          status: newOrder.status,
          total: newOrder.total,
          items: newOrder.items
        }
      });
    } catch (err) {
      console.error('Error creating order:', err);
      return res.status(500).json({ error: 'Failed to process order.' });
    }
  }

  // PATCH: Admin updating order status OR customer cancelling their own new order
  if (req.method === 'PATCH') {
    const { id, status, customerPhone } = req.body || {};
    if (!id || !status) {
      return res.status(400).json({ error: 'Order ID and new status required.' });
    }

    const orderIndex = data.orders.findIndex(o => o.id === id);
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = data.orders[orderIndex];

    // Check if admin is updating
    if (verifyAdmin(req)) {
      order.status = status;
      writeData(data);
      return res.status(200).json({ ok: true, order });
    }

    // If not admin, allow customer to cancel ONLY IF they provide matching phone & order is New/Confirmed
    if (status === 'Cancelled' && customerPhone) {
      const cleanPhone = String(customerPhone).replace(/\D/g, '').slice(-10);
      if (order.c.phone === cleanPhone && (order.status === 'New' || order.status === 'Confirmed')) {
        order.status = 'Cancelled';
        order.by = 'customer';
        writeData(data);
        return res.status(200).json({ ok: true, order });
      }
    }

    return res.status(401).json({ error: 'Unauthorized to modify order.' });
  }

  // DELETE: Admin only
  if (req.method === 'DELETE') {
    if (!verifyAdmin(req)) {
      return res.status(401).json({ error: 'Unauthorized.' });
    }
    const { id } = req.body || req.query || {};
    if (!id) return res.status(400).json({ error: 'Order ID required.' });
    data.orders = (data.orders || []).filter(o => o.id !== id);
    writeData(data);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
