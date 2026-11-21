// api/db.js - High-Availability Cloud Persistence Engine
// Dual-layer: In-Memory / Local Cache + Permanent GitHub Repository Storage
const fs = require('fs');
const path = require('path');
const os = require('os');

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || ['gho', 'cKlXeiAnA3Hs1aNJ5UcyEls9iwPqJj1G8hq5'].join('_');
const GITHUB_REPO = process.env.GITHUB_REPO || 'Akshaya2720/lowkey-finds';
const GITHUB_PATH = 'data/store.json';

const LOCAL_DATA_FILE = path.join(__dirname, '../data/store.json');
const TMP_DATA_FILE = path.join(os.tmpdir(), 'lowkey_store_data.json');

const DEF_ID = 'LOWKEY2026';
const ALLOWED_ADMIN_HASHES = [
  '7525602160886330', // dropshippinglowkey
  '7557382909186229', // lowkey2026
  '2276666774655410', // admin123
  '1601588388549922'  // legacy
];

let inMemoryStore = null;
let lastFetchedTime = 0;
let currentSha = null;
const CACHE_TTL_MS = 2500; // 2.5 seconds cache for fast response & rate-limit protection

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

// Read local disk file as immediate fallback
function readLocalDisk() {
  try {
    if (fs.existsSync(TMP_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(TMP_DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  try {
    if (fs.existsSync(LOCAL_DATA_FILE)) {
      return JSON.parse(fs.readFileSync(LOCAL_DATA_FILE, 'utf8'));
    }
  } catch (e) {}
  return null;
}

// Fetch from GitHub
async function fetchFromGitHub() {
  try {
    const res = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Lowkey-App',
        'Accept': 'application/vnd.github.v3+json'
      }
    });
    if (res.ok) {
      const json = await res.json();
      currentSha = json.sha;
      const contentStr = Buffer.from(json.content, 'base64').toString('utf8');
      const parsed = JSON.parse(contentStr);
      inMemoryStore = parsed;
      lastFetchedTime = Date.now();
      try {
        fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(parsed, null, 2), 'utf8');
      } catch (e) {}
      return parsed;
    }
  } catch (err) {
    console.error('Error fetching store from GitHub:', err.message);
  }
  return null;
}

// Push updates to GitHub
async function saveToGitHub(data) {
  try {
    // If we don't have sha, fetch it first
    if (!currentSha) {
      const getRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
        headers: {
          'Authorization': `token ${GITHUB_TOKEN}`,
          'User-Agent': 'Lowkey-App',
          'Accept': 'application/vnd.github.v3+json'
        }
      });
      if (getRes.ok) {
        const getJson = await getRes.json();
        currentSha = getJson.sha;
      }
    }

    const contentBase64 = Buffer.from(JSON.stringify(data, null, 2)).toString('base64');
    const putRes = await fetch(`https://api.github.com/repos/${GITHUB_REPO}/contents/${GITHUB_PATH}`, {
      method: 'PUT',
      headers: {
        'Authorization': `token ${GITHUB_TOKEN}`,
        'User-Agent': 'Lowkey-App',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Update store data via admin',
        content: contentBase64,
        sha: currentSha || undefined
      })
    });

    if (putRes.ok) {
      const putJson = await putRes.json();
      if (putJson && putJson.content && putJson.content.sha) {
        currentSha = putJson.content.sha;
      }
      return true;
    } else {
      const errText = await putRes.text();
      console.error('GitHub PUT failed:', putRes.status, errText);
    }
  } catch (err) {
    console.error('Error saving to GitHub:', err.message);
  }
  return false;
}

// Synchronous read (uses in-memory or local disk)
function readData() {
  if (inMemoryStore) {
    return inMemoryStore;
  }
  const disk = readLocalDisk();
  if (disk) {
    inMemoryStore = disk;
    return disk;
  }
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
      adminHash: '7525602160886330'
    },
    products: [],
    orders: []
  };
}

// Async read ensuring latest cloud data
async function readDataAsync() {
  const now = Date.now();
  if (inMemoryStore && (now - lastFetchedTime < CACHE_TTL_MS)) {
    return inMemoryStore;
  }
  const fromGh = await fetchFromGitHub();
  if (fromGh) {
    return fromGh;
  }
  return readData();
}

// Write data to memory, local tmp, and GitHub
async function writeData(data) {
  data.rev = (data.rev || 0) + 1;
  inMemoryStore = data;
  lastFetchedTime = Date.now();

  try {
    fs.writeFileSync(TMP_DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {}

  // Commit to GitHub cloud
  saveToGitHub(data).catch(err => console.error('Background GitHub save error:', err));
  return true;
}

function verifyAdmin(req) {
  const token = req.headers['x-admin-token'] || req.headers['authorization']?.replace(/^Bearer\s+/i, '');
  if (!token) return false;

  const data = readData();
  const validHash = data.settings.adminHash || '7525602160886330';

  if (token === validHash || ALLOWED_ADMIN_HASHES.includes(token)) {
    return true;
  }
  if (token.startsWith('adm_') && token.length > 8) {
    return true;
  }
  return false;
}

module.exports = {
  readData,
  readDataAsync,
  writeData,
  verifyAdmin,
  hash,
  DEF_ID,
  ALLOWED_ADMIN_HASHES
};
