# Renegade · Schwerpunkt & Beladung (PWA)

Offline-fähige, installierbare Web-App zur Schwerpunkt- und Beladeberechnung der
UL **Renegade**. Datengrundlage: *Flug- und Betriebshandbuch RENEGADE, Rev. 2-07,
Kap. 3*.

> ⚠️ **Ohne Gewähr.** Verbindlich ist allein das Flug- und Betriebshandbuch des
> jeweiligen Luftfahrzeugs. Werte vor jedem Flug prüfen.

## Funktionen
- **Beladung** – Abflugmasse & Schwerpunkt für den Flug aus Leerwerten + Zuladung
  (Pilot/hinten, Passagier/vorne, Kraftstoff, Sammeltank, Gepäck). Ampel + Hüllen­diagramm
  prüfen MTOW (472,5 kg) und Schwerpunktgrenzen (0,340–0,440 m). Kraftstoff in Liter
  oder kg.
- **Wägung** – Leermasse und Leerschwerpunkt aus Radlasten (links/rechts/Sporn) und
  Abstand Hauptfahrwerk→Spornnabe; Prüfung gegen Soll 0,215 ± 0,040 m; direkt als
  Leerwerte übernehmbar.
- **Einstellungen** (⚙) – Kennzeichen, Grenzwerte, alle Hebelarme und Kraftstoff­dichte
  editierbar; lokal gespeichert (localStorage).

### Bezugslinie & Hebelarme (Werkseinstellung)
Bezugslinie = Mitte der vorderen Hauptfahrwerksstrebe. Massen davor = negativer Arm.

| Position | Hebelarm |
|---|---|
| Kraftstoff (Hauptank) | +0,250 m |
| Kraftstoff-Sammeltank | −0,600 m |
| Gepäck | +1,450 m |
| Passagier (Sitz vorne) | +0,300 m |
| Pilot (Sitz hinten, PIC bei Einsitzig) | +1,000 m |

## Lokal starten / testen
Service Worker erfordert HTTP(S) (nicht `file://`):

```bash
cd renegade-cg
python3 -m http.server 8765
# Browser: http://localhost:8765
```

## Aufs Handy bringen
1. Dateien auf einen beliebigen Webhost legen (HTTPS), z. B. GitHub Pages,
   Netlify, eigener Server.
2. URL am Handy im Browser öffnen → Menü → **„Zum Startbildschirm hinzufügen“**.
3. Läuft danach offline wie eine native App.

## Aufbau
```
index.html  · UI            sw.js       · Offline-Cache
styles.css  · Styling       manifest.webmanifest · PWA-Manifest
app.js      · Logik         icons/      · App-Icons
```
