// Abfahrt · alfons x — Konfiguration
// Auf *.github.io und localhost läuft die App im DEMO-MODUS (alles nur lokal im Browser), sonst gegen die API unter /api (siehe store.js).
// Alles mit "BEISPIEL" ist Platzhalter und muss noch durch echte Infos ersetzt werden.
window.ABFAHRT_CONFIG = {
  instagram: "alfonsx_sigmaringen",
  eventDate: "24.10.2026",
  drawTime: "03:30",     // Team lost im Admin-Bereich aus und prüft die Storys (Gäste sehen davon nichts)
  revealTime: "04:00",   // Live-Auslosung startet gleichzeitig auf allen Handys
  // Gewinne des Abends (erscheinen im Laufband, auf der Startseite und in der Admin-Ansicht)
  prizes: [
    { key: "meet",  count: 5, icon: "⭐", title: "Meet & Greet",            sub: "mit den Stars" },
    { key: "shirt", count: 3, icon: "👕", title: "Special-Edition T‑Shirt", sub: "alfons x" },
    { key: "drink", count: 5, icon: "🥤", title: "Getränk",                 sub: "deiner Wahl" }
  ],
  // Reihenfolge der Runden in der Live-Auslosung – die letzte ist das große Finale
  revealOrder: ["shirt", "drink", "meet"],

  // ---------- Timetable ----------
  // Zeiten nach Mitternacht werden automatisch dem nächsten Tag zugeordnet. Ohne Zeiten = läuft die ganze Nacht.
  timetable: [
    { floor: "X Floor", where: "Alfons", sets: [
      { from: "22:00", to: "23:30", artist: "Sandy Sel" },
      { from: "23:30", to: "01:00", artist: "Marco Berto" },
      { from: "01:00", to: "02:30", artist: "NYRA" },
      { from: "02:30", to: "04:00", artist: "CHRISSYJEEY" },
      { from: "04:00", to: "06:00", artist: "Summit" }
    ] },
    { floor: "Bunker Floor", where: "Bunker · Treppe im Außenbereich", sets: [
      { from: "23:00", to: "00:15", artist: "Teekay" },
      { from: "00:15", to: "01:30", artist: "Benjamin Trippel" },
      { from: "01:30", to: "02:40", artist: "Kim Ahlf" },
      { from: "02:40", to: "03:50", artist: "DJ Jeff" },
      { from: "03:50", to: "05:00", artist: "M.a.u.r.i." }
    ] },
    { floor: "DB Floor", where: "DB Halle", sets: [
      { artist: "Djimbel", note: "die ganze Nacht" }
    ] }
  ],

  // ---------- Nächste Events (Tab „Events“) ----------
  // Vergangene Events werden automatisch ausgeblendet. featured: true = große Karte oben.
  events: [
    { date: "2027-04-24", title: "Abfahrt", badge: "60. Event · Jubiläum", featured: true,
      text: "Die nächste Abfahrt – unser 60. Event. Das feiern wir groß. Save the date!" },
    { date: "2026-12-24", title: "Heiligabend im alfons x", text: "Nach der Bescherung noch raus? Wir feiern Heiligabend zusammen." },
    { date: "2026-12-31", title: "Silvester im alfons x", text: "Rein ins neue Jahr – mit Countdown um Mitternacht." }
  ],
  eventsNote: "Alle Infos & Tickets kommen zuerst auf Instagram.",

  // ---------- Live-Vibes auf der Startseite ----------
  // Feste Auswahl – echte Vibes der Gäste werden gespeichert, aber nicht öffentlich angezeigt (Schutz vor Beleidigungen).
  vibes: [
    { stars: 5, text: "Bass im Bauch, Grinsen im Gesicht", name: "Tanzflächen-Pirat" },
    { stars: 5, text: "Bester Abend seit Monaten!", name: "Disco-Dackel" },
    { stars: 4, text: "Die Lichtshow ist komplett verrückt", name: "Licht-Lurch" },
    { stars: 5, text: "Meine Crew und ich gehen nie wieder heim", name: "Nachteule 3000" },
    { stars: 5, text: "Der DJ liest meine Gedanken", name: "Beat-Biber" },
    { stars: 4, text: "Bunker = beste Entscheidung heute", name: "Kellerkind" },
    { stars: 5, text: "Füße tun weh, egal, weiter!", name: "Sohlen-Brenner" },
    { stars: 5, text: "Hab drei neue Freunde gefunden", name: "Kuschel-Kaktus" },
    { stars: 4, text: "Foodtruck rettet die Nacht", name: "Pommes-Prinz" },
    { stars: 5, text: "Gänsehaut beim Drop", name: "Drop-Dino" },
    { stars: 5, text: "Abfahrt hält, was der Name verspricht", name: "Schienen-Surfer" },
    { stars: 4, text: "Chill-Area zum Durchatmen, dann wieder rein", name: "Sofa-Rakete" },
    { stars: 5, text: "Sigmaringen kann richtig feiern", name: "Hohenzollern-Hüpfer" },
    { stars: 5, text: "Ich will hier wohnen", name: "Party-Pinguin" },
    { stars: 4, text: "Stimmung auf dem X Floor: 100 %", name: "X-Floor-Flummi" },
    { stars: 5, text: "Bisschen verliebt in diesen Abend", name: "Herzchen-Hupe" },
    { stars: 5, text: "So viele gute Leute auf einem Haufen", name: "Funkel-Fuchs" },
    { stars: 4, text: "Tattoo gestochen, Abend gerettet", name: "Tinten-Tiger" },
    { stars: 5, text: "Wann ist die nächste Abfahrt?!", name: "Bahnsteig-Bär" },
    { stars: 5, text: "Mehr davon. Bitte. Sofort.", name: "Zugabe-Zebra" }
  ],

  // ---------- Gut zu wissen (Lageplan) ----------
  kioskInfo: "Hol sie dir gleich am Anfang am Kiosk – dort geht EC-/Kreditkarte, sonst zahlst du bar.",

  // ---------- Lageplan ----------
  // mapImage leer = gezeichneter Beispielplan. Später z. B. "lageplan.jpg" in den Ordner legen und hier eintragen.
  mapImage: "",
  mapIsExample: false,   // gezeichneter Plan nach Skizze des Inhabers (15.10.)
  address: "alfons x, Sigmaringen",   // für den Button „Route planen“ (Google Maps öffnet sich nur per Klick)

  // ---------- Hilfe am Abend ----------
  helpWhere: "Überall im Club ist Security unterwegs – sprich einfach die nächste an, du musst nicht erst zum Eingang. Auch das Personal an der Bar hilft dir"
};
