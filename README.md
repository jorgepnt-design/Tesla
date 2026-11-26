# CarTV *by Jorge* 📺

Live-TV und dein eigenes IPTV auf dem großen Touchscreen im Auto – direkt im Browser des Fahrzeugs, ohne Installation, ohne Konto, ohne Server.

> Nicht verbunden mit Tesla oder einem anderen Fahrzeughersteller. Videos nur im Stand oder für Mitfahrende, wo erlaubt. CarTV nutzt das normale Video-Element des Browsers – Sperren des Fahrzeugs (z. B. kein Video während der Fahrt) gelten unverändert.

## Funktionen

- **Oberfläche für den Auto-Bildschirm:** dunkles Design, große Touch-Ziele, Seitenleiste, Startseite mit „Zuletzt gesehen“, Favoriten und Senderreihen
- **Gratis-TV:** frei empfangbare Sender aus dem öffentlichen Verzeichnis [iptv-org](https://github.com/iptv-org/iptv), nach Land (DE, AT, CH, PT, US, UK) und Thema (Nachrichten, Wetter, Kinder, Doku, Sport …)
- **Mein IPTV:** eigener Anbieter per **Xtream-Login** (Server, Benutzername, Passwort – mit Login-Prüfung und Programmvorschau „jetzt / danach“) oder **M3U-Link**; mehrere Quellen möglich
- **Player:** Vollbild, Sender hoch/runter, Senderliste zum Wechseln, Favorit, Ton, Vollbild-Modus; HLS über [hls.js](https://github.com/video-dev/hls.js); verständliche Fehlermeldungen (offline, http-Adresse, kein Browserzugriff)
- **YouTube mit eigenem Konto:** offizieller YouTube-Player (IFrame-API), Anmeldung per Handy über Googles Geräte-Ablauf (QR-Code + Code, Passwort nur am Handy), Abos, Trends, Live, „Mag ich“, Playlists, Suche und „Weiterschauen“ mit Fortschritt
- **Suche und Gruppen** in jeder Senderliste, schrittweises Laden großer Listen
- **Datenschutz:** Quellen, Zugangsdaten, Favoriten und Verlauf liegen nur im `localStorage` dieses Browsers

## Grenzen

- Nur `https://`-Streams: Auf einer https-Seite blockiert der Browser `http://`-Adressen. Viele IPTV-Anbieter bieten auch https an.
- Anbieter, die nur per `http://` erreichbar sind, laufen automatisch über die eigene Weiterleitung im Ordner [`proxy/`](proxy/) (Vercel-Funktion unter `https://cartv-proxy.vercel.app`). Neue Anbieter müssen dort einmalig in `ALLOWED_HOSTS` freigegeben werden. Sperrt ein Anbieter Rechenzentren, läuft die Weiterleitung stattdessen auf einem PC zu Hause – siehe [`relay/`](relay/README.md) (mit Tailscale Funnel); deren Adresse trägt man in der App unter *Optionen → Weiterleitung* ein oder als Repository-Variable `PROXY_URL`.
- Programmvorschau derzeit nur für Xtream-Quellen.

## YouTube einrichten

Einmalig in der [Google Cloud Console](https://console.cloud.google.com/):

1. Projekt anlegen und die **YouTube Data API v3** aktivieren
2. **API-Schlüssel** erstellen (eingeschränkt auf die Website-Adresse der App und die YouTube Data API v3)
3. **OAuth-Zustimmungsbildschirm** „Extern“, sich selbst als **Testnutzer** eintragen
4. **OAuth-Client-ID** vom Typ **„Fernseher und Geräte mit begrenzter Eingabe“** erstellen

Die Werte trägt man entweder in der App unter *Einstellungen → YouTube → Zugangsdaten* ein (nur im Browser gespeichert) oder hinterlegt sie als Repository-Variablen `YT_API_KEY`, `YT_CLIENT_ID`, `YT_CLIENT_SECRET` (*Settings → Secrets and variables → Actions → Variables*); dann sind sie in jedem Build enthalten. Hinweis: Bei diesem Client-Typ ist das „Secret“ laut Google nicht vertraulich, es landet im ausgelieferten JavaScript. Der API-Schlüssel sollte auf die Website-Adresse eingeschränkt sein.

Im Testmodus des Zustimmungsbildschirms läuft die Anmeldung nach etwa 7 Tagen ab. Die Suche kostet 100 von 10.000 täglichen Kontingent-Einheiten, Trends und Abos nur wenige.

## Geplant

- Plex und Jellyfin
- Spiele vom eigenen PC über Moonlight/Sunshine

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Typprüfung + Produktions-Build nach dist/
```

Jeder Push auf `main` veröffentlicht die App über GitHub Pages (`.github/workflows/deploy.yml`) unter https://jorgepnt-design.github.io/Tesla/ (Pages muss im Repo auf „GitHub Actions“ stehen).
