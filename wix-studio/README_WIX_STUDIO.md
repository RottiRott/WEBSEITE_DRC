# DachrinneCheck – Wix Studio Paket

Dieses Verzeichnis enthält alle Dateien, die benötigt werden, um die bestehende HTML-/JS-Navigation, den Kostenrechner und den Kontakt-Workflow in Wix Studio (mit Velo) nachzubauen.

## Einbau-Schritte
1. **Dev Mode aktivieren** – Öffne deine Wix-Studio-Seite, aktiviere den Dev Mode und öffne das Code Panel.
2. **Globales Stylesheet anlegen** – Erstelle im Bereich „Public & Globals“ die Datei `global.css` und füge den Inhalt aus [`css/global.css`](css/global.css) ein.
3. **Client-Skript hinzufügen** – Lege unter „Public“ die Datei `responsive-nav.js` an und kopiere den Inhalt aus [`public/responsive-nav.js`](public/responsive-nav.js).
4. **Backend-Module erstellen** – Erzeuge im Bereich „Backend“ zwei Web Modules:
   - `resend.jsw` mit dem Inhalt aus [`backend/resend.jsw`](backend/resend.jsw)
   - `calc.jsw` mit dem Inhalt aus [`backend/calc.jsw`](backend/calc.jsw)
5. **Site Code setzen** – Öffne den Site Code und ersetze bzw. ergänze den Inhalt durch [`site/site-code.js`](site/site-code.js).
6. **Kostenrechner-Seite einrichten** – Lege eine neue Seite an, platziere Dropdown (`#leistung`), Zahleneingabe (`#umfang`), Checkbox (`#optionExpress`), Textfeld (`#summe`) und Button (`#calcSubmit`). Hinterlege den Code aus [`pages/kostenrechner-page-code.js`](pages/kostenrechner-page-code.js).
7. **Kontaktformular anbinden** – Nutze ein Wix-Formular mit der ID `#contactForm` und ergänze den Seiten-Code aus [`pages/kontakt-page-code.js`](pages/kontakt-page-code.js).
8. **Resend-Secret setzen** – Öffne den Secrets Manager und hinterlege deinen API-Key als Secret `RESEND_API_KEY`.
9. **Seiten-URLs vergeben** – Weisen den Seiten die URLs `/`, `/kostenrechner`, `/impressum`, `/datenschutz` zu.
10. **Publish & Test** – Speichere, veröffentliche und teste Navigation, Kostenrechner sowie Formularversand.

## Komponenten- & Klassen-Mapping
| Element | Wix-ID / Klasse | Hinweise |
| --- | --- | --- |
| Header-Container | Klasse `responsive-header` | Enthält Logo, Inline-Navigation, Toggle. |
| Inline-Menü | Klasse `nav-inline` | Zeigt Desktop-Links und Aktionen. |
| Burger-Button | ID `#burger` | Steuert das mobile Menü. |
| Mobiles Menü | ID `#menu` | Collapsible Box, Inhalt frei gestaltbar. |

### Mobile Menüstruktur (Empfehlung)
- Innerhalb von `#menu` einen Container mit Klasse `nav-dialog` platzieren.
- Optional: Buttons/Links mit eigenen Klassen (`nav-dialog-links`, `nav-dialog-actions`) versehen, um die Styles aus `global.css` zu nutzen.

## Backend-Konfiguration
- **Resend**: Passe bei Bedarf `DEFAULT_FROM` und `DEFAULT_TO` in [`backend/resend.jsw`](backend/resend.jsw) an deine Domain an. Die Funktionen geben ein einfaches `{ ok, error? }`-Objekt zurück.
- **Kalkulation**: Die Preislogik in [`backend/calc.jsw`](backend/calc.jsw) nutzt Basistarife, Umfang als Multiplikator, optionale Aufpreise und einen Express-Faktor. Passe Konstanten (`BASE_PRICES`, `ADDON_PRICES`, `EXPRESS_FACTOR`) an dein Angebot an.

## Verhalten im Frontend
- `initNav()` (Site Code) koppelt den Burger-Button mit dem mobilen Menü. Alle klickbaren Elemente im Menü schließen es automatisch.
- Die Kostenrechner-Seite berechnet bei jeder Eingabe das Ergebnis per Backend-Funktion `calculateQuote()` und sendet bei Bedarf eine Zusammenfassung via `sendCalcSummary()`.
- Die Kontaktseite nutzt `sendContactEmail()` beim Formular-Submit.

Viel Erfolg beim Übertrag nach Wix Studio! 🎉
