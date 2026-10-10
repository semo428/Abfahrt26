# Chronik, Diskussionen & Erkenntnisse – Projekt „Abfahrt“

Ergänzung zu `projekt-kontext.md`. Hier steht **wie** wir zu den Entscheidungen gekommen sind, was verworfen wurde und welche technischen Lehren wir gezogen haben – damit niemand dieselben Diskussionen nochmal führt.

---

## 1. Chronik

### 19.09. – Briefing & Ideenphase
- Auftrag des Inhabers: „Irgendwas Cooles mit AI/Spiel, damit die Instagram-Views am Tag des größten Events extrem steigen.“
- Ausgangsideen (eigene + aus einem früheren KI-Chat): Riesen-QR → Story-Vorlage, NFC-Schnitzeljagd mit Aufgaben, „Hidden Mission“ mit 5 NFC-Tags, KI-„Party Alter Ego“, KI-Roast-Booth, KI-Wahrsager, „Who is most likely to“, Instagram-Bingo, Live-Barometer auf Screen, Ketten-Einladungen.
- **Wichtige Korrektur in der Diskussion:** Gäste-Storys bringen Reichweite in die Feeds der **Freunde** – die Zahlen der **Bar** steigen vor allem durch Interaktion **auf dem Bar-Account** (Kommentare unter Reels, Reposts der Gäste-Storys, Profilaufrufe). → Konzept in **3 Wellen**: vorher (Reels + Kommentar-Keyword), Nacht (Challenges + Story-Markierungen + Reposts), danach (Aftermovie + „Kommentiere FOTOS“ → Fotos per DM).
- **DSGVO-Vorgabe des Users:** so einfach wie möglich, **keine Bilder an eine KI**.
- Konzept des Users (verfeinert): Vorregistrierung per Kommentar-Link → Gewinnspiel mit **Spaßname + KI-Charakter** → am Abend Stationen: (1) Foto mit Fremdem + Story, (2) Vibe-Check mit Sternen, (3) Best Pose + Voting, Punktestand, Lostopf.
- Vereinfachung durch den User: **keine Punkte**, einfach **alle 3 erledigt + registriert = Lostopf**; ein **Mensch prüft** nach der Ziehung die Story.
- Erkenntnis: Viele posten **direkt** in Instagram, ohne QR zu scannen → (damals) automatische DM bei Story-Erwähnung (`story_mention`-Webhook) mit Anmelde-Link.
- Konzeptseiten für den Inhaber gebaut (siehe `konzept/`). Name der Party: **„Abfahrt“**. Datum korrigiert auf **Samstag 24.10.2026**. Account: **@alfonsx_sigmaringen**. Keyword „ABFAHRT“. **Alle Alkohol-Bezüge entfernt** (User-Vorgabe).
- Live-Demo des Story-Rahmens: Rahmen entsteht im Browser (Canvas), Teilen per Web Share API → nur so kommt man in Instagram (Teilen-Menü → Instagram → Story). Story mit vorausgefüllter Markierung ist aus dem Web **nicht** möglich.
- Leinwand-Idee: Fotos müssten dafür hochgeladen werden → Speicherung nur bis zum nächsten Morgen, mit eigenem Häkchen beim Foto. (Später komplett gestrichen.)
- Kurzfassung der Konzeptseite für den Inhaber; GitHub-Repo `semo428/Abfahrt26` + GitHub Pages angelegt.

### 02.10. – Instagram-Automation & Webapp-Bau
- Native Instagram-Automation (Kommentar → DM) war im Konto **nicht verfügbar** (auch nicht in Meta Business Suite) → **ManyChat**. Free-Tarif nur 25 Kontakte/Monat → **Pro 39 $** für Oktober nötig.
- Eigene Lösung mit n8n + Meta-App: technisch möglich, aber **App Review + Unternehmensverifizierung** nötig (Standardzugriff wirkt nur bei Testern/Admins der App), Dauer Tage bis Wochen → für den Start zu riskant; für künftige Kunden aber ein lohnendes Produkt.
- Umgehen der Freigabe per inoffizieller API, Browser-Automation oder Apify-DM-Actors: **abgelehnt** (ToS-Verstoß, Sperr-Risiko für das Bar-Konto, Passwort in Skripten). Apify kann öffentliche Kommentare **lesen**, aber DMs nur über Login-Session → gleiches Risiko.
- Webapp gebaut (`app/`): Anmeldung, Charakter, Dashboard, 3 Challenges, Gewinn-Screen, Admin-Ziehung, Demo-Modus (localStorage) + Supabase-Anbindung (`schema.sql`). NFC/QR-Stationen erst eingebaut, dann **gestrichen** (Challenges direkt antippbar).

### 03.10. – Tests des Users & Korrekturen
- Fragen zu Datenspeicherung (Demo = nur im Browser → Admin sieht nichts; live = zentrale DB) und Login-Persistenz (zufällige Kennung im Local Storage, kein Cookie-Banner nötig).
- Neu: **„Daten löschen & neu anmelden“** (komplett löschen, pro Gerät ein aktiver Eintrag, nach Ziehung gesperrt).
- Bug: Challenge wurde nicht abgehakt, Bestätigen-Knopf erschien erst nach Rückkehr aus Instagram (iPhone lädt Seite oft neu) → **Abhaken schon beim Tipp auf „In Story teilen“** + lokaler Puffer `ab_pending`.
- Gedruckter Handle im Rahmen verleitet dazu, nicht zu markieren → **Platzhalter „hier alfons x markieren“**; erst zu groß (unten), dann **klein oben unter dem Challenge-Badge**, „abfahrt.“ + Datum wieder nach unten.
- Kostenschätzung/Angebot an den Inhaber erarbeitet (siehe `docs/intern/`).

### ~04.10. – Termin mit dem Inhaber (Feedback)
- Follow-up-Idee (nach dem Event): Webapp-Grundidee **„Foto mit alfons-Rahmen posten & markieren“** als Dauerbetrieb fürs Restaurant.
- Webapp soll **zentrale Seite für den ganzen Abend** sein: **Ablauf** (Einlass, Acts, Auslosung, Ende), **Lageplan** (wo was ist), **Regeln** (seine Poster „X rules“ + „Zero Tolerance“ schöner darstellen).
- **„Idiotensicher und einfach – so viel wie nötig, so wenig wie möglich, wir müssen an den letzten Deppen denken.“** (gilt für die gesamte App, besonders das Spiel)

### 05.10. – Umsetzung Feedback
- Tab-Leiste **Mission · Ablauf · Lageplan · Regeln** (unten, später auffälliger gestaltet; unten bewusst, wegen Daumen-Reichweite).
- Ablauf mit „läuft gerade“-Markierung, Lageplan (Beispiel-Innenplan), Regeln neu gestaltet; alles ohne Anmeldung nutzbar.
- Mission vereinfacht: 3-Schritte-Erklärung, nummerierte Schritte in den Challenges, Song/Party-Move entfernt.
- **Gewinne** vom Inhaber: 5× Meet & Greet mit den Stars, 3× Special-Edition alfons-x-T-Shirt, 5× Getränk deiner Wahl → Laufband + Kacheln, 13 Gewinner.
- Rules-Hinweiskarte auf der Startseite („Zuallererst: Schau dir unsere Rules an …“).
- Demo-Hinweis-Banner entfernt; „Route planen“ (Google Maps) als dezente Karte oben auf der Lageplan-Seite.
- Mission-Seite aufgeräumt: **Anmeldeformular direkt oben**, Abschnitte mit roten Trennlinien, Kleingedrucktes nach unten.
- Zurück-Knopf in Challenges + Zurück-Geste des Handys; Kopieren des Handles in die Zwischenablage **entfernt** (eingefügter Text ist keine echte Instagram-Erwähnung – man muss den Account in der Liste antippen).
- OSM-Umgebungsplan (Bahnhof Sigmaringen, echter Eingang „AlfonsX“ auf der Südseite) gebaut → **auf Wunsch zurück** zum schlichten Plan, aber mit **gelben Security-Strichmännchen** am Eingang.
- Datenschutzseite **minimaler Entwurf** (nur GitHub Pages + [Tool 1]/[Tool 2]); KI-Charakter wird **nicht** genutzt.
- Asset-Versionierung `?v=…` eingeführt (GitHub Pages cacht 10 Minuten).

### 05.–06.10. – Videos
- **Team-Erklärvideo** (`video/abfahrt-mission.mp4`, ~2:08): Partygästin (ElevenLabs-Stimme „Jessica“) spielt die Mission in der echten App durch, inkl. Kamera-Ansicht, nachgebautem Instagram-Story-Editor (Sticker aufs Feld), Security-Botschaft bei den Rules, „gewonnen.“.
- **Gäste-Clip** (`video/abfahrt-gaeste.mp4`, 24 s) für vor Ort: ①QR scannen & Spaßname · ②3 Challenges · Story + markieren · ③02:00 Auslosung · Menü (Ablauf/Lageplan/Rules) · QR-Code.
- **Entscheidung 06.10.:** Vorregistrierung per Reel/ManyChat **voraussichtlich gestrichen** → **QR-Codes vor Ort**, keine Vorregistrierung.

### 06.–07.10. – Hosting & Backend
- Fix „gewonnen.“-Schrift (lief auf Handys über), Datenschutzseite live gebracht (Pages-Build hing bei GitHub in der Queue).
- **GitHub Pages ist für den kommerziellen Live-Betrieb nicht geeignet** (Nutzungsbedingungen, kein Monitoring) → Hosting auf eigenem **VPS**.
- Missverständnis geklärt: Die Webapp ist eine Webseite (kein Download); egal wo sie liegt, der Code läuft im Browser des Gastes → **es braucht immer eine API zwischen Handy und Datenbank**. Supabase bringt diese Schicht fertig mit, mit eigener Postgres muss man sie bauen.
- Vergleich Weg B (VPS + Supabase) vs. **Weg C (VPS + eigene Postgres + eigener Node-API-Container)** → **Empfehlung C**, n8n nur intern (Gründe in `projekt-kontext.md` §2/§6).
- Übergabe an den Kollegen (Backend) vorbereitet – dieses Paket.
- Google Fonts werden noch von Google geladen (IP-Übertragung, DSGVO-Risiko nach LG München 2022) → **sollen lokal ausgeliefert werden** (Poppins, Figtree, IBM Plex Mono, OFL-Lizenz); gilt auch für supabase-js vom CDN.

### 07.10. – Änderungswunsch des Inhabers
- **Nur noch 2 Challenges:** (1) **Abfahrt-Foto** – „Poste ein Bild von dir während der Abfahrt, gerne auch mit deiner Crew“ (Key `photo`, Frontkamera), (2) **Vibe-Check** unverändert. **Best Pose gestrichen.** Lostopf = 2/2.
- **Live-Vibes-Fenster:** kleine Karte mit max. 7 zufälligen Vibes anderer Gäste, wechselt minütlich; bei weniger Vibes entsprechend weniger.
- Teilnahmebedingungen + Datenschutz: Spaßname und Vibe sind für andere sichtbar.

### 10.10. – Neue Auslosung: Live-Show auf allen Handys (Wunsch des Inhabers)
- **„DJ lost aus“ gestrichen.** Idee des Inhabers: Die Datenbank lost vorher im Hintergrund aus, die Handys zeigen das Ergebnis zur festen Uhrzeit als Show – „theoretisch weiß die Datenbank vorher schon, wer gewonnen hat, es geht nur um die Darstellung“.
- **Zeiten:** 03:30 Team lost aus (Admin „Jetzt auslosen“, alle 13 auf einmal, Gewinn per Los), bis 04:00 Story-Prüfung (Story da / Neu ziehen → Ersatz für denselben Gewinn), **04:00 Live-Show** auf allen Handys. Gewinn-Anzahlen bleiben 5× Meet & Greet, 3× T-Shirt, 5× Getränk.
- **Show:** vorher Countdown-Karte im Mission-Tab („in 2 h 59 min 30 s … schau auf dein Handy!“); dann Runde T-Shirt → Runde Getränk → **Finale** Meet & Greet (größer, Countdown 10). Namen würfeln schnell durch, Countdown 5-4-3-2-1, bei 0 rasten die Gewinner nacheinander ein; eigener Name weiß hervorgehoben + Vibration; danach Übersicht aller Gewinner.
- **Synchron:** Show-Zeitachse hängt an `reveal_at` + Serverzeit (Handy gleicht Uhr ab) → alle Handys gleichzeitig; wer später öffnet, steigt mitten ein bzw. kann die Show nachträglich abspielen.
- **Kein Spicken:** Server gibt Gewinner/Status/Gewinn erst ab `reveal_at` heraus (`my_player`, `public_reveal`; direkte Tabellen-Leserechte entfernt).
- **Abholung an der Bar:** Gewinn-Screen zeigt Gewinn + „Komm jetzt zur Bar und hol deinen Gewinn ab“ + Live-Code (Einwand: um 4 Uhr sind viele nicht mehr am DJ-Pult). Bis wann abholbar → offen (Platzhalter in Teilnahmebedingungen).
- **Grenze:** Gesperrte Handys lassen sich per Webseite nicht wecken (kein Push ohne App) → kurze Ansage/Bar-Story „gleich geht's los“ trotzdem sinnvoll.
- **Sommerzeit:** In der Nacht 24./25.10.2026 endet die Sommerzeit (03:00 → 02:00). 02:00 hätte es zweimal gegeben; 03:30/04:00 sind eindeutig (MEZ, +01).
- Testlauf im Demo-Modus: `?probe=30` → Show startet nach 30 s mit Testnamen, eigener Name gewinnt im Finale.

---

## 2. Verworfene Ideen (und warum)

| Idee | Warum verworfen |
|---|---|
| Fotos an KI (Roast, Charakter aus Foto, Gesichtserkennung für Fotos) | DSGVO, biometrische Daten |
| KI-Party-Charakter (nur aus Text) | nicht mehr gewünscht; Anthropic wird nicht genutzt |
| Punktesystem | zu kompliziert → 3/3 genügt |
| NFC-Tags / Stationen | Aufwand, unnötig; QR + direkt in der App |
| Leinwand/Beamer mit Live-Fotos | Aufwand, Moderation, Foto-Uploads |
| Ketten-Einladungen | auf einer Party bastelt niemand Links |
| Inoffizielle Instagram-API / Apify-DMs | Sperr-Risiko, ToS |
| Eigene Meta-App für Kommentar→DM (für dieses Event) | App Review dauert zu lange (für künftige Kunden aber interessant) |
| OSM-Umgebungsplan | User fand schlichten Plan besser |
| Handle in Zwischenablage kopieren | erzeugt keine echte Markierung |
| GitHub Pages als Live-Hosting | kommerziell nicht erlaubt, kein Monitoring |
| n8n als öffentliche API | Angriffsfläche, speichert Payloads, Last |

---

## 3. Technische Erkenntnisse (Frontend & Plattform)

- **Instagram:** Aus dem Web kann man nur ein **Bild** übergeben (Web Share API → Teilen-Menü → Instagram → Story). **Erwähnungen lassen sich nicht vorbefüllen** – auch native Apps können über die Stories-Schnittstelle keine Mentions setzen. Ein ins Bild gedruckter Handle ist **keine** Markierung.
- **iPhone** lädt die Webseite beim Wechsel zu Instagram oft neu → Zustand vorher sichern (`ab_pending`).
- **GitHub Pages** cacht Dateien 10 Min → Asset-URLs mit `?v=` versionieren, bei jeder Änderung hochzählen.
- **Web Share API** braucht HTTPS und eine Nutzer-Geste (nicht vorher `await`en, sonst blockt iOS).
- `vw`-Schriftgrößen + Browser-Zoom vertragen sich nicht (nur relevant für Videoaufnahmen).
- Story-Mentions erscheinen im **DM-Postfach** des erwähnten Business-Kontos (auch bei privaten Profilen / Enge-Freunde-Storys) → dort prüft das Team; Storys verschwinden nach **24 h** → Ziehung in derselben Nacht.
- Instagram Private Reply: auf einen Kommentar darf das Business-Konto **eine** DM senden (innerhalb 7 Tagen).

---

## 4. Video-Pipeline (Kurz)

Siehe `video/README.md`. Prinzip: Puppeteer steuert die echte App in einer „Bühne“ (HTML) und nimmt per CDP-Screencast auf; ein Markierungsquadrat in der Bildecke kodiert Ereignisse (Satzstart, Tipp, Ton), daraus werden Ton und Bild exakt synchronisiert; Bildspur wird **bildgenau mit 30 fps** gebaut (nicht per ffmpeg-concat – das dehnt das Video). Stimme: ElevenLabs „Jessica“ (`cgSgspJ2msm6clMCkdW9`, `eleven_multilingual_v2`); Sprechtext normal schreiben („Abfahrt“, nicht „ABFAHRT“ – sonst wird buchstabiert). ElevenLabs-Free-Tarif: keine Musik-API → Beat als 4-s-Soundeffekt-Schleife.
