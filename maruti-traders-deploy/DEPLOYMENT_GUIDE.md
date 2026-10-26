# MARUTI TRADERS ERP - DEPLOYMENT GUIDE 🚀

This is the clean, verified, production-ready source code of Maruti Traders ERP.
It has been tested and compiles with 0 errors via `next build`.

---

## 🌟 Option 1: Deploy on Vercel (Fastest & Free)

1. Upload this folder to your GitHub account (or use GitHub Desktop).
2. Go to [https://vercel.com](https://vercel.com) and log in.
3. Click **"Add New"** > **"Project"** and select the repository.
4. Keep the Framework as **Next.js**.
5. Add Environment Variables:
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = `maruti_traders_super_secret_jwt_key_2026`
6. Click **Deploy**.
   Vercel will run `npm run build` and generate all 28 pages smoothly!

---

## 🌟 Option 2: Deploy on Render.com (Recommended for SQLite persistence)

1. Go to [https://render.com](https://render.com).
2. Click **New Web Service** and connect your GitHub repository (or Docker).
3. Settings:
   - **Environment:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm start`
4. Add Environment Variables:
   - `DATABASE_URL` = `file:./dev.db`
   - `JWT_SECRET` = `maruti_traders_super_secret_jwt_key_2026`
5. Deploy Web Service!

---

## 🌟 Option 3: Deploy on VPS / Ubuntu Server (cPanel / DigitalOcean / Hostinger)

1. Upload and unzip the project on your server.
2. In the terminal run:
   ```bash
   npm install
   npm run build
   ```
3. Start with PM2:
   ```bash
   pm2 start npm --name "maruti-erp" -- start -- -p 3000
   pm2 save
   ```

---

## 🔑 Default Login Credentials:
- **Email:** `admin@marutitraders.com`
- **Password:** `admin123`
- **Locations Available:** JALOD (Default) & DAHOD
