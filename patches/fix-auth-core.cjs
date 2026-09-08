#!/usr/bin/env node
/**
 * Patch script for Auth.js v5 bug at node_modules/@auth/core/lib/pages/index.js
 *
 * Bug: renderPage.signin(providerId) throws "UnknownAction: Unsupported action"
 * when a providerId IS given, which is the entire point of /api/auth/signin/discord.
 * The intention was clearly the opposite — throw when no providerId is given.
 *
 * This script is wired into package.json's "postinstall" so the fix survives
 * `npm install` and friends. Idempotent — safe to run repeatedly.
 */
const fs = require("node:fs");

const PAGES_INDEX = "node_modules/@auth/core/lib/pages/index.js";
const CALLBACK_INDEX = "node_modules/@auth/core/lib/actions/callback/index.js";

let touched = 0;

const TARGETS = [
  {
    file: PAGES_INDEX,
    marker: "Patched by DreamNote",
    find: [
      "        signin(providerId, error) {",
      "            if (providerId)",
      '                throw new UnknownAction("Unsupported action");',
    ].join("\n"),
    replace: [
      "        signin(providerId, error) {",
      "            // Patched by DreamNote: with providerId, GET signin should",
      "            // 302 to the POST signin endpoint so the OAuth flow can start.",
      "            // Bug: original code threw \"Unsupported action\" instead.",
      "            if (providerId && params.url) {",
      "                const signinUrl = new URL(params.url);",
      "                const postUrl = new URL(signinUrl.pathname, signinUrl.origin);",
      "                postUrl.search = signinUrl.search;",
      "                return { redirect: postUrl.toString(), cookies };",
      "            }",
    ].join("\n"),
  },
  {
    file: CALLBACK_INDEX,
    marker: "DREAMNOTE PATCH: log the underlying",
    find: [
      '        logger.debug("callback route error details", { method, query, body });',
    ].join("\n"),
    replace: [
      "        // DREAMNOTE PATCH: log the underlying error message so we can debug",
      '        (options.logger ?? console).error("callback route error", { message: (e && e.message) ?? String(e), stack: (e && e.stack) ?? "", method, query, body });',
    ].join("\n"),
  },
];

for (const t of TARGETS) {
  if (!fs.existsSync(t.file)) {
    console.warn("[patch] missing", t.file);
    continue;
  }
  const txt = fs.readFileSync(t.file, "utf8");
  if (txt.includes(t.marker)) {
    console.log("[patch] already applied:", t.file);
    continue;
  }
  if (!txt.includes(t.find)) {
    console.error("[patch] target text not found in", t.file, "- version drift?");
    process.exit(1);
  }
  const next = txt.replace(t.find, t.replace);
  fs.writeFileSync(t.file, next);
  touched++;
  console.log("[patch] applied to", t.file);
}
if (touched) console.log(`[patch] ${touched} file(s) patched.`);
