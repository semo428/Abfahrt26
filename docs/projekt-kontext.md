# Projekt „Abfahrt“ · Übergabe-Dokument

Stand: 10.10.2026 · Event: **Samstag, 24.10.2026** · Kunde: **alfons x** (Club/Bar/Restaurant, Bahnhofstraße 7, 72488 Sigmaringen – im Bahnhofsgebäude) · Instagram: **@alfonsx_sigmaringen**

Dieses Dokument fasst Ziel, Verlauf, Entscheidungen (mit Begründung), den aktuellen Stand der Webapp und alles Nötige für das **Backend** zusammen.

---

## 1. Ziel und Grundidee

- Die jährlich größte Party des Clubs heißt **„Abfahrt“**. Der Inhaber will an dem Abend **deutlich mehr Instagram-Reichweite** (Views, Story-Views, Erwähnungen, Profilaufrufe).
- Mechanik: Gäste öffnen eine **Webapp** (per QR-Code vor Ort), melden sich mit **Spaßname + Instagram-Handle** an und erledigen **2 Challenges** (seit 07.10.; vorher 3). Die Foto-Challenge erzeugt eine **Instagram-Story mit Markierung @alfonsx_sigmaringen** – jede Story bringt die Bar in die Feeds der Freunde, das Team repostet die besten in die Bar-Story.
- Wer **2/2** schafft, kommt in den **Lostopf**. Das Team lost **um 03:30** im Hintergrund aus, **um 04:00** läuft die **Live-Auslosung auf allen Handys** (Änderung 10.10.) (**13 Gewinne**: 5× Meet & Greet mit den Stars, 3× Special-Edition alfons-x-T-Shirt, 5× Getränk deiner Wahl).
- Wunsch des Inhabers: **„Idiotensicher und einfach – so viel wie nötig, so wenig wie möglich, wir müssen an den letzten Deppen denken.“**

---

## 2. Verlauf & Entscheidungen (mit Begründung)

| Thema | Entscheidung | Warum |
|---|---|---|
| Grundkonzept | 3 „Wellen“: vorher (Reels), Nacht (Challenges), danach („Kommentiere FOTOS“ → Fotos per DM) | Reichweite entsteht vor allem durch Interaktion **auf dem Bar-Account** (Kommentare, Reposts), nicht nur durch Gäste-Storys |
| Vorregistrierung | ursprünglich: Reels „Kommentiere Abfahrt“ → automatische DM mit Link (ManyChat). **Stand jetzt: voraussichtlich gestrichen**, stattdessen **QR-Codes vor Ort** | Einfacher; keine Abhängigkeit von Instagram-Automation |
| Instagram-Automation | Falls doch: **ManyChat Pro** (~39 $/Monat). Eigene Meta-App/n8n bräuchte **App Review + Business-Verifizierung** (Tage–Wochen). Inoffizielle APIs/Apify-DM-Actors **abgelehnt** (Sperr-Risiko für Bar-Account, ToS) | |
| NFC-Tags/Stationen | **gestrichen** – Challenges direkt in der App antippbar | einfacher, keine Hardware |
| Leinwand/Beamer im Club | **gestrichen** – „unsere Story ist die Leinwand“ | Aufwand, Datenschutz (Foto-Uploads) |
| Fotos | werden **nie hochgeladen**. Story-Rahmen wird **im Browser (Canvas)** erzeugt, Gast teilt per Web Share API selbst zu Instagram | Datenschutz, kein Speicher, keine Moderation nötig |
| KI | **keine Bilder an KI**. KI-Party-Charakter (Claude) war gebaut, wird **nicht genutzt** (kein Anthropic) | DSGVO so einfach wie möglich |
| Markierung | Im Rahmen steht **kein gedruckter Handle**, sondern ein gestricheltes Feld **„hier alfons x markieren“** (oben unter dem Challenge-Badge). Gast setzt dort den **@-Erwähnungs-Sticker** | Ein gedruckter Handle ist keine echte Erwähnung; per Web lässt sich keine Erwähnung vorbefüllen. Handle in Zwischenablage kopieren wurde entfernt (Einfügen erzeugt keine echte Markierung) |
| Challenge „erledigt“ | sobald **„In Story teilen“** getippt (Foto-Challenges) bzw. Vibe abgeschickt | App kann Posten nicht prüfen; Mensch prüft bei Ziehung |
| Prüfung Gewinner | Team sucht im **DM-Postfach der Bar** nach der Story-Erwähnung des gezogenen Handles; keine Story oder nicht anwesend → neu ziehen | einfach, kein Instagram-API-Zugriff nötig |
| Ziehung | 03:30 im Admin „Jetzt auslosen“ (alle 13 auf einmal, mit Gewinn), Story-Prüfung bis 04:00; **04:00 Live-Show auf allen Handys** (Countdown-Karte vorher, Namen würfeln, 3 Runden: T-Shirt → Getränk → Finale Meet & Greet); Gewinner sieht „gewonnen.“ + Gewinn + Live-Code, Abholung **an der Bar** | Wunsch Inhaber 10.10.: kein DJ mehr; Server gibt Gewinner erst ab `reveal_at` heraus |
| Gäste-Login | **ohne Passwort**, Gerät per zufälliger Kennung wiedererkannt; „Daten löschen & neu anmelden“ möglich | einfach + datensparsam |
| Lageplan | gezeichneter **Beispiel-Innenplan** mit gelben Security-Strichmännchen am Eingang. Ein OSM-Umgebungsplan wurde gebaut und **auf Wunsch wieder entfernt** | User bevorzugt schlichten Plan; echter Plan kommt vom Inhaber |
| Hosting | **nicht GitHub Pages** für den Live-Betrieb (kommerziell, kein Monitoring) → **eigener VPS** | |
| Backend | **Weg C umgesetzt** (freigegeben 07.10.): eigener Node-API-Container + **eigener Postgres-Container** `abfahrt-db` (nicht die vorhandene `postgres_prod` mit n8n/Cal.com), eigenes Compose-Projekt in `/root/abfahrt`; n8n wird nicht genutzt | Stack vorhanden (Traefik, Docker Compose); Event-Daten komplett getrennt und nach dem Event rückstandslos löschbar (`down -v`); kein US-Dienstleister |
| Inhalte | **kein Alkohol-Bezug** in Texten/Beispielen | Kundenwunsch |

---

## 3. Funktionsumfang der Webapp (Stand jetzt, Demo-Modus)

Live zum Testen (Demo, Daten nur im Browser): `https://semo428.github.io/Abfahrt26/app/` · Team: `…/app/admin.html`

**Navigation:** Tab-Leiste unten: **Mission · Ablauf · Lageplan · Regeln** (Ablauf/Lageplan/Regeln ohne Anmeldung nutzbar).

**Mission (vor Anmeldung):** Gewinne-Laufband · Hero „abfahrt.“ · Hinweis-Karte „Zuallererst: Schau dir unsere Rules an“ (→ Regeln) · **Anmeldekarte** (Spaßname, Instagram, Häkchen Teilnahmebedingungen, „Los geht's“) · Gewinne-Kacheln · „So läuft's“ (3 Schritte) · Kleingedrucktes.

**Nach Anmeldung (Dashboard):** Charakter-Karte (lokal generierter Text – **offen, ob raus**) · Fortschritt x/2 · 2 antippbare Challenges · Lostopf-Status · **Live-Vibes-Fenster** · Zähler „sind heute dabei“ · „Daten löschen & neu anmelden“.

**Live-Vibes-Fenster** (Anmeldeseite + Dashboard, seit 07.10.): kleine Karte „Live-Vibes Ø★ · Anzahl“ mit wischbarer Leiste von **max. 7 zufälligen Vibes** anderer Gäste (★, Satz, — Spaßname); bei <7 Vibes entsprechend weniger, bei 0 ausgeblendet; neue Zufallsauswahl **höchstens 1× pro Minute**; läuft automatisch alle 4 s weiter (pausiert bei Berührung).

**Challenges:**
1. **Abfahrt-Foto** (Key `photo`) – „Poste ein Bild von dir während der Abfahrt – gerne auch mit deiner Crew“ (Frontkamera) → Rahmen „CHALLENGE 1 · ABFAHRT-FOTO“ → „In Story teilen“ (= erledigt) → in Instagram @-Sticker aufs Feld.
2. **Vibe-Check** – 1–5 Sterne + Satz (max. 80 Zeichen, Wortfilter) → zählt zur Live-Stimmung; optional Vibe-Karte als Story.
~~3. Best Pose~~ – **gestrichen** (07.10., Wunsch Inhaber).

**Gewonnen-Screen:** „gewonnen.“, Gewinn (Icon + Titel), „Komm jetzt zur Bar und hol deinen Gewinn ab“, Gewinncode + laufende Uhrzeit, „Auslosung nochmal ansehen“.

**Admin (`admin.html`):** Login · Kacheln (Im Lostopf 2/2, Angemeldet, Abfahrt-Foto, Vibe-Check, Gewinner x/13) · „Auslosen“ → Spaßname + @handle (Link zu Instagram) → „✓ Story gefunden“ (zeigt Gewinncode) oder „↻ Keine Story – neu ziehen“ · Liste bestätigter Gewinner.

**Ablauf/Lageplan/Regeln:** Inhalte in `app/config.js` (Ablauf + Lageplan sind **BEISPIEL**-Daten). Regeln basieren auf den Postern des Inhabers („X rules“ + „Zero Tolerance“), inkl. Hilfe-Box „sag sofort bescheid“.

**Story-Rahmen (frame.js):** 1080×1920, Logo + „alfons x“, rotes Challenge-Badge, darunter Feld „@ hier alfons x markieren“, unten „abfahrt.“ + 24/10/2026, roter Rand. Geteilt via `navigator.share({files})`.

---

## 4. Datenmodell (Referenz: `app/supabase/schema.sql`)

```
players
  id            uuid  PK            (bei Supabase = auth.users.id; bei Weg C: eigene UUID)
  fun_name      text  2–24 Zeichen, eindeutig (case-insensitive)
  ig_handle     text  ^[a-z0-9._]{1,30}$, ohne @, lowercase, eindeutig
  character     jsonb {title, superpower, weakness}   (optional – offen, ob entfällt)
  photo_at      timestamptz null   (Challenge 1 „Abfahrt-Foto“)
  vibe_at       timestamptz null   (Challenge 2 „Vibe-Check“)
  status        text  'active' | 'drawn' | 'won' | 'rejected'   (default active)
  win_code      text  null   (z. B. 'AB-7F3K2Q')
  created_at    timestamptz default now()

vibes
  id bigint PK · player_id → players (on delete cascade) · stars 1–5 · text 2–80 · created_at

admins  (bei Weg C: eigener Admin-Login, z. B. 1–3 Team-Accounts mit Passwort-Hash)
```

**Regeln (müssen im Backend durchgesetzt werden):**
- Gast sieht/ändert **nur den eigenen** Datensatz.
- Challenges nur über eigene Endpunkte abhakbar (`photo`; `vibe` über Vibe-Endpunkt); Zeitstempel wird nur gesetzt, wenn noch leer.
- Wortfilter für Vibe-Texte (Liste in `schema.sql` → `submit_vibe` und `app.js` → `BLOCK`).
- Löschen des eigenen Eintrags: **vor reveal_at für alle erlaubt** (eine Sperre würde verraten, dass man gezogen wurde); **ab reveal_at gesperrt** für `drawn`, `won` und `rejected` (`locked_after_draw`) – abgelehnte Handles bleiben so belegt.
- **Automatische Auslosung** um `DRAW_AT` (`.env`, Standard 2026-10-25 03:30+01): einmalig, nur wenn noch nie gelost wurde (kein Spieler `drawn`/`won`/`rejected`); versucht es weiter, falls der Lostopf leer ist. Knopf und Automatik teilen sich Code + DB-Sperre (`server/src/draw.js`). Teilnahmeschluss ist damit faktisch 03:30 (Spätere nur noch bei Ersatzziehungen).
- **Wer bekommt was:** reiner Zufall (`order by random()`), gleiche Chance für alle mit 2/2; Gewinne werden in der Reihenfolge von `PRIZES` gefüllt, jede Person max. 1×. Die Show-Reihenfolge (`revealOrder`) ist nur Darstellung.
- Ziehung: zufällig aus `status='active'` **und** `photo_at` + `vibe_at` gesetzt; gezogener → `drawn` + `prize` + `win_code`; Story bestätigt → `won`; abgelehnt → `rejected` (prize/win_code leeren, für denselben Gewinn nachziehen). `drawn` und `won` zählen beide als Gewinner in der Show.
- `reveal_at` (Weg C: `.env` → `REVEAL_AT=2026-10-25T04:00:00+01:00`; Supabase-Referenz: Tabelle `settings`): davor liefern `me`/`reveal` **keinen** Status/Gewinn/Code (Status immer `active`). Gewinn-Anzahlen ebenfalls per `.env` (`PRIZES=meet:5,shirt:3,drink:5`).
- Öffentliche Statistik ohne Instagram-Handles: Anzahl Spieler, Ø Sterne, Anzahl Vibes, letzte 3 Vibes, **Zufallsauswahl von max. 7 Vibes** (fun_name, stars, text).

---

## 5. API-Vertrag (was das Frontend erwartet)

Das Frontend greift **nur** über `app/store.js` auf Daten zu. Der Live-Teil dort ruft per `fetch` die eigene API (`server/`) auf – **umgesetzt**. Demo-Modus nur noch auf `*.github.io` und localhost. **Signaturen/Rückgaben müssen gleich bleiben** – Änderungen am Vertrag immer in Frontend (`store.js`), API (`server/src/routes/`) und Tests (`server/test/`) gemeinsam.

| store.js | REST (Weg C, umgesetzt) | Rückgabe |
|---|---|---|
| `init()` | – (Token aus localStorage lesen) | – |
| `me()` | `GET /api/me` (Bearer-Token) | Player-Objekt oder `null` |
| `register({fun_name, ig_handle})` | `POST /api/register` | `{ token, player }` → Token im localStorage speichern, `player` zurückgeben |
| `complete(key)` key = `photo` | `POST /api/challenge {key}` | aktualisiertes Player-Objekt |
| `submitVibe(stars, text)` | `POST /api/vibe {stars, text}` | aktualisiertes Player-Objekt |
| `stats()` | `GET /api/stats` (öffentlich) | `{ players, vibe_avg, vibe_count, recent:[{fun_name,stars,text}], sample:[{fun_name,stars,text}] }` – `sample` = **zufällig max. 7** Vibes; darf für ~60 s gecacht werden |
| `deleteMe()` | `DELETE /api/me` | – (danach Token lokal löschen) |
| `adminLogin(user, pw)` | `POST /api/admin/login` | – (Session-Cookie httpOnly/Secure/SameSite=Strict) |
| `adminIsLoggedIn()` | `GET /api/admin/session` | `true/false` |
| `reveal()` | `GET /api/reveal` (öffentlich) | `{ reveal_at, now, names:[fun_name…], winners: null \| [{fun_name, prize}] }` – `now` = Serverzeit (Handys gleichen ihre Uhr ab), `names` = bis 80 zufällige Spaßnamen aus dem Lostopf zum Durchwürfeln, `winners` **erst ab reveal_at**, vorher `null` |
| `adminOverview()` | `GET /api/admin/overview` | `{ total, eligible, photo, vibe, winners:[{id,fun_name,ig_handle,prize,win_code,checked}] }` |
| `adminDrawAll()` | `POST /api/admin/draw-all` | füllt alle freien Gewinnplätze (5 meet, 3 shirt, 5 drink); Antwort wie overview |
| `adminConfirm(id)` | `POST /api/admin/confirm {id}` | – (drawn → won; sonst `not_drawn`) |
| `adminReject(id)` | `POST /api/admin/reject {id}` | – (drawn/won → rejected, sofort Ersatz für denselben Gewinn ziehen; sonst `not_drawn`) |
| `adminLogout()` | `POST /api/admin/logout` | – |
| – | `GET /api/health` | für Monitoring |

**Player-Objekt:** `{ id, fun_name, ig_handle, character, photo_at, vibe_at, status, prize, win_code, created_at }` – `status/prize/win_code` vor reveal_at maskiert

**Fehler:** JSON `{ "error": "<code>" }` mit passendem HTTP-Status. Codes, die das Frontend übersetzt (`friendly()` in store.js): `fun_name_unique`, `ig_handle_unique`, `blocked_text`, `not_admin`, `empty_pot`, `locked_after_draw`, `not_drawn`, `already_registered` (pro Gerät ein Eintrag), `not_registered` (Token unbekannt → store.js meldet `null`), `rate_limited`, `invalid_input`, `server_error`. Validierungsfehler (Länge/Format) prüft das Frontend zusätzlich selbst.

**Eingabe-Validierung (serverseitig wiederholen!):** fun_name trim, 2–24 · ig_handle: `@` entfernen, lowercase, `^[a-z0-9._]{1,30}$` · stars 1–5 · text trim, 2–80, Wortfilter · key = photo.

**Frontend-Details:** Offline-Puffer `ab_pending` in localStorage (Challenge wird lokal vorgemerkt, falls die Seite beim Wechsel zu Instagram neu lädt; beim nächsten Start nachgesendet) – API muss **idempotent** sein (zweites Abhaken ändert nichts). Dashboard pollt `me()` + `stats()` alle 20 s, die Anmeldeseite `stats()` alle 60 s (wichtig für Last – `stats` serverseitig cachen, z. B. 30–60 s).

---

## 6. Architektur Weg C (umgesetzt)

```
Gast-Handy ──HTTPS──▶ Traefik (TLS Let's Encrypt, Rate-Limit 200/s pro IP, Basic-Auth vor /admin*)
                         └──▶ abfahrt-app (Node 24, Fastify, 384 MB)     [traefik-network + abfahrt_internal]
                                ├─ liefert app/ statisch aus (/, /admin.html, …; ohne app/supabase)
                                └─ /api/*  ──(abfahrt_internal, ohne Internet)──▶ abfahrt-db (Postgres 16, 512 MB)
                                                                                  DB „abfahrt“, App-User nur DML
```

- **Live:** `https://abfahrt.askconnect.de` · Team: `https://abfahrt.askconnect.de/admin.html` (erst Basic-Auth „team“, dann E-Mail + Passwort) · Health: `/api/health`.
- **VPS** (Hostinger, Frankfurt, `ssh vps`): eigenes Compose-Projekt `/root/abfahrt` (`docker-compose.yml` aus `server/deploy/`). Einzige Verbindung nach außen: externes Netz `traefik-network`; Entrypoints `web`/`websecure`, Certresolver `letsencrypt`. **Traefik und die übrigen Dienste (n8n, Cal.com, Nextcloud, `postgres_prod`) werden nicht angefasst.**
- **Secrets** nur in `/root/abfahrt/.env` (chmod 600, erzeugt mit `server/scripts/gen-env.sh`): DB-Passwörter, 2 Admin-Accounts, Basic-Auth, `PRIZES`, `REVEAL_AT`. Auslesen: `grep -E 'ADMIN_._PASSWORD|BASIC_AUTH_(USER|PASSWORD)' /root/abfahrt/.env`.
- **Deploy** (kein GitHub-Zugang auf dem Server): `sh server/scripts/sync.sh` (rsync vom Mac) → auf dem VPS `cd /root/abfahrt && docker compose up -d --build`. Schema-Änderungen brauchen eine neue DB (`docker compose down -v`, löscht alle Spielerdaten).
- **Tests:** `server/test/` laufen auf dem VPS im Wegwerf-Projekt `abfahrt-test` (zweite App-Instanz mit `REVEAL_AT` in der Vergangenheit, gleiche DB) → Befehle oben in `server/deploy/docker-compose.test.yml`. **Lasttest:** `node server/loadtest/loadtest.js` vom Mac (`REVEAL=1` simuliert den 04:00-Ansturm), danach `purge.sh --loadtest`.
- **Skripte** (`server/scripts/`): `backup.sh` (pg_dump nach `/root/abfahrt/backups`), `purge.sh` (alle Spielerdaten löschen, mit Bestätigung), `gen-env.sh`, `sync.sh`.
- **Warum nicht n8n als öffentliche API:** größere Angriffsfläche (n8n müsste öffentlich erreichbar sein), n8n **speichert Ausführungen inkl. Payload** (personenbezogene Daten in der n8n-DB), schlechter unter Lastspitzen.

---

## 7. Sicherheits-Checkliste (Backend)

- Postgres **nicht öffentlich**, nur internes Netz; **eigener DB-User** mit Rechten nur auf die Abfahrt-Tabellen.
- **Nur parametrisierte Queries**.
- Gäste-Token: **≥ 256 Bit Zufall**, in der DB nur als **Hash** (z. B. SHA-256) gespeichert; per `Authorization: Bearer`.
- Admin: eigene Accounts mit **Passwort-Hash (argon2/bcrypt)**, Session-Cookie httpOnly/Secure/SameSite=Strict; optional zusätzlich Traefik-Basic-Auth oder IP-Allowlist auf `/admin*` + `/api/admin/*`.
- **Rate-Limiting** (Traefik-Middleware + in der App), v. a. `register`, `vibe`, `admin/login`.
- Server-seitige **Eingabeprüfung** + Wortfilter, Antworten ohne interne Fehlermeldungen.
- **Security-Header**: HSTS, CSP nur `'self'` (supabase-js entfernt, **Schriften selbst gehostet** in `app/fonts/` – keine Verbindung zu Google), `X-Frame-Options: DENY`, `Referrer-Policy`.
- **Same-Origin** (Webapp und API unter derselben Domain) → kein CORS nötig.
- **Logs ohne personenbezogene Daten** (nur Methode, Route, Status, Dauer); Health-Endpoint fürs Monitoring. Traefik-Access-Logs bewusst **nicht** (Traefik bleibt unverändert).
- **Backup** vor dem Event (`backup.sh`); **Löschen** aller Spieler/Vibes nach der Verlosung per `purge.sh` auf dem Server, danach `docker compose down -v` + `backups/` löschen (Datum im Datenschutzhinweis). Kein öffentlicher Lösch-Endpunkt, kein n8n.
- **Lasttest**: QR-Codes vor Ort → viele Anmeldungen gleichzeitig (Einlass, DJ-Ansage). Ziel z. B. 300 Anmeldungen/Minute + Polling aller aktiven Geräte alle 20 s.

---

## 8. Datenschutz (Stand)

- Verantwortlicher: alfons x; ASK Connect = Auftragsverarbeiter (**AVV** nötig).
- Für andere sichtbar: **Spaßname + Vibe** (Live-Vibes); Instagram-Handle nur fürs Team.
- Gespeichert: Spaßname, Instagram-Handle, erledigte Challenges, Vibe (Sterne + Satz), Status/Gewinncode, zufällige Geräte-Kennung im Browser (technisch notwendig, § 25 Abs. 2 TDDDG, kein Cookie-Banner).
- **Keine Fotos, keine KI**, Daten in der EU (Hostinger, Frankfurt; **AVV mit Hostinger** klärt die Projektleitung), Löschung nach der Verlosung.
- `app/datenschutz.html` und `app/teilnahmebedingungen.html` sind **Entwürfe mit Platzhaltern** (Datenschutz bewusst minimal: nennt noch „GitHub Pages“ als Dienstleister → **auf Hostinger, Frankfurt ändern**). Vor dem Start rechtlich prüfen lassen.

---

## 9. Offene Punkte / To-dos

**Backend (Kollege):**
- [x] Freigabe Weg C, eigener Postgres-Container statt `postgres_prod`
- [x] Subdomain `abfahrt.askconnect.de`, Traefik-Labels, eigenes Compose-Projekt `/root/abfahrt`
- [x] Node-API + Schema + 2 Admin-Accounts + Basic-Auth + `store.js`-Live-Teil (inkl. `reveal`, `adminDrawAll`), API-Tests
- [x] Demo-Modus nur noch auf `*.github.io`/localhost
- [ ] Neuen Stand (2 Challenges + Live-Show) auf den VPS deployen (Schema neu → DB wird neu angelegt)
- [ ] Lasttest 1000 Geräte + 04:00-Ansturm (`REVEAL=1`), danach `purge.sh --loadtest`
- [ ] Externer Uptime-Check auf `/api/health` (Projektleitung)
- [ ] Admin-Login auf dem iPhone testen (Basic-Auth + API-Aufrufe in Safari)
- [ ] VPS-Neustart/Updates vor dem Event einplanen (meldet „System restart required“)
- [ ] Am Eventtag: `backup.sh`; nach der Verlosung: `purge.sh`, `down -v`, Backups löschen

**Inhalt / Kunde:**
- [ ] Echter **Ablauf** (Zeiten, DJs, Acts, Ende) → `config.js` `schedule`, `scheduleIsExample:false`
- [ ] Echter **Lageplan** (Bild) → `config.js` `mapImage`, `mapIsExample:false`; Position der Security
- [ ] `helpWhere` (wo gibt's Hilfe), `address` für „Route planen“
- [x] **Gewinn-Zuordnung**: per Los beim Ziehen (prize), Show-Reihenfolge `revealOrder` in config.js
- [ ] Abholung: bis wann können Gewinne an der Bar abgeholt werden? → Teilnahmebedingungen-Platzhalter
- [ ] Platzhalter in Teilnahmebedingungen/Datenschutz (Firma, Adresse, E-Mail, Löschdatum)
- [ ] **Charakter-Karte** behalten oder entfernen (kein KI-Charakter mehr)
- [ ] ManyChat/Vorregistrierung endgültig streichen? (dann Team-Video-Satz „Abfahrt unterm Reel kommentiert“ ersetzen)
- [ ] **QR-Codes** für vor Ort mit finaler Domain erzeugen
- [ ] **Beide Videos neu rendern** – sie zeigen noch 3 Challenges (Random-Foto/Best Pose) und den alten Stand
- [ ] Follow-up nach dem Event (optional): Dauerbetrieb „Foto mit alfons-Rahmen posten & markieren“ fürs Restaurant

---

## 10. Ressourcen

- Repo: `https://github.com/semo428/Abfahrt26` (Root = Konzept-Kurzfassung, `app/` = Webapp)
- Live: `https://abfahrt.askconnect.de` · Team: `https://abfahrt.askconnect.de/admin.html`
- Test-Hosting (Demo): `https://semo428.github.io/Abfahrt26/app/`
- Videos (lokal beim Projektinhaber, nicht im Repo): Team-Erklärvideo `abfahrt-mission.mp4` (~2:08), Gäste-Clip `abfahrt-gaeste.mp4` (24 s, QR auf Test-URL). Erzeugt automatisiert (Puppeteer-Aufnahme der echten App + ElevenLabs-Stimme „Jessica“); bei App-Änderungen neu rendern.
- Laufende Kosten (bisher): ManyChat Pro ~39 $ (falls genutzt) · eigener VPS (Hostinger): vorhanden, keine Zusatzkosten.
