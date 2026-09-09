@echo off
REM Pushes DreamNote's local commits to GitHub.
REM Runs git push with retry — useful because the corporate firewall
REM sometimes drops long-lived HTTPS connections on the first try.

cd /d C:\Users\koji\dreamnote

echo Pushing dreamnote to GitHub...
echo.

git push origin main 2>&1
if %ERRORLEVEL% NEQ 0 (
  echo.
  echo First attempt failed. Retrying in 3 seconds...
  timeout /t 3 /nobreak >nul
  git push origin main 2>&1
)

if %ERRORLEVEL% NEQ 0 (
  echo.
  echo ============================================================
  echo Push failed twice. Try one of:
  echo   1. Pause your antivirus/firewall briefly
  echo   2. Use a personal access token:
  echo      git push https://ghp_xxx@github.com/Kojiip0516DL/dreamnote.git main
  echo      (replace ghp_xxx with your token from github.com/settings/tokens)
  echo ============================================================
)

echo.
echo Done. Check Vercel dashboard for the new build.
pause
