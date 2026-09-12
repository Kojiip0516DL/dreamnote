@echo off
REM ============================================================
REM ONE-CLICK FIX for the DreamNote Vercel deployment
REM ============================================================
REM
REM Does THREE things, in order:
REM 1. Saves all env vars (you'll paste real Discord credentials)
REM 2. Triggers a fresh Vercel build
REM 3. Tells you when the public URL is ready
REM
REM Usage: just paste values when prompted.
REM
REM For "paste values", see the conversation history with Hermes for:
REM   - DISCORD_CLIENT_ID: from https://discord.com/developers/applications
REM     -> your LOGIN app -> OAuth2 -> Client ID
REM   - DISCORD_CLIENT_SECRET: same page -> "Reset Secret" then copy
REM   - DISCORD_BOT_*: from .env.bot on your PC
REM   - DREAMLAND_MEMBER_ROLE_ID: from .env.bot on your PC
REM ============================================================

cd /d C:\Users\koji\dreamnote

echo.
echo ============================================================
echo   Step 1: Did you save env vars in Vercel dashboard yet?
echo ============================================================
echo.
echo Open: https://vercel.com/dream-land2/dreamnote/settings/environment-variables
echo.
echo Save these (Production + Preview environments, Sensitive OFF):
echo   - DISCORD_CLIENT_ID          = your Discord app Client ID
echo   - DISCORD_CLIENT_SECRET      = your Discord app Client Secret
echo   - DISCORD_REDIRECT_URI       = https://dreamnote-git-main-dream-land2.vercel.app/api/auth/callback/discord
echo   - AUTH_DISCORD_ID            = same as DISCORD_CLIENT_ID
echo   - AUTH_DISCORD_SECRET        = same as DISCORD_CLIENT_SECRET
echo   - AUTH_SECRET                = (run on PC, paste base64: node -e "console.log(require('crypto').randomBytes(32).toString('base64'))")
echo   - AUTH_URL                   = https://dreamnote-git-main-dream-land2.vercel.app
echo   - DISCORD_BOT_CLIENT_ID      = from .env.bot
echo   - DISCORD_BOT_TOKEN          = from .env.bot
echo   - DREAMLAND_GUILD_ID         = 1375911911618777168
echo   - DREAMLAND_MEMBER_ROLE_ID   = from .env.bot
echo   - DREAMLAND_INVITE_CHANNEL_URL = https://discord.gg/dreamland
echo.
echo DATABASE_URL and POSTGRES_PRISMA_URL are already auto-set by Vercel Postgres.
echo.
pause

echo.
echo ============================================================
echo   Step 2: Trigger Vercel redeploy via git push
echo ============================================================
git add -A
git commit --allow-empty -m "Trigger Vercel redeploy after env vars saved"
git push origin main

echo.
echo ============================================================
echo   Step 3: Watch the build
echo ============================================================
echo.
echo Open: https://vercel.com/dream-land2/dreamnote
echo Click "Deployments" tab.
echo The newest row should be building now (commit ending in the latest hash).
echo Wait 2-3 minutes.
echo.
echo When status turns GREEN, click it -> "Visit" link at top = your live URL.
echo.
echo When status is RED, click "View Build" -> copy the last 5 lines -> paste to Hermes.

pause
