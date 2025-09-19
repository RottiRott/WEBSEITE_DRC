# Projektnotizen

## Medienquellen
- Hero- und Referenzbilder werden über https://static.wixstatic.com/ eingebunden und sind für Hotlinking freigegeben.
- Logo liegt als SVG im Ordner `docs/assets/img/` und wird auf allen Seiten proportional skaliert.

## Link-Strategie
- Interne Navigationsziele nutzen relative Pfade innerhalb des `docs/`-Verzeichnisses, damit die Seiten sowohl auf GitHub Pages als auch innerhalb des Wix-Embeds funktionieren.
- Externe Quellen (z. B. MyHammer-Bewertungen, Datenschutzinformationen) sind mit `rel="noopener"` versehen und öffnen bei Bedarf in neuen Tabs.
- Die neue Scroll-Navigation setzt auf einen `back-to-top`-Button und eine Fortschrittsanzeige, beide funktionieren auch eingebettet per `postMessage`-Bridge.
