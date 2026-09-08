# DreamNote dependency patches

These patches fix known bugs in upstream libraries that block core flows:

## `fix-auth-core.cjs`

Patches two bugs in **`@auth/core@5.0.0-beta.x`**:

1. **`lib/pages/index.js`** — `signin(providerId)` throws `"UnknownAction: Unsupported action"` when a providerId IS given. This is the **root cause** of the `Configuration` error users hit when clicking "Continue with Discord". The fix replaces the throw with a proper OAuth-init redirect.

2. **`lib/actions/callback/index.js`** — swallows callback errors and converts them all to a generic `Configuration` message. The fix adds an `error`-level log so the real cause is visible in the server console.

### Why `npm install` doesn't break us

This script is wired into `package.json` `postinstall`. Every `npm install` (or `npm i`, `npm ci`, etc.) re-runs it automatically. The script is **idempotent** — markers check that each patch is already applied before doing anything.

### Maintenance

If you see this when running `npm install`:

```
[patch] target text not found in node_modules/@auth/core/lib/pages/index.js - version drift?
```

…that means a new version of `@auth/core` was released that fixed the underlying bug upstream. In that case:

1. Check if the bug is genuinely fixed by reading the new source
2. Remove the `postinstall` line from `package.json`
3. Delete this directory if no longer needed
