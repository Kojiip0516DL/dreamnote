# 🌅 Good morning — DreamNote is fixed and ready for your Xiaomi pad

When you wake up and try again, **all the pieces now line up.** Three things must be true before it works; do them in order.

## 1) The Discord portal must accept the LAN redirect URI

Open https://discord.com/developers/applications → your **LOGIN app** (the one matching `DISCORD_CLIENT_ID` in `.env`) → **OAuth2** tab → **Redirects**.

The list MUST include BOTH of these:

```
http://localhost:3000/api/auth/callback/discord        # for testing on the PC
http://172.24.1.10:3000/api/auth/callback/discord      # for the Xiaomi pad on LAN
```

Save. **Without this, Discord silently rejects the OAuth round-trip** and the pad shows "Server error" — that's why the last attempt failed.

## 2) Start the dev server with LAN binding

In your terminal:

```bash
cd C:\Users\koji\dreamnote
npx next dev -H 0.0.0.0 -p 3000
```

The `-H 0.0.0.0` is **critical** — without it, the server only listens on localhost and the pad can't connect even if the firewall is open.

> The `-H 0.0.0.0` flag does NOT bypass Windows Firewall. We already added a firewall rule (`DreamNote Dev Port 3000`, profile Any) — it should still be in place. To re-verify: `powershell -Command "Get-NetFirewallRule -DisplayName 'DreamNote Dev Port 3000'"`.

## 3) On the Xiaomi pad

Open Chrome → type `http://172.24.1.10:3000` → click **Continue with Discord** → approve.

You should land in the editor. **If you see "Server error" again**, Discord rejected the redirect URI — go back to step 1 and confirm you saved it.

## What was fixed overnight

| Problem | Fix |
|---|---|
| Prisma adapter couldn't create the User record because `discordId` and `username` were required fields it doesn't know about | Made them optional in `prisma/schema.prisma` (`String?`), updated `events.signIn` to use `upsert` so the user record is guaranteed to exist before we touch `discordId` |
| `discordId`/`username` became `string \| null` in TS after schema change | Coerced to empty string in `session.user` callback (`auth.ts:59-60`) |
| Auth.js swallowed all callback errors and showed a generic "Configuration" page | Already patched earlier — now logs the real error. **Verify by checking** `.logs/server.log` **if anything errors** |

## Where things are now

| File | Purpose |
|---|---|
| `C:\Users\koji\dreamnote\prisma\schema.prisma` | `discordId` and `username` are now optional (`String?`), no app-level caps on notes |
| `C:\Users\koji\dreamnote\src\auth.ts` | `events.signIn` uses `prisma.user.upsert({ where: { id }, create: {...}, update: {...} })` for idempotent first-time logins |
| `C:\Users\koji\dreamnote\.env` | Updated: `AUTH_URL` and `DISCORD_REDIRECT_URI` both point at the LAN IP `http://172.24.1.10:3000` |
| `C:\Users\koji\dreamnote\.env.example` | Updated to document the `AUTH_DISCORD_ID` / `AUTH_DISCORD_SECRET` aliases Auth.js v5 needs |
| `C:\Users\koji\dreamnote\public\sw.js` | Hand-written service worker (skip next-pwa because of Workbox 7 incompatibility) — PWA installable on iOS / Android / ChromeOS / macOS / Windows / Linux |

## Cross-device matrix (recap)

| Path | What |
|---|---|
| PWA install from URL | Open `http://172.24.1.10:3000` in Chrome on the pad → `...` menu → "Install app". App icon, fullscreen, offline shell cached. |
| Capacitor APK | Already scaffolded at `C:\Users\koji\dreamnote\android\`. Build with `npm run cap:build:android` after Android Studio is installed. |
| Tauri native | Already configured at `src-tauri/`. Requires Rust + NDK; slower to build. |
| Public HTTPS URL | Deploy to Vercel/Netlify to share beyond the LAN. Set `DISCORD_REDIRECT_URI` to the public URL. |

## Skill saved

`dreamnote-project` updated with the new event flow and Prisma decision.

If anything still errors when you test in the morning:
- Open `C:\Users\koji\dreamnote\.logs\server.log` in Notepad, scroll to bottom
- Paste me the **first red `[auth][error]` line and the next 5 lines** — patch logging should now show the real cause

Sweet dreams. The Xiaomi pad will be glad when you wake up.
