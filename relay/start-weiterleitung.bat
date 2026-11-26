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
tailscale status >nul 2>nul
if errorlevel 1 (
  echo Tailscale ist auf diesem PC nicht angemeldet.
  echo Bitte unten rechts in der Taskleiste auf das Tailscale-Symbol klicken - "Log in" - mit Google anmelden.
  echo Danach diese Datei noch einmal starten.
  pause
  exit /b 1
)
echo Mache die Weiterleitung per https erreichbar ...
tailscale funnel --bg 8787
if errorlevel 1 (
  echo.
  echo Funnel konnte nicht eingeschaltet werden. Falls sich ein Browserfenster geoeffnet hat: dort Funnel erlauben
  echo und diese Datei noch einmal starten. Ausserdem muss unter https://login.tailscale.com/admin/dns
  echo "HTTPS Certificates" eingeschaltet sein.
  pause
  exit /b 1
)
echo.
tailscale funnel status
echo.
echo Die https-Adresse oben ^(https://....ts.net^) traegst du in CarTV unter Optionen - Weiterleitung ein.
echo.
node server.mjs
pause
