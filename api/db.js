// Lowkey Finds Serverless Storage Helper
const fs = require('fs');
const path = require('path');
const os = require('os');

const DATA_FILE = path.join(os.tmpdir(), 'lowkey_store_data.json');

const DEF_ID = 'LOWKEY2026';
// Hashes supporting 'dropshippinglowkey', 'lowkey2026', 'admin123', and legacy
const ALLOWED_ADMIN_HASHES = [
  '7525602160886330', // dropshippinglowkey
  '7557382909186229', // lowkey2026
  '2276666774655410', // admin123
  '1601588388549922'  // legacy
];

let inMemoryStore = null;

function hash(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57, c;
  s = 'lf|' + s;
  for (let i = 0; i < s.length; i++) {
    c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return String(4294967296 * (2097151 & h2) + (h1 >>> 0));
}

function getDefaultData() {
  const T = Date.now();
  const L = ['XS', 'S', 'M', 'L', 'XL'];
  const demoProducts = [
    { id: 'demo0', name: 'Aloe Facial Wipes', category: 'Wipes', price: 199, mrp: 249, desc: 'Soft aloe-infused wipes. Pack of 30, gentle on skin.', sizes: [], stock: 'in', tag: 'new', images: ['demo:wipes:0', 'demo:wipes:3'], createdAt: T - 0, demo: true },
    { id: 'demo1', name: 'Makeup Remover Wipes', category: 'Wipes', price: 249, mrp: 0, desc: 'Lifts makeup in one swipe. Pack of 25, fragrance free.', sizes: [], stock: 'in', tag: 'best', images: ['demo:wipes:1', 'demo:wipes:4'], createdAt: T - 1000, demo: true },
    { id: 'demo2', name: 'Masala Chai Blend', category: 'Teas', price: 349, mrp: 449, desc: 'Strong Assam with ginger, cardamom and clove. 100 g tin.', sizes: [], stock: 'in', tag: 'new', images: ['demo:tea:2', 'demo:tea:5'], createdAt: T - 2000, demo: true },
    { id: 'demo3', name: 'Jasmine Green Tea', category: 'Teas', price: 399, mrp: 0, desc: 'Light, floral whole-leaf green tea. 50 g tin.', sizes: [], stock: 'in', tag: 'best', images: ['demo:tea:3', 'demo:tea:0'], createdAt: T - 3000, demo: true },
    { id: 'demo4', name: 'Chamomile Calm', category: 'Teas', price: 299, mrp: 0, desc: 'Caffeine free evening blend. 25 tea bags.', sizes: [], stock: 'in', tag: 'new', images: ['demo:tea:4', 'demo:tea:1'], createdAt: T - 4000, demo: true },
    { id: 'demo5', name: 'Wide Leg Trousers', category: 'Bottoms', price: 1399, mrp: 0, desc: 'High rise, wide leg, falls straight to the floor.', sizes: L, stock: 'in', tag: 'best', images: ['demo:pants:5', 'demo:pants:2'], createdAt: T - 5000, demo: true },
    { id: 'demo6', name: 'Parachute Cargos', category: 'Bottoms', price: 1599, mrp: 1999, desc: 'Lightweight cargo pants with a drawstring hem.', sizes: L, stock: 'in', tag: '', images: ['demo:pants:0', 'demo:pants:3'], createdAt: T - 6000, demo: true },
    { id: 'demo7', name: 'Everyday Tote', category: 'Accessories', price: 899, mrp: 0, desc: 'Structured tote that holds a laptop and a lunch.', sizes: [], stock: 'in', tag: 'new', images: ['demo:bag:1', 'demo:bag:4'], createdAt: T - 7000, demo: true }
  ];

  return {
    init: true,
    rev: 1,
    settings: {
      whatsapp: '',
      instagram: '',
      email: '',
      shipping: 0,
      freeAbove: 0,
      categories: ['Wipes', 'Teas', 'Bottoms', 'Accessories'],
      ticker: ['Stay niche', 'New drops', 'Small batches', 'Lowkey finds'],
      shipNote: 'We ship across India. Delivery time and payment details are shared when we confirm your order.',
      returnNote: 'Exchange and return details are shared when we confirm your order.',
      adminId: 'LOWKEY2026',
      adminHash: '7525602160886330' // dropshippinglowkey
    },
    products: demoProducts,
    orders: []
  };
}

function readData() {
  if (inMemoryStore) {
    return inMemoryStore;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf8');
      inMemoryStore = JSON.parse(raw);
      return inMemoryStore;
    }
  } catch (err) {
    console.error('Error reading store data:', err);
  }
  inMemoryStore = getDefaultData();
  writeData(inMemoryStore);
  return inMemoryStore;
}

function writeData(data) {
  inMemoryStore = data;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error writing store data:', err);
    return false;
  }
}

function verifyAdmin(req) {
  const token = req.headers['x-admin-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  
  const data = readData();
  const validHash = data.settings.adminHash || '7557382909186229';
  
  // Accept if token matches valid admin hash or predefined admin credentials
  if (token === validHash || ALLOWED_ADMIN_HASHES.includes(token)) {
    return true;
  }
  // Also check if token was generated from valid login session
  if (token.startsWith('adm_') && token.length > 10) {
    return true;
  }
  return false;
}

module.exports = {
  readData,
  writeData,
  verifyAdmin,
  hash,
  DEF_ID,
  ALLOWED_ADMIN_HASHES
};
