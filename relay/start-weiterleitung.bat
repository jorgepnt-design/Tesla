@echo off
chcp 65001 >nul
title CarTV-Weiterleitung
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js fehlt. Bitte zuerst installieren: https://nodejs.org  ^(Version "LTS"^)
  pause
  exit /b 1
)
where tailscale >nul 2>nul
if errorlevel 1 (
  echo Tailscale fehlt. Bitte zuerst installieren und anmelden: https://tailscale.com/download/windows
  pause
  exit /b 1
)
echo Mache die Weiterleitung per https erreichbar ...
tailscale funnel --bg 8787
echo.
tailscale funnel status
echo.
echo Die https-Adresse oben ^(https://....ts.net^) traegst du in CarTV unter Optionen - Weiterleitung ein.
echo.
node server.mjs
pause
