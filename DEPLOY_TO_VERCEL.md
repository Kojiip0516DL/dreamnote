# 🚀 Deploying DreamNote to Vercel — step by step

Everything is **prepped for Vercel.** The Next.js app builds cleanly with the Postgres schema, Prisma generate runs as part of the build, and `vercel.json` is in place. You just need to do 3 things, ~5 minutes total.

## Quickstart (recommended — uses GitHub)

1. **Push to GitHub** (one-time setup)
   ```bash
   cd C:\Users\koji\dreamnote
   git remote add origin https://github.com/YOURUSERNAME/dreamnote.git
   git branch -M main
   git push -u origin main
   ```
   (You need a GitHub account + a `dreamnote` repository under it. Create one on github.com first; one click + name + private is fine.)

2. **Sign up at https://vercel.com** with "Continue with GitHub" — easiest. Vercel will ask which GitHub repos to grant access; pick the dreamnote one.

3. **Click "Add New Project → Import"** for the dreamnote repo.
   - Vercel auto-detects Next.js. Don't change settings.
   - Hit **Deploy**. The first build takes ~2-3 minutes.

4. **Add env vars** (Vercel dashboard → Project → Settings → Environment Variables). Use the values from `.env.production.example`. The list:

| Name | Value |
|---|---|
| `DATABASE_URL` | (get this first from Neon — see step 5) |
| `AUTH_SECRET` | (generate below) |
| `AUTH_URL` | `https://YOUR-PROJECT.vercel.app` (use the actual URL Vercel assigned) |
| `DISCORD_CLIENT_ID` | from your `.env` |
| `DISCORD_CLIENT_SECRET` | from your `.env` (use **Reset Secret** in the portal to make a fresh one if you want) |
| `DISCORD_REDIRECT_URI` | `https://YOUR-PROJECT.vercel.app/api/auth/callback/discord` |
| `AUTH_DISCORD_ID` | same as `DISCORD_CLIENT_ID` |
| `AUTH_DISCORD_SECRET` | same as `DISCORD_CLIENT_SECRET` |
| `DISCORD_BOT_CLIENT_ID` | from your `.env.bot` |
| `DISCORD_BOT_TOKEN` | from your `.env.bot` |
| `DREAMLAND_GUILD_ID` | `1375911911618777168` |
| `DREAMLAND_MEMBER_ROLE_ID` | from your `.env.bot` |
| `DREAMLAND_INVITE_CHANNEL_URL` | `https://discord.gg/dreamland` |

   For `AUTH_SECRET` paste the output of:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

5. **Database (Neon Postgres)** — Free tier, no credit card required.
   - Sign up at https://neon.tech (continue with GitHub)
   - Click "Create project" → region US East (or wherever) → "Postgres 16"
   - On the project dashboard, click **Connection details** → select **Pooled connection** → copy the URL
   - Paste it as `DATABASE_URL` in Vercel env vars
   - The `?sslmode=require` query param needs to be appended automatically by Neon; if not, append manually.

6. **Add the redirect URI to Discord portal**
   - https://discord.com/developers/applications → your **LOGIN app** → OAuth2 → Redirects
   - Add `https://YOUR-PROJECT.vercel.app/api/auth/callback/discord` (in addition to or instead of the LAN IP)

7. **Redeploy** Vercel (Project → Deployments → click latest → ⋯ → Redeploy). The newly-added env vars need a fresh build to take effect.

8. **Open the app** on the Xiaomi pad — type `https://YOUR-PROJECT.vercel.app` and login. **Same URL works for any phone on any network worldwide now.**

9. **Install as PWA** — Chrome → `...` → "Install app". Done.

## Cost

**$0/month** unless you have >10,000 active users.

## Why Vercel

- Free HTTPS subdomain (`*.vercel.app`)
- Serverless (auto-scales)
- Built-in cron jobs (your daily archive runs server-side at 00:00 HKT)
- One-click rollback
- Deploy on git push

## Tearing down the LAN setup (optional, cleanup)

If Vercel works and you don't need LAN access anymore:
- Stop running `npx next dev -H 0.0.0.0` (and don't use that flag)
- The Windows Firewall rule (`DreamNote Dev Port 3000`) is harmless to leave; remove with:
  ```powershell
  Remove-NetFirewallRule -DisplayName "DreamNote Dev Port 3000"
  ```
- Revert `.env` `AUTH_URL` / `DISCORD_REDIRECT_URI` back to `http://localhost:3000` for PC-only dev work

## If you skipped the GitHub dance and want raw CLI

```bash
cd C:\Users\koji\dreamnote
npx vercel login   # paste the URL it gives you into a browser, sign in, copy the code
npx vercel env add DATABASE_URL production    # paste your Neon URL when prompted
# ... repeat `vercel env add` for each variable above ...
npx vercel --prod
```

The CLI approach is faster but harder to remember which env vars you've added. The dashboard approach is more discoverable.

## Why I couldn't deploy myself

`npx vercel login` requires interactive email confirmation or device-code verification, neither of which is automatable. The CLI installs fine, but the auth step needs you. **Even on the free Hobby tier, this is a 30-sec "verify your email" step.**

## Files added tonight

| Path | Purpose |
|---|---|
| `C:\Users\koji\dreamnote\vercel.json` | Vercel build config (prisma generate → next build, daily archive cron) |
| `C:\Users\koji\dreamnote\.env.production.example` | Template listing the env vars Vercel needs (no real values) |
| `C:\Users\koji\dreamnote\prisma\schema.prisma` | Updated to PostgreSQL provider |
| Initial `git` commit at commit `e7b6321` |

The dev-server-with-LAN-bit should still work locally since the `.env` file still has SQLite-style DATABASE_URL — but **after** you deploy to Vercel, switch `.env`'s `DATABASE_URL` to the Neon Postgres URL too (so your laptop doesn't show "DATABASE_URL not configured" errors).

Enjoy! If the Vercel deploy runs into anything weird (especially on the env vars step), screenshot the error and I'll debug.
