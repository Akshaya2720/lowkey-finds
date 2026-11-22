// api/orders.js - Secure Order Handling with Strict Customer Privacy
const { readDataAsync, writeData, verifyAdmin } = require('./db');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, x-admin-token, authorization');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const data = await readDataAsync();

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

      // Preserve client-generated reference & id if provided to keep local and server IDs identical
      const ref = (body.ref && typeof body.ref === 'string' && /^LF-[A-Z0-9]+$/i.test(body.ref.trim()))
        ? body.ref.trim().toUpperCase()
        : ('LF-' + Date.now().toString(36).toUpperCase().slice(-6));

      const orderId = (body.id && typeof body.id === 'string' && body.id.trim().length > 3)
        ? body.id.trim()
        : ('o' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6));

      const newOrder = {
        id: orderId,
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
      const existingIdx = data.orders.findIndex(o => o.id === newOrder.id || o.ref === newOrder.ref);
      if (existingIdx > -1) {
        data.orders[existingIdx] = newOrder;
      } else {
        data.orders.unshift(newOrder);
      }
      await writeData(data);

      return res.status(201).json({
        ok: true,
        ref: newOrder.ref,
        order: newOrder
      });
    } catch (err) {
      console.error('Error creating order:', err);
      return res.status(500).json({ error: 'Failed to process order.' });
    }
  }

  // PATCH: Admin updating order status OR customer cancelling their own new order
  if (req.method === 'PATCH') {
    const { id, ref, status, customerPhone } = req.body || {};
    if ((!id && !ref) || !status) {
      return res.status(400).json({ error: 'Order ID or reference and new status required.' });
    }

    const orderIndex = (data.orders || []).findIndex(o => 
      (id && o.id === id) || 
      (ref && String(o.ref || '').toUpperCase() === String(ref).trim().toUpperCase())
    );
    if (orderIndex === -1) {
      return res.status(404).json({ error: 'Order not found.' });
    }

    const order = data.orders[orderIndex];

    // Admin update
    if (verifyAdmin(req)) {
      order.status = status;
      await writeData(data);
      return res.status(200).json({ ok: true, order });
    }

    // Customer self-cancellation
    if (status === 'Cancelled' && customerPhone) {
      const cleanPhone = String(customerPhone).replace(/\D/g, '').slice(-10);
      const oPhone = String(order.c && order.c.phone ? order.c.phone : '').replace(/\D/g, '').slice(-10);
      if (oPhone === cleanPhone) {
        if (order.status === 'New' || order.status === 'Confirmed') {
          order.status = 'Cancelled';
          order.by = 'customer';
          await writeData(data);
          return res.status(200).json({ ok: true, order });
        } else {
          return res.status(400).json({ error: 'This order is already ' + order.status.toLowerCase() + ' and cannot be cancelled online.' });
        }
      } else {
        return res.status(403).json({ error: 'Phone number does not match order record.' });
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
    await writeData(data);
    return res.status(200).json({ ok: true });
  }

  res.status(405).json({ error: 'Method not allowed' });
};
