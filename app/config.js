// Abfahrt · alfons x — Konfiguration
// Solange supabaseUrl leer ist, läuft die App im DEMO-MODUS (alles nur lokal im Browser).
// Alles mit "BEISPIEL" ist Platzhalter und muss noch durch echte Infos ersetzt werden.
window.ABFAHRT_CONFIG = {
  supabaseUrl: "",        // z. B. "https://abcd1234.supabase.co"
  supabaseAnonKey: "",    // "anon public" Key aus Supabase → Project Settings → API

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

  // ---------- Ablauf des Abends (BEISPIEL) ----------
  // Zeiten nach Mitternacht werden automatisch dem nächsten Tag zugeordnet.
  // highlight: true = rot hervorgehoben
  scheduleIsExample: true,
  schedule: [
    { time: "21:00", title: "Einlass",              note: "Ab 18 · Ausweis mitbringen" },
    { time: "21:30", title: "Warm-up",              note: "DJ Beispiel 1" },
    { time: "23:00", title: "Main Set",             note: "DJ Beispiel 2" },
    { time: "00:00", title: "Mitternachts-Moment",  note: "Handys hoch – Story mit @alfonsx_sigmaringen!", highlight: true },
    { time: "01:00", title: "Live-Act",             note: "Beispiel-Act" },
    { time: "02:15", title: "Closing Set",          note: "DJ Beispiel 3" },
    { time: "04:00", title: "Live-Auslosung",       note: "Auf deinem Handy – Gewinne an der Bar abholen", highlight: true },
    { time: "05:00", title: "Ende",                 note: "Kommt gut heim!" }
  ],

  // ---------- Lageplan ----------
  // mapImage leer = gezeichneter Beispielplan. Später z. B. "lageplan.jpg" in den Ordner legen und hier eintragen.
  mapImage: "",
  mapIsExample: true,
  address: "alfons x, Sigmaringen",   // für den Button „Route planen“ (Google Maps öffnet sich nur per Klick)

  // ---------- Hilfe am Abend ----------
  helpWhere: "Security am Eingang oder Personal an der Bar"
};
