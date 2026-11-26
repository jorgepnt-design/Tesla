# CarTV-Weiterleitung (Vercel)

Kleine Vercel-Funktion, die IPTV-Anbieter, die nur per `http://` erreichbar sind, per `https://` an CarTV weiterreicht.

Umgebungsvariablen im Vercel-Projekt:

| Variable | Bedeutung |
|---|---|
| `ALLOWED_ORIGINS` | Adressen der App, z. B. `https://jorgepnt-design.github.io` |
| `ALLOWED_HOSTS` | Hostnamen der IPTV-Anbieter, kommagetrennt, z. B. `tv.anbieter.example` |
| `PROXY_SECRET` | Zufälliger geheimer Wert zum Signieren der Segment-Adressen |

Nach Änderungen an den Variablen neu veröffentlichen.
