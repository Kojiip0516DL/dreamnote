# DreamNote

An Obsidian + Notability-style note app that runs on **Web, iOS, macOS, Android, Windows, Linux**. Login with Discord. Unlimited notes per user.

> Made for the DreamLand Discord community.

## ✨ Features

- **Discord OAuth** sign-in (no password to forget)
- **Auto-join to DreamLand** (`1375911911618777168`) on first sign-in via the Discord `guilds.join` OAuth scope + a bot token with `CREATE_INSTANT_INVITE` + `MANAGE_ROLES` perms in the guild
- **`@member` role** granted automatically right after joining
- **Unlimited notes** per user — no caps, no quotas at the app level (Postgres row limits are still infinite for practical purposes)
- **Block editor** (`@blocknote/mantine`) — slash commands, headings, code, tables, embeds. Notability-clean typography, Obsidian-grade structure
- **Daily note** auto-created every day (`/api/notes/daily`)
- **Folders + tags + pin + trash** with full-text search across title and plaintext
- **Cross-platform shell** via Tauri 2.0:
  - Windows / macOS / Linux: `npm run tauri:build`
  - iOS / Android: open `src-tauri/gen/apple` / `src-tauri/gen/android` in Xcode / Android Studio after `npm run tauri build`

## 🧱 Stack

| Layer | Choice |
|---|---|
| Web app | Next.js 14 (App Router) + TypeScript + Tailwind |
| Auth | Auth.js v5 + Discord provider |
| Database | Prisma — SQLite locally, swap to Postgres in prod |
| Editor | BlockNote (Mantine theme) |
| Native shell | Tauri 2.0 (Rust) |
| State | TanStack React Query |

## 🚀 Setup

```bash
# 1. install
cp .env.example .env
# fill in DISCORD_CLIENT_ID / DISCORD_CLIENT_SECRET / DISCORD_BOT_TOKEN
# fill in DREAMLAND_GUILD_ID (= 1375911911618777168) and DREAMLAND_MEMBER_ROLE_ID
npm install

# 2. database
npm run db:push

# 3. dev
npm run dev
# open http://localhost:3000 → click "Continue with Discord"
```

### Discord side (one-time, 5 min)

1. https://discord.com/developers/applications → **New Application** (any name)
2. **OAuth2 → Redirects**: add `http://localhost:3000/api/auth/callback/discord` (and your prod URL)
3. **Bot** tab → **Reset Token** → copy into `DISCORD_BOT_TOKEN`
4. **OAuth2 → URL Generator** → scopes `bot` + `applications.commands`, then URL → invite the bot into DreamLand
5. In DreamLand: open Server Settings → Roles → copy the `@member` role ID into `DREAMLAND_MEMBER_ROLE_ID`
6. In DreamLand: right-click bot → make sure it has `Manage Roles` permission *and* its highest role is **above** `@member` (otherwise role grants fail silently)

## 📱 Mobile (iOS / Android)

```bash
npm run tauri build                  # generates src-tauri/gen/{apple,android}
open src-tauri/gen/apple             # Xcode → Product > Run
# or
open -a "Android Studio" src-tauri/gen/android
```

(For Apple, set `developmentTeam` in `src-tauri/tauri.conf.json` and your signing cert.)

## 🖥️ Desktop

```bash
npm run tauri:dev                    # native window + HMR
npm run tauri:build                  # produces .msi/.exe/.dmg/.AppImage/.deb
```

## 🔐 DreamLand enforcement (what happens at sign-in)

`src/auth.ts → events.signIn` calls `ensureDreamLandMembership(discordId, oauthAccessToken)` in `src/lib/discord-guild.ts`:

1. `GET /guilds/{id}/members/{user}` with the bot token — already in? done.
2. Otherwise `PUT /guilds/{id}/members/{user}` with `{ access_token }` — bot adds them using the **OAuth user's access_token** (no invite-click required).
3. `PUT /guilds/{id}/members/{user}/roles/{member_role}` to grant `@member`.

Failures are non-fatal — sign-in still succeeds and `inDreamLand` is cached as `false` so the UI can show a "Join DreamLand" button.

## 🗃️ Notes model

```
Note { id, userId, folderId?, title, content(JSON), plaintext, isDaily, dailyFor?,
       pinned, trashed, trashedAt?, wordCount, createdAt, updatedAt }
```

Unlimited per user — Prisma schema has **no** `limit` constraint; the DB row count is bounded only by storage.

## License

MIT — DreamLand 2026."" 
