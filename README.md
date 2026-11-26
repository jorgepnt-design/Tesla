# CarTV *by Jorge* 📺

Live-TV und dein eigenes IPTV auf dem großen Touchscreen im Auto – direkt im Browser des Fahrzeugs, ohne Installation, ohne Konto, ohne Server.

> Nicht verbunden mit Tesla oder einem anderen Fahrzeughersteller. Videos nur im Stand oder für Mitfahrende, wo erlaubt. CarTV nutzt das normale Video-Element des Browsers – Sperren des Fahrzeugs (z. B. kein Video während der Fahrt) gelten unverändert.

## Funktionen

- **Oberfläche für den Auto-Bildschirm:** dunkles Design, große Touch-Ziele, Seitenleiste, Startseite mit „Zuletzt gesehen“, Favoriten und Senderreihen
- **Gratis-TV:** frei empfangbare Sender aus dem öffentlichen Verzeichnis [iptv-org](https://github.com/iptv-org/iptv), nach Land (DE, AT, CH, PT, US, UK) und Thema (Nachrichten, Wetter, Kinder, Doku, Sport …)
- **Mein IPTV:** eigener Anbieter per **Xtream-Login** (Server, Benutzername, Passwort – mit Login-Prüfung und Programmvorschau „jetzt / danach“) oder **M3U-Link**; mehrere Quellen möglich
- **Player:** Vollbild, Sender hoch/runter, Senderliste zum Wechseln, Favorit, Ton, Vollbild-Modus; HLS über [hls.js](https://github.com/video-dev/hls.js); verständliche Fehlermeldungen (offline, http-Adresse, kein Browserzugriff)
- **Suche und Gruppen** in jeder Senderliste, schrittweises Laden großer Listen
- **Datenschutz:** Quellen, Zugangsdaten, Favoriten und Verlauf liegen nur im `localStorage` dieses Browsers

## Grenzen

- Nur `https://`-Streams: Auf einer https-Seite blockiert der Browser `http://`-Adressen. Viele IPTV-Anbieter bieten auch https an.
- Streams und Listen müssen den Abruf aus dem Browser erlauben (CORS). Ein optionaler eigener Weiterleitungs-Server wäre der nächste Ausbauschritt.
- Programmvorschau derzeit nur für Xtream-Quellen.

## Geplant

- YouTube mit eigenem Konto über den offiziellen YouTube-Player
- Plex und Jellyfin
- Spiele vom eigenen PC über Moonlight/Sunshine

## Entwicklung

```bash
npm install
npm run dev      # Entwicklungsserver
npm run build    # Typprüfung + Produktions-Build nach dist/
```

Jeder Push auf `main` veröffentlicht die App über GitHub Pages (`.github/workflows/deploy.yml`) unter https://jorgepnt-design.github.io/Tesla/ (Pages muss im Repo auf „GitHub Actions“ stehen).
