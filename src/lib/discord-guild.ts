// DreamLand guild enforcement via Discord API + bot token.
//
// Identity comes from .env.bot (loaded at boot via src/lib/env-bot.ts):
//   DISCORD_BOT_TOKEN           — bot's secret token
//   DISCORD_BOT_CLIENT_ID       — bot's Client ID (unused at runtime but
//                                 documented in one place)
//   DREAMLAND_GUILD_ID          — shared with .env, kept here too so the
//                                 bot file is self-contained for rotation
//   DREAMLAND_MEMBER_ROLE_ID    — role to grant @member
//   DREAMLAND_INVITE_CHANNEL_URL — fallback invite link
//
// Flow (HTTP):
//   1) GET /guilds/{id}/members/{user} with bot token  — already in? done.
//   2) PUT /guilds/{id}/members/{user}  body={access_token}
//      → Discord joins the user using their OAuth access_token.
//   3) PUT /guilds/{id}/members/{user}/roles/{member_role}
//      → grant @member.
//
// Errors are swallowed so a Discord hiccup never blocks sign-in. The
// inDreamLand flag on the User row is the source of truth and is
// rechecked on every login.
import { loadBotEnv } from "@/lib/env-bot";

const API = "https://discord.com/api/v10";

function botEnv() {
  loadBotEnv();
  return {
    GUILD_ID:    process.env.DREAMLAND_GUILD_ID,
    BOT_TOKEN:   process.env.DISCORD_BOT_TOKEN,
    BOT_CLIENT:  process.env.DISCORD_BOT_CLIENT_ID,
    MEMBER_ROLE: process.env.DREAMLAND_MEMBER_ROLE_ID,
    INVITE_URL:  process.env.DREAMLAND_INVITE_CHANNEL_URL ?? "https://discord.gg/dreamland",
  };
}

export type GuildResult = {
  inGuild: boolean;
  addedNow: boolean;
  roleGranted: boolean;
  reason?: string;
};

export async function ensureDreamLandMembership(
  discordUserId: string,
  userAccessToken?: string,
): Promise<GuildResult> {
  const { GUILD_ID, BOT_TOKEN, MEMBER_ROLE } = botEnv();

  if (!GUILD_ID)  return { inGuild: false, addedNow: false, roleGranted: false, reason: "GUILD_ID_MISSING" };
  if (!BOT_TOKEN) return { inGuild: false, addedNow: false, roleGranted: false, reason: "BOT_TOKEN_MISSING" };

  // 1) already a member?
  try {
    const r = await fetch(`${API}/guilds/${GUILD_ID}/members/${discordUserId}`, {
      headers: { Authorization: `Bot ${BOT_TOKEN}` },
    });
    if (r.status === 200) return { inGuild: true, addedNow: false, roleGranted: false };
    if (r.status !== 404) {
      return { inGuild: false, addedNow: false, roleGranted: false, reason: `CHECK_${r.status}` };
    }
  } catch {
    return { inGuild: false, addedNow: false, roleGranted: false, reason: "CHECK_NETWORK" };
  }

  // 2) PUT them in via bot (using the user's OAuth access_token)
  try {
    const r = await fetch(`${API}/guilds/${GUILD_ID}/members/${discordUserId}`, {
      method: "PUT",
      headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: userAccessToken }),
    });
    if (r.status === 201 || r.status === 204) {
      let roleGranted = false;
      if (MEMBER_ROLE) {
        const rr = await fetch(
          `${API}/guilds/${GUILD_ID}/members/${discordUserId}/roles/${MEMBER_ROLE}`,
          { method: "PUT", headers: { Authorization: `Bot ${BOT_TOKEN}`, "Content-Length": "0" } },
        );
        roleGranted = rr.ok;
      }
      return { inGuild: true, addedNow: true, roleGranted };
    }
    return { inGuild: false, addedNow: false, roleGranted: false, reason: `PUT_${r.status}` };
  } catch {
    return { inGuild: false, addedNow: false, roleGranted: false, reason: "PUT_NETWORK" };
  }
}

export function dreamlandInviteUrl() {
  return botEnv().INVITE_URL;
}