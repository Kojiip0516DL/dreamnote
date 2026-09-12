@echo off
REM ============================================================
REM  DEPLOY-FAST.BAT
REM  Walks you through Vercel env var entry with copy-paste values
REM ============================================================

setlocal

cd /d C:\Users\koji\dreamnote

echo.
echo ============================================================
echo   STEP 1 - read .env values from your PC
echo ============================================================
echo.

REM Read each env var from .env (skipping comments and blank lines)
set "DISCORD_CLIENT_ID="
set "DISCORD_CLIENT_SECRET="
set "AUTH_DISCORD_ID="
set "AUTH_DISCORD_SECRET="
set "AUTH_SECRET="
set "DISCORD_BOT_CLIENT_ID="
set "DISCORD_BOT_TOKEN="
set "DREAMLAND_MEMBER_ROLE_ID="

REM Use a Python one-liner for robust parsing
for /f "tokens=*" %%L in ('python -c "import re,sys; t=open('.env','r',encoding='utf-8').read(); print('\n'.join('|'.join(line.split('=',1)) for line in t.splitlines() if line and not line.startswith('#') and '=' in line))"') do (
    for /f "tokens=1,2 delims=|" %%A in ("%%L") do (
        if "%%A"=="DISCORD_CLIENT_ID"  set "DISCORD_CLIENT_ID=%%B"
        if "%%A"=="DISCORD_CLIENT_SECRET"  set "DISCORD_CLIENT_SECRET=%%B"
        if "%%A"=="AUTH_DISCORD_ID"  set "AUTH_DISCORD_ID=%%B"
        if "%%A"=="AUTH_DISCORD_SECRET"  set "AUTH_DISCORD_SECRET=%%B"
        if "%%A"=="AUTH_SECRET"  set "AUTH_SECRET=%%B"
    )
)
for /f "tokens=*" %%L in ('python -c "t=open('.env.bot','r',encoding='utf-8').read(); print('\n'.join('|'.join(line.split('=',1)) for line in t.splitlines() if line and not line.startswith('#') and '=' in line))"') do (
    for /f "tokens=1,2 delims=|" %%A in ("%%L") do (
        if "%%A"=="DISCORD_BOT_CLIENT_ID"  set "DISCORD_BOT_CLIENT_ID=%%B"
        if "%%A"=="DISCORD_BOT_TOKEN"  set "DISCORD_BOT_TOKEN=%%B"
        if "%%A"=="DREAMLAND_MEMBER_ROLE_ID"  set "DREAMLAND_MEMBER_ROLE_ID=%%B"
    )
)

echo ============================================================
echo   Values loaded from .env / .env.bot
echo ============================================================
echo.
echo DISCORD_CLIENT_ID    = %DISCORD_CLIENT_ID%
echo DISCORD_CLIENT_SECRET= %DISCORD_CLIENT_SECRET:~0,10%...len=%DISCORD_CLIENT_SECRET_len%
echo AUTH_DISCORD_ID      = %AUTH_DISCORD_ID%
echo AUTH_DISCORD_SECRET  = %AUTH_DISCORD_SECRET:~0,10%...len=%AUTH_DISCORD_SECRET_len%
echo AUTH_SECRET          = %AUTH_SECRET:~0,10%...len=%AUTH_SECRET_len%
echo DISCORD_BOT_CLIENT_ID= %DISCORD_BOT_CLIENT_ID%
echo DISCORD_BOT_TOKEN    = %DISCORD_BOT_TOKEN:~0,10%...len=%DISCORD_BOT_TOKEN_len%
echo DREAMLAND_MEMBER_ROLE_ID= %DREAMLAND_MEMBER_ROLE_ID%
echo.
echo ============================================================
echo   STEP 2 - save env vars in Vercel
echo ============================================================
echo.
echo Open this URL in your browser, then add the env vars below:
echo https://vercel.com/dream-land2/dreamnote/settings/environment-variables
echo.
echo PASTE these values into Vercel (one at a time):
echo  =======================================
echo  Key:                Value:
echo  =======================================
echo  DISCORD_CLIENT_ID         %DISCORD_CLIENT_ID%
echo  DISCORD_CLIENT_SECRET     %DISCORD_CLIENT_SECRET%
echo  AUTH_DISCORD_ID           %AUTH_DISCORD_ID%
echo  AUTH_DISCORD_SECRET       %AUTH_DISCORD_SECRET%
echo  AUTH_SECRET               %AUTH_SECRET%
echo  DISCORD_REDIRECT_URI      https://dreamnote-git-main-dream-land2.vercel.app/api/auth/callback/discord
echo  AUTH_URL                  https://dreamnote-git-main-dream-land2.vercel.app
echo  DISCORD_BOT_CLIENT_ID     %DISCORD_BOT_CLIENT_ID%
echo  DISCORD_BOT_TOKEN         %DISCORD_BOT_TOKEN%
echo  DREAMLAND_GUILD_ID        1375911911618777168
echo  DREAMLAND_MEMBER_ROLE_ID  %DREAMLAND_MEMBER_ROLE_ID%
echo  DREAMLAND_INVITE_CHANNEL_URL  https://discord.gg/dreamland
echo.
echo (For each, set Production + Preview environments, Sensitive OFF)
echo.
echo ============================================================
echo   STEP 3 - trigger redeploy (one click after env vars saved)
echo ============================================================
echo.
echo Going to push a no-op commit to trigger Vercel to rebuild with new env vars.
echo.
pause

git commit --allow-empty -m "Trigger Vercel redeploy after env vars saved"
git push origin main

echo.
echo ============================================================
echo   STEP 4 - open Vercel to watch the build
echo ============================================================
echo.
echo https://vercel.com/dream-land2/dreamnote
echo.
echo Wait 2-3 minutes. Refresh Deployments tab.
echo.
echo - If GREEN: open your URL, click Continue with Discord, you're done
echo - If RED with same "Missing Discord OAuth credentials" error:
echo     you forgot to save a var. Open Settings > Environment Variables
echo     and add whichever is missing. Then Redeploy.
echo.
echo Send me the result and I'll debug from there.
echo.
pause
