# 🚀 Deploying DreamNote — Vercel status & next steps

## Current state (verified by Hermes)

| Item | Status |
|---|---|
| GitHub repo created | ✅ `Kojiip0516DL/dreamnote` (private) |
| Initial commit pushed | ✅ `e7b6321` — full project source |
| Patched build commit ready locally | ✅ `6bb924a` — defers OAuth validation to runtime |
| Vercel project imported | ✅ |
| Vercel Postgres connected | ✅ (`prisma-postgres-green-grass`) |
| First Vercel build | ❌ Failed — `Missing Discord OAuth credentials` at "Collect page data" step |
| Env vars on Vercel | **unknown — needs check** |

## Why the build failed (one line)

`/api/folders/route.ts` imports `auth.ts` at module load, which evaluates `NextAuth({...})` with the Discord provider config. Auth.js v5 throws at that point because `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` aren't in the build environment. My commit `6bb924a` removes that throw so the build passes; the auth will then error at runtime if env vars are still missing, but you get a URL to work with.

## What you do (5 min)

### 1. Open Vercel → dreamnote → Settings → Environment Variables

Click each row of this table. Production + Preview environments only. Sensitive OFF for all.

| Key | Value |
|---|---|
| `DATABASE_URL` | (auto-set when you connected Prisma Postgres — verify it's there) |
| `POSTGRES_PRISMA_URL` | (auto-set, leave it) |
| `AUTH_DISCORD_ID` | paste your `DISCORD_CLIENT_ID` value from your PC's `.env` |
| `AUTH_DISCORD_SECRET` | paste your `DISCORD_CLIENT_SECRET` value from your PC's `.env` |
| `DISCORD_CLIENT_ID` | same value as `AUTH_DISCORD_ID` |
| `DISCORD_CLIENT_SECRET` | same value as `AUTH_DISCORD_SECRET` |
| `DISCORD_REDIRECT_URI` | paste once you have the public URL, format `https://dreamnote-XXXXX.vercel.app/api/auth/callback/discord` |
| `AUTH_SECRET` | run `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"` on PC, paste output |
| `AUTH_URL` | `https://dreamnote-XXXXX.vercel.app` (same as the URL part above) |
| `DISCORD_BOT_CLIENT_ID` | paste from `.env.bot` |
| `DISCORD_BOT_TOKEN` | paste from `.env.bot` |
| `DREAMLAND_GUILD_ID` | `1375911911618777168` |
| `DREAMLAND_MEMBER_ROLE_ID` | paste from `.env.bot` |
| `DREAMLAND_INVITE_CHANNEL_URL` | `https://discord.gg/dreamland` |

### 2. (Optional) Push the local patch commit

The local repo has 2 commits ahead of GitHub: a build-time-defer patch and a morning-doc update. They don't fix the missing-env-var issue (which requires step 1). Pushing them just makes the source slightly more forgiving if you ever rotate envs. **Skip if env vars are set — the build will pass.**

If you want to push, in your Windows terminal:

```bash
cd C:\Users\koji\dreamnote
git push origin main
```

If asked for credentials, sign in to GitHub. **It should reuse your existing auth** (you already pushed once before).

**Note**: `git push` from Hermes's shell hangs on your network — only your terminal can push.

### 3. Wait for Vercel auto-deploy

Vercel sees the new commit, triggers a new build (~2 min). Should succeed because all env vars are present.

### 4. Get the public URL

Once build succeeds, Vercel shows: `https://dreamnote-XXXXX.vercel.app`

Copy this URL.

### 5. Update DISCORD_REDIRECT_URI + AUTH_URL

Go back to **Settings → Environment Variables**, edit:
- `DISCORD_REDIRECT_URI` → `https://dreamnote-XXXXX.vercel.app/api/auth/callback/discord`
- `AUTH_URL` → `https://dreamnote-XXXXX.vercel.app`

Save → redeploy.

### 6. Update Discord developer portal

https://discord.com/developers/applications → your LOGIN app → OAuth2 → Redirects:
- Add `https://dreamnote-XXXXX.vercel.app/api/auth/callback/discord`
- (Keep the LAN one too if you want both)

Save.

### 7. Test in browser

Open the public URL in any browser. Click **Continue with Discord** → should redirect to Discord OAuth → approve → land in the editor.

### 8. Install on Xiaomi pad

Open the public URL on the pad → Chrome `...` → "Install app". Now it lives as a real app.

## Quick recap of what changed tonight (Hermes did this)

- Switched Prisma schema from SQLite to Postgres provider
- Wrote `vercel.json` (build command + daily archive cron)
- Wrote `.env.production.example` (template for Vercel env vars)
- Made the build pass when env vars are missing (commit `6bb924a`)
- Pushed initial commit (`e7b6321`) — 23 files

## What's local and not on GitHub yet

- `.env` / `.env.bot` (correctly gitignored)
- `prisma/dev.db` (correctly gitignored)
- `node_modules/` (correctly gitignored)
- `.next/` (gitignored)

## What Hermes could not do

- Run `gh auth login` (requires interactive browser OAuth from your terminal)
- Add env vars to your Vercel dashboard (requires your login)
- Trigger Vercel redeploy (you click the button — Hermes can't reach Vercel's API without an API token)
- Visit the public URL on the Xiaomi pad (Hermes has no tablet)

## If something goes wrong tomorrow

| Symptom | Fix |
|---|---|
| Build still fails after env vars set | Check that **all** 14 vars are in Vercel (the 12 you added + the 2 auto-set by Vercel Postgres) |
| Build succeeds but URL shows "Configuration" | The redirect URI in Discord portal doesn't include the public URL — add it |
| URL loads but Discord OAuth redirects to error | Same as above (redirect URI mismatch) |
| "Configuration" with no clear cause | Check Vercel's function logs: Project → Logs tab → look for `[auth]` lines |
| Pad can't install PWA | Use Chrome (not Mi Browser) → `...` menu → "Install app" |

## Local dev (if you want to run on PC at the same time)

The project still has SQLite-compatible code for local dev. To run on PC:
1. Make sure `.env` has `DATABASE_URL="file:./dev.db"` and other LAN-IP values
2. `npx next dev -H 0.0.0.0 -p 3000`
3. Open `http://172.24.1.10:3000` from any LAN device

But you'll get "Configuration" on LAN too until you also register the LAN redirect URI in your Discord portal.

## Cost confirmation

Vercel + Vercel Postgres on Hobby plan:
- Hosting: $0
- Database: $0
- Bandwidth: $0 (covered by 100 GB/month free tier)
- Build minutes: $0 (covered by 6000 min/month)

**$0/month total** until you exceed 10k active monthly users, which won't happen unless DreamNote goes viral.

Sleep well — when you wake up, you'll have:
- A live public HTTPS URL for DreamNote
- A Xiaomi-pad-installable PWA
- 12 env vars documented and ready to copy/paste

Take care 🌙
