# Marshmallow — Complete Deployment Guide
## Backend (Render) + Frontend (Netlify) + Database (Supabase)

---

## Overview

| Part       | Service  | What it does                     |
|------------|----------|----------------------------------|
| Database   | Supabase | PostgreSQL — stores all bookings |
| Backend    | Render   | Node.js API server               |
| Frontend   | Netlify  | Static HTML/CSS/JS website       |

---

## STEP 1 — Set Up Supabase (Database)

1. Go to **https://supabase.com** → Sign up (free)
2. Click **"New project"**
   - Name: `marshmallow`
   - Database password: choose a strong password (save it!)
   - Region: choose the closest to you
3. Wait ~2 minutes for the project to start
4. Go to **SQL Editor** (left sidebar)
5. Click **"New query"**
6. Open the file `supabase/schema.sql` from this project and **paste the entire contents** into the SQL Editor
7. Click **"Run"** — this creates all tables + default admin user
8. Get your credentials:
   - Go to **Settings → API**
   - Copy **Project URL** (looks like `https://xxxx.supabase.co`)
   - Copy **service_role** key (under "Project API keys" — use `service_role`, NOT `anon`)
9. **Save these two values** — you'll need them in Step 2

> **Default admin login:** username `admin` / password `admin123`  
> ⚠️ Change this immediately after your first login!

---

## STEP 2 — Deploy the Backend to Render

### Option A: Deploy from GitHub (Recommended)

1. Push this project to a GitHub repository:
   ```bash
   git init
   git add .
   git commit -m "initial commit"
   git remote add origin https://github.com/YOUR-USERNAME/marshmallow.git
   git push -u origin main
   ```

2. Go to **https://render.com** → Sign up (free)
3. Click **"New" → "Web Service"**
4. Connect your GitHub account and select the `marshmallow` repository
5. Configure the service:
   - **Name:** `marshmallow-api`
   - **Root Directory:** `artifacts/api-server`
   - **Environment:** `Node`
   - **Build Command:** `npm install -g pnpm && pnpm install && pnpm run build`
   - **Start Command:** `node --enable-source-maps ./dist/index.mjs`
6. Add **Environment Variables** (click "Add Environment Variable" for each):

   | Variable | Value |
   |---|---|
   | `SUPABASE_URL` | Your Supabase Project URL from Step 1 |
   | `SUPABASE_SERVICE_ROLE_KEY` | Your service_role key from Step 1 |
   | `JWT_SECRET` | Any random string (e.g. `marshmallow-super-secret-2025`) |
   | `VAPID_PUBLIC_KEY` | Public Web Push key |
   | `VAPID_PRIVATE_KEY` | Private Web Push key |
   | `VAPID_SUBJECT` | Contact value such as `mailto:you@example.com` |
   | `NODE_ENV` | `production` |

7. Click **"Create Web Service"**
8. Wait ~5 minutes for the first deploy
9. Your API URL will be something like: `https://marshmallow-api.onrender.com`
10. **Test it:** open `https://marshmallow-api.onrender.com/api/health` — you should see `{"status":"ok"}`
11. **Copy your Render URL** — you need it for Step 3

### Enable browser booking notifications

1. Generate a VAPID key pair on a trusted machine with:
   `npx web-push generate-vapid-keys`
2. Add the public key as `VAPID_PUBLIC_KEY` and keep the private key secret as `VAPID_PRIVATE_KEY` in Render.
3. Set `VAPID_SUBJECT` to an email or website contact value.
4. Run the new `push_subscriptions` table section in `supabase/schema.sql`.
5. Customers open **Track My Booking**, enter the same phone number used for the booking, and choose **Enable notifications**.
6. The notification is sent when an admin changes a booking from pending to confirmed.

### Option B: Deploy without GitHub

1. Go to **https://render.com** → Sign up
2. Click **"New" → "Web Service"** → choose "Deploy an existing image" or use the Render CLI
3. Or zip the `artifacts/api-server` folder and use Render's direct upload

---

## STEP 3 — Update Frontend with Your Render URL

1. Open the file `frontend/js/api.js`
2. Find line 9:
   ```javascript
   const API_URL = "https://YOUR-RENDER-SERVICE.onrender.com/api/action";
   ```
3. Replace `YOUR-RENDER-SERVICE` with your actual Render service name. Example:
   ```javascript
   const API_URL = "https://marshmallow-api.onrender.com/api/action";
   ```
4. Save the file

---

## STEP 4 — Deploy Frontend to Netlify

1. Go to **https://netlify.com** → Sign up (free)
2. Click **"Add new site" → "Deploy manually"**
3. **Drag and drop the entire `frontend/` folder** onto the Netlify drop zone
4. Netlify deploys instantly — you get a URL like `https://marshmallow-12345.netlify.app`
5. **Optional — Custom domain:**
   - Go to your site → Domain settings → Add custom domain

### Redeploy after changes:
Whenever you update files in the `frontend/` folder, just drag and drop the folder again on Netlify.

### For Git-based Netlify deploys:
- **Base directory:** `frontend`
- **Publish directory:** `frontend`
- **Build command:** (leave empty — no build step needed)

---

## STEP 5 — Configure CORS (Important!)

After deploying to Netlify, you need to tell the backend to allow requests from your Netlify URL.

1. Go to your Render service dashboard
2. Click **Environment**
3. Add a new variable:
   - **Key:** `ALLOWED_ORIGINS`
   - **Value:** your Netlify URL, e.g. `https://marshmallow-12345.netlify.app`
   - If you have a custom domain, add both separated by comma: `https://marshmallow-12345.netlify.app,https://yourdomain.com`
4. Render will auto-redeploy

---

## STEP 6 — First Login & Setup

1. Open your Netlify site
2. Navigate to `login.html` (or click the staff link in the footer)
3. Login with:
   - Username: `admin`
   - Password: `admin123`
4. Go to **Admin panel → Photographers** and add photographer accounts
5. Go to **Admin panel → Pricing** and configure your prices

### Create a new admin (to change the default password):
You can either:
- Use the Supabase SQL editor to update the password hash
- Or add a new admin in the users table via Supabase Table Editor

To generate a bcrypt hash for a new password:
1. Go to https://bcrypt-generator.com
2. Enter your password with **10 rounds**
3. Copy the hash
4. In Supabase → Table Editor → users → edit the admin row → paste the hash in `password_hash`

---

## File Structure

```
marshmallow/
├── frontend/           ← Deploy this folder to Netlify
│   ├── index.html
│   ├── chalet.html
│   ├── hall.html
│   ├── mabath.html
│   ├── photography.html
│   ├── salon.html
│   ├── admin.html
│   ├── billing.html
│   ├── about.html
│   ├── login.html
│   ├── css/
│   ├── js/
│   │   └── api.js      ← EDIT THIS: put your Render URL here
│   └── images/
├── artifacts/api-server/ ← This is your backend (deploy to Render)
│   └── src/
├── supabase/
│   └── schema.sql      ← Run this in Supabase SQL Editor
└── DEPLOYMENT_GUIDE.md ← This file
```

---

## Troubleshooting

### Frontend shows "Server connection failed"
- Check that your Render URL is correct in `frontend/js/api.js`
- Make sure your Render service is running (it may sleep after inactivity on free plan)
- Check the Render logs for errors

### Login doesn't work
- Verify the `users` table in Supabase has the admin row
- Check that `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set correctly in Render
- Make sure you're using the `service_role` key (not `anon`)

### CORS error in browser console
- Add your Netlify URL to `ALLOWED_ORIGINS` in Render environment variables
- Make sure there's no trailing slash in the URL

### Render service is slow to respond
- Free tier Render services "sleep" after 15 minutes of inactivity
- The first request after sleep takes ~30 seconds to wake up
- This is normal on the free tier — upgrade to a paid plan to avoid this

### Prices not showing
- Go to Supabase → Table Editor → pricing
- Make sure the sample data was inserted by the SQL schema
- Check that service names match: `chalet`, `hall`, `mabath`, `photography`

---

## Environment Variables Summary

### Render (Backend)
| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | ✅ Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ Yes | Supabase service role key |
| `JWT_SECRET` | ✅ Yes | Any random secret string |
| `NODE_ENV` | ✅ Yes | Set to `production` |
| `ALLOWED_ORIGINS` | ✅ Yes | Your Netlify URL(s) |
| `PORT` | Auto | Set automatically by Render |

---

## Quick Reference

| Action | How |
|---|---|
| View all bookings | Admin panel → Bookings tab |
| Add photographer | Admin panel → Photographers tab |
| Change prices | Admin panel → Pricing tab |
| View revenue | Billing page |
| Export data | Admin panel → Data tab → Export |
| Add testimonial | Customers submit on site; approve in Admin → Testimonials |

---

## Done! 🎉

Your Marshmallow site is now running on a real backend with a real database.
Everything is persistent, secure, and ready for real customers.
