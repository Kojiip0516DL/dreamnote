// Loads the bot app's secrets at runtime.
//
// Why this exists: we split bot creds into .env.bot (separate from .env) so
// revoking the bot — e.g. compromised token, swapping to a new app — is one
// file edit, and so .env.example can document the bot key without dragging
// in any login-app secrets.
//
// Resolution order (first hit wins):
//   1. process.env                       — production / container deployments
//   2. .env.bot.<NODE_ENV>.local         — local dev override
//   3. .env.bot.<NODE_ENV>               — prod-stage override
//   4. .env.bot.local                    — local dev override (any node_env)
//   5. .env.bot                          — default
//
// We deliberately DO NOT load .env here — next.js has already done that.
import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

function loadOnce(file: string) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq < 0) continue;
    const k = line.slice(0, eq).trim();
    let v = line.slice(eq + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function loadAll() {
  const env = process.env.NODE_ENV ?? "development";
  const here = dirname(fileURLToPath(import.meta.url));
  const root = join(here, "..", ".."); // src/lib/.. -> project root
  for (const f of [
    `.env.bot.${env}.local`,
    `.env.bot.${env}`,
    `.env.bot.local`,
    `.env.bot`,
  ]) {
    loadOnce(join(root, f));
  }
}

let _loaded = false;
export function loadBotEnv() {
  if (_loaded) return;
  _loaded = true;
  loadAll();
}
