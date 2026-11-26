# CarTV-Weiterleitung für zu Hause (Windows)

Für IPTV-Anbieter, die nur per `http://` erreichbar sind **und** Rechenzentren (wie Vercel) sperren. Die Weiterleitung läuft auf deinem PC über deinen Internetanschluss; Tailscale Funnel macht sie unter einer festen `https://…ts.net`-Adresse erreichbar.

## Einmalig einrichten

1. **Node.js** installieren: https://nodejs.org → Version „LTS“ → Installer mit den Standardeinstellungen durchklicken.
2. **Tailscale** installieren: https://tailscale.com/download/windows → mit Google-Konto anmelden.
3. **Funnel erlauben:** Im Browser https://login.tailscale.com/admin/settings/features öffnen → „HTTPS Certificates“ aktivieren. Beim ersten Start fragt Tailscale außerdem nach, ob Funnel für diesen PC erlaubt werden soll – bestätigen.
4. Dieses Repo herunterladen (GitHub → „Code“ → „Download ZIP“) und entpacken.

## Starten

Im entpackten Ordner `relay` doppelt auf **`start-weiterleitung.bat`** klicken. Das Fenster zeigt die https-Adresse (z. B. `https://mein-pc.tail1234.ts.net`) und muss offen bleiben, solange im Auto geschaut wird.

Die Adresse in CarTV unter **Optionen → Weiterleitung** eintragen – oder einmalig als Repository-Variable `PROXY_URL` hinterlegen, dann ist sie in der App eingebaut.

Freigegebene Anbieter stehen in `proxy/api/p.js` (`ALLOWED_HOSTS`); weitere lassen sich per Umgebungsvariable `ALLOWED_HOSTS` ergänzen.

## Automatisch mit Windows starten (optional)

`Win + R` → `shell:startup` → eine Verknüpfung zu `start-weiterleitung.bat` hineinlegen.
