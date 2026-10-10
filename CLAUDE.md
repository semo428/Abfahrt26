# Projekt „Abfahrt“ · alfons x · 24.10.2026

Webapp + Gewinnspiel für die Party „Abfahrt“ im Club/Bar **alfons x** (Bahnhofstraße 7, Bahnhofsgebäude Sigmaringen).
Auftraggeber: Inhaber alfons x. Umsetzung: ASK Connect (Projektleitung + Kollege fürs Backend – beide sollen auf **demselben Stand** sein).

## Zuletzt geändert (10.10.2026) – bitte zuerst lesen
**Neue Auslosung als Live-Show auf allen Handys** (DJ lost nicht mehr aus): 03:30 Team lost im Admin aus + prüft Storys, 04:00 startet die Show synchron auf allen Handys, Gewinner holen an der Bar ab. Frontend ist fertig (Demo-Modus, Test mit `?probe=30`). **Fürs Backend neu:** `reveal()`, `adminDrawAll()`, Spalte `prize`, `settings.reveal_at`, Maskierung von Status/Gewinn vor 04:00 – Details in `docs/projekt-kontext.md` (API-Vertrag, Datenmodell) und `app/supabase/schema.sql` (Referenz-Umsetzung). Verlauf: `docs/chronik-und-erkenntnisse.md` → „10.10.“.

## Wissensquellen (in dieser Reihenfolge lesen)
1. **`docs/projekt-kontext.md`** – aktueller Stand: Ziel, Entscheidungen, Funktionsumfang, Datenmodell, **API-Vertrag**, Architektur, Sicherheit, Datenschutz, offene To-dos
2. **`docs/chronik-und-erkenntnisse.md`** – wie es dazu kam: Chronik aller Diskussionen, verworfene Ideen mit Gründen, technische Erkenntnisse
3. Nur im separat geschickten Übergabe-Paket (nicht im Repo): `docs/intern/angebot-und-kosten.md` (Angebot/Preise – **INTERN, nie ins öffentliche Repo committen**), `konzept/` (alte Konzeptseiten, teilweise veraltet), `video/` (Erklärvideos – **veraltet**, zeigen noch 3 Challenges und den DJ)
6. Der Code in `app/` ist die Wahrheit für das Frontend. Root-`index.html` im Repo = älteres Kundenkonzept, nicht maßgeblich.

## Ziel
Mehr Sichtbarkeit/Reichweite für den Instagram-Account **@alfonsx_sigmaringen**: Gäste machen am Abend **2 Challenges** in der Webapp (Abfahrt-Foto als Story mit Markierung + Vibe-Check) und landen im Lostopf (13 Gewinne, Team lost um 03:30 aus, **Live-Auslosung um 04:00 auf allen Handys**).

## Repo-Struktur
- `app/` – die Webapp (reines HTML/CSS/JS, kein Build). Einstieg `app/index.html`, Team-Ansicht `app/admin.html`.
  - `app/config.js` – alle Inhalte/Platzhalter (Gewinne, Ablauf, Lageplan, Datum, Instagram-Handle)
  - `app/store.js` – **Datenschicht**: Demo-Modus (localStorage) auf `*.github.io`/localhost, sonst die eigene API unter `/api`
  - `app/app.js` – Spieler-App (Mission, Challenges, Ablauf, Lageplan, Regeln) · `app/frame.js` – Story-Rahmen im Browser · `app/admin.js` – Ziehung + Story-Prüfung
  - `app/supabase/schema.sql` – alte Supabase-Referenz (wird nicht ausgeliefert; maßgeblich ist `server/sql/`)
- `server/` – Backend (Weg C): Fastify-API (`src/`), Schema (`sql/`), Docker/Compose (`Dockerfile`, `deploy/`), Tests (`test/`), Lasttest (`loadtest/`), Skripte (`scripts/`: sync, gen-env, backup, purge). Betrieb siehe `docs/projekt-kontext.md` §6
- `index.html` (Root) – Kurzfassung des Konzepts für den Inhaber (nicht die App)
- `CLAUDE.md` (diese Datei) + `docs/projekt-kontext.md` + `docs/chronik-und-erkenntnisse.md` – gemeinsamer Projektstand (bei Änderungen mitpflegen und mitcommitten, damit beide auf demselben Stand sind)

## Verbindliche Entscheidungen (nicht ohne Rücksprache ändern)
1. **Backend = Weg C (freigegeben, umgesetzt in `server/`):** eigener **Node-API-Container** + **eigener Postgres-Container** (`abfahrt-db`, nur internes Netz) im eigenen Compose-Projekt `/root/abfahrt` auf dem VPS, hinter **Traefik** (`https://abfahrt.askconnect.de`). Der Container liefert **auch die statische Webapp** aus. Die vorhandene `postgres_prod` (n8n, Cal.com), Traefik und bestehende Compose-Dateien werden **nicht** angefasst. **n8n wird nicht genutzt**; Löschen nach dem Event per `server/scripts/purge.sh`.
2. **Hosting nicht auf GitHub Pages** für den Live-Betrieb (kommerziell, kein Monitoring). Pages nur zum Testen: `https://semo428.github.io/Abfahrt26/app/`.
3. **Datenschutz minimal:** gespeichert nur Spaßname, Instagram-Handle, erledigte Challenges (Zeitstempel), Vibe (Sterne + Satz), Status/Gewinncode. **Keine Fotos hochladen** (Rahmen entsteht im Browser, Gast teilt selbst). **Keine Bilder an KI.** Kein KI-Charakter (Anthropic wird nicht genutzt). Löschen nach der Verlosung.
4. **Keine Anmeldung mit Passwort für Gäste:** Gerät wird über zufällige Kennung wiedererkannt. „Daten löschen & neu anmelden“ löscht alles; pro Gerät max. ein aktiver Eintrag; ab der Live-Auslosung für `drawn`/`won`/`rejected` gesperrt (vorher für alle erlaubt, damit nichts verraten wird).
5. **Zugang für Gäste: QR-Codes vor Ort** zur Webapp. Vorregistrierung per Reel/ManyChat („Kommentiere Abfahrt“ → DM) ist **voraussichtlich gestrichen**.
6. **Kein NFC**, **keine Leinwand/kein Beamer**. Story-Reposts macht das Team manuell; Best-Pose-Voting via Umfrage-Sticker in der Bar-Story.
7. **2 Challenges** (seit 07.10., Wunsch Inhaber): **Abfahrt-Foto** (Key `photo`, „Bild von dir während der Abfahrt, gerne mit deiner Crew“) + **Vibe-Check** (Key `vibe`). Best Pose ist gestrichen. Challenge zählt als erledigt, sobald „In Story teilen“ getippt bzw. der Vibe abgeschickt wurde. Ob wirklich gepostet + markiert wurde, prüft **ein Mensch** bei der Ziehung im DM-Postfach der Bar (Story-Erwähnungen).
8. **Live-Vibes-Fenster:** zeigt zufällig max. 7 Vibes anderer Gäste (Spaßname + Sterne + Satz), neue Auswahl höchstens 1×/Minute; Spaßname/Vibe sind damit öffentlich sichtbar (steht in Teilnahmebedingungen + Datenschutz).
9. **Auslosung (seit 10.10., Wunsch Inhaber – kein DJ mehr):** Um **03:30** „Jetzt auslosen“ im Admin → alle 13 Gewinner werden mit Gewinn (`prize`: meet/shirt/drink) + Gewinncode gezogen (status `drawn`). Team prüft bis 04:00 jede Story → „Story da“ (`won`) oder „Neu ziehen“ (`rejected`, für denselben Gewinn wird sofort nachgezogen). Um **04:00** (`REVEAL_AT` in der `.env`) startet auf allen Handys gleichzeitig die **Live-Show** (Namen würfeln, Countdown, Runden T-Shirt → Getränk → Finale Meet & Greet). **Der Server darf Gewinner/Status/Gewinn vor reveal_at nicht herausgeben** (weder in `me` noch in `reveal`). Gewinner holen den Gewinn **an der Bar** ab. Achtung: In dieser Nacht endet die Sommerzeit – 04:00 = MEZ (+01).
10. Inhalt: **kein Alkohol-Bezug** in Texten/Beispielen; UI **„idiotensicher, so viel wie nötig, so wenig wie möglich“** (Wunsch des Inhabers).

## Backend-Vertrag (das Frontend erwartet genau diese Funktionen in `store.js`)
Siehe `docs/projekt-kontext.md` → „API-Vertrag“. Kurz: `init, me, register, complete, submitVibe, stats, deleteMe, adminLogin, adminIsLoggedIn, reveal, adminOverview, adminDrawAll, adminConfirm, adminReject, adminLogout`. Fehlermeldungen als Codes (`fun_name_unique`, `ig_handle_unique`, `blocked_text`, `not_admin`, `empty_pot`, `locked_after_draw`, `not_drawn`, `already_registered`, `not_registered`, `rate_limited`, `invalid_input`) → `friendly()` übersetzt sie. Vertragsänderungen immer in `store.js`, `server/src/routes/` und `server/test/` zusammen.

## Arbeitsregeln
- Nach jeder Änderung an `app/*.js|css` die **Asset-Version `?v=…` in `app/index.html` und `app/admin.html` hochzählen** (Handys cachen sonst bis 10 Min).
- Design-Tokens/Komponenten aus `app/app.css` wiederverwenden (dunkel, Rot `#E5402A`, Schriften Poppins/Figtree/IBM Plex Mono).
- Commit-Messages auf Englisch, kurz; Texte in der App auf Deutsch, Du-Form.
- Sicherheitsanforderungen für das Backend: `docs/projekt-kontext.md` → „Sicherheits-Checkliste“.
- Auf dem VPS nur in `/root/abfahrt` arbeiten; Änderungen am Server vorher ankündigen. Secrets nie ins Repo (öffentlich!) – nur in `/root/abfahrt/.env`.
