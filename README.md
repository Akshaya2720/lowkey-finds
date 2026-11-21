# Lowkey Finds ✦ Stay Niche

Curated, small batch & niche e-commerce storefront with real-time order tracking, WhatsApp order confirmation, full admin dashboard, and **strict customer privacy architecture**.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAkshaya2720%2Flowkey-finds)

---

## 🌟 Key Features

- **100% Preserved Brand Aesthetics**: Signature Caprasimo & DM Sans typography, blue halftone hero with floating emblem, dynamic scrolling ticker, responsive category tiles, and sleek cart drawers.
- **Strict Customer Privacy ("No one sees what others ordered")**:
  - Customers only ever see their own personal cart, wishlist, and orders placed from their device.
  - Public catalog APIs **never** expose order records or other customers' names, phone numbers, or addresses.
  - The "Track Order" system strictly verifies **both** the Order Reference (`LF-XXXXXX`) and the matching 10-digit customer phone number before displaying any details.
  - Only the authenticated Store Admin can view the master order list.
- **Real-World WhatsApp Direct Ordering**:
  - Automatically generates an instant pre-filled WhatsApp message for the store owner upon checkout.
  - Customers can tap **"Confirm on WhatsApp 💬"** to initiate direct communication and order verification with the shop.
- **Built-in Admin Dashboard**:
  - Secure Admin Login in the footer (`LOWKEY2026`).
  - Add, edit, or remove products with automatic in-browser image compression.
  - Manage store settings: WhatsApp business number, Instagram handle, shipping fee, free shipping threshold, scrolling ticker text, and return policies.
  - Order management: filter, sort, and update statuses (*New*, *Confirmed*, *Packed*, *Shipped*, *Delivered*, *Cancelled*).
- **Vercel-Ready Serverless Architecture**:
  - Zero-configuration deployment with `/api` serverless endpoints.
  - Automatic fallback to high-speed local storage ensures 100% uptime even during offline or flaky connections.

---

## 🚀 How to Host & Share as a Website Link (Vercel)

### Option A: 1-Click Deploy (Recommended)
1. Click the button below:
   
   [![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAkshaya2720%2Flowkey-finds)

2. Sign in with your GitHub account (`Akshaya2720`).
3. Click **Deploy**.
4. In under 60 seconds, Vercel will give you a live production link (e.g. `https://lowkey-finds.vercel.app`) that you can put in your Instagram bio, WhatsApp catalog, or share anywhere!

### Option B: From Vercel Dashboard
1. Go to [vercel.com](https://vercel.com) and log in.
2. Click **"Add New..."** -> **"Project"**.
3. Select your GitHub repository **`Akshaya2720/lowkey-finds`**.
4. Click **Deploy**.

---

## 🔐 Admin Access & Setup

To manage your products and orders:

1. Open your live website and scroll to the footer.
2. Click **"Admin login"** at the bottom right.
3. Enter the credentials:
   - **User ID**: `LOWKEY2026`
   - **Password**: `dropshippinglowkey`
4. Once logged in, an **Admin Bar** appears at the bottom of your screen:
   - **Orders**: View all orders, update fulfillment statuses, or delete orders.
   - **Add product**: Upload piece photos (compressed automatically) and set prices.
   - **Store settings**: Add your WhatsApp number (e.g., `919876543210`), Instagram handle, shipping fees, and change your admin password.

---

## 🛡️ Privacy & Security Architecture

1. **Client Isolation**: Customers' order histories are stored strictly within their own browser session (`lf_my_orders`). They have zero access to other customers' data.
2. **Endpoint Protection**:
   - `GET /api/orders` is protected with admin session verification. Unauthorized requests receive `401 Unauthorized`.
   - `POST /api/track` requires an exact match between Order Reference and Customer Phone Number.
   - `GET /api/products` strips all administrative hashes and sensitive secrets before serving to the public.

---

## 💻 Local Development

Run the store locally with any static server:

```bash
# Using Node / npx
npx serve .

# Or using Python
python -m http.server 8000
```

Open `http://localhost:3000` or `http://localhost:8000` in your browser.
