# Abfahrt · Webapp (alfons x, 24.10.2026)

Anmeldung mit Spaßname + KI-Charakter, Mission-Dashboard (3/3), drei Challenges direkt in der App,
„gewonnen.“-Screen und Admin-Ansicht für die Ziehung. Reines HTML/CSS/JS – kein Build nötig.

## Dateien
| Datei | Zweck |
|---|---|
| `index.html` + `app.js` | Spieler-App |
| `admin.html` + `admin.js` | Team-Ansicht: Lostopf, Auslosen, Story bestätigen |
| `store.js` | Datenschicht (Supabase oder Demo) |
| `frame.js` | Story-Rahmen im Browser + Teilen |
| `config.js` | **Hier alles eintragen** (Supabase, Preis) |
| `supabase/schema.sql` | Tabellen, Zugriffsregeln, Funktionen |
| `supabase/functions/character/` | KI-Charakter (Claude) |
| `teilnahmebedingungen.html`, `datenschutz.html` | **Entwürfe** – prüfen lassen, Platzhalter ersetzen |

## Sofort testen (Demo-Modus)
Solange `supabaseUrl` in `config.js` leer ist, läuft alles lokal im Browser (gelber Hinweis oben).
Ideal zum Durchklicken – die Admin-Ziehung zieht dann nur aus Anmeldungen auf demselben Gerät.

## Live schalten (ca. 30 Min.)
1. **Supabase-Projekt** anlegen, Region **Frankfurt (eu-central-1)**.
2. Authentication → Sign In / Providers → **„Allow anonymous sign-ins“** einschalten.
3. SQL Editor → Inhalt von `supabase/schema.sql` ausführen.
4. **Team-Login:** Authentication → Users → „Add user“ (E-Mail + Passwort), dann im SQL Editor:
   `insert into public.admins (user_id) values ('<USER-ID>');`
5. **KI-Charakter** (optional – ohne läuft ein eingebauter Text-Generator):
   ```
   supabase functions deploy character --project-ref <REF>
   supabase secrets set ANTHROPIC_API_KEY=sk-ant-... --project-ref <REF>
   ```
6. `config.js`: `supabaseUrl` + `supabaseAnonKey` eintragen (Project Settings → API).
7. Ordner auf **GitHub Pages** veröffentlichen.

## Links
| Wofür | URL |
|---|---|
| ManyChat-DM | `https://<pages>/?u={{Instagram Username}}` → füllt den Instagram-Namen vor |
| Direkt zu einer Challenge (optional, z. B. für eine Story) | `https://<pages>/?station=random` · `vibe` · `pose` |
| Team | `https://<pages>/admin.html` |

Die Challenges startet man direkt im Dashboard der App – keine NFC-Tags oder QR-Codes nötig.

## Nach dem Event
Im SQL Editor (siehe Ende von `schema.sql`):
```
delete from public.vibes; delete from public.players;
delete from auth.users where is_anonymous;
```
