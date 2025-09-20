# Migration nach Wix Studio

Dieses Paket enthält die extrahierten Ressourcen, um die bestehende DachrinneCheck-Webseite in Wix Studio (mit Velo) funktionsgleich nachzubilden. Die Schritte orientieren sich an der Legacy-Seite und den neuen Velo-Modulen.

## Einbau-Schritte

1. **Dev Mode aktivieren** und das Code-Panel in Wix Studio öffnen.
2. Im Reiter **CSS** eine Datei `global.css` anlegen und den Inhalt aus `wix-studio/css/global.css` einfügen.
3. Unter **Public & Static** die Datei `public/responsive-nav.js` erzeugen und mit dem Inhalt aus `wix-studio/public/responsive-nav.js` befüllen.
4. Im Backend zwei Web-Module anlegen:
   - `backend/calc.jsw` → Inhalt aus `wix-studio/backend/calc.jsw`
   - `backend/resend.jsw` → Inhalt aus `wix-studio/backend/resend.jsw`
5. Die Seiten **Start**, **Kostenrechner**, **Impressum** und **Datenschutz** erstellen. Übertragen Sie die HTML-Inhalte aus `docs/index.html`, `docs/kostenrechner.html`, `docs/impressum.html` und `docs/datenschutz.html` als Sections/Container.
6. IDs setzen (Buttons, Container, Inputs): `#burger`, `#menu`, `#leistung`, `#umfang`, `#optionExpress`, `#summe`, `#calcSubmit`, `#contactForm`, `#name`, `#email`, `#nachricht`, optional `#telefon`, `#datenschutz`. Für das Formular des Kostenrechners können die Original-IDs (`#lfm`, `#hoehe`, `#km`, `#schutzReinigung`, `#schutzMontage`, `#schutzDemontage`, `#schutzVorhanden`, `#inFirst`, `#inLast`, `#inEmail`, `#inPhone`, `#inMsg`, `#dpWish`, `#cbConsent`) wiederverwendet werden.
7. Die Page-Code-Dateien einfügen:
   - `index.page.js` → Inhalt aus `wix-studio/pages/index.page.js`
   - `kostenrechner.page.js` → Inhalt aus `wix-studio/pages/kostenrechner.page.js`
   - `impressum.page.js` → Inhalt aus `wix-studio/pages/impressum.page.js`
   - `datenschutz.page.js` → Inhalt aus `wix-studio/pages/datenschutz.page.js`
8. Secrets im Wix Secrets Manager hinterlegen:
   - Pflicht: `RESEND_API_KEY`
   - Optional: `RESEND_FROM`, `RESEND_TO` (oder Legacy `ADMIN_EMAIL`), `RESEND_SUBJECT_CONTACT`, `RESEND_SUBJECT_SUMMARY`, `RESEND_DRY_RUN`
9. Seiten-URLs festlegen: `/`, `/kostenrechner`, `/impressum`, `/datenschutz`.
10. **Preview starten**, das Paritätsskript `node wix-studio/tests/run-calc-parity.js` ausführen und anschließend veröffentlichen.

## Hinweise

- Das Modul `calc.jsw` bildet die Kostenrechner-Formel 1:1 aus `docs/kostenrechner.html` nach. Identische Eingaben liefern identische Ergebnisse.
- `backend/resend.jsw` portiert den Resend-Mail-Flow. Der Kontakt-Submit auf der Startseite verwendet jetzt denselben HTML-/Text-Aufbau wie der Kostenrechner.
- Für DRY-Runs kann das Secret `RESEND_DRY_RUN = "1"` gesetzt werden. In diesem Fall werden keine E-Mails versendet; die erzeugte Payload wird zurückgegeben.
- Die Navigation nutzt ausschließlich `$w`-APIs (`#burger`, `#menu`). Fokus-Handling und Aria-Attribute entsprechen der Legacy-Implementierung.
