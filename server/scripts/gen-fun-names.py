# Erzeugt app/fun-names.js: 1000 jugendfreundliche Party-Spaßnamen (handgeschrieben + kuratierte Kombinationen)
import io, json, random, re, sys

HAND = """
Nachtfalke|Bass-Baronin|Discokönig|Beat-Pilotin|Konfetti-Kanone|Groove-Gigant|Mitternachts-Muse|Lichtorgel-Lord|Nebel-Queen|Tanzflächen-Titan
Zugvogel|Schaffnerin|Nachtzug|Bahnsteig-Boss|Funkenflug|Spätschicht|Sternfahrer|Neonfuchs|Weichensteller|Lokführerin
Rampensau|Partylöwe|Partymaus|Nachtschwärmer|Nachteule|Wirbelwind|Knallerbse|Frechdachs|Schlitzohr|Quatschkopf
Plaudertasche|Dramaqueen|Dramalama|Spaßvogel|Partytier|Tanzmuffel|Flirtkanone|Herzensbrecher|Charmebolzen|Augenzwinkerer
Nervensäge|Krawallkeks|Rabauke|Lausbub|Sahneschnitte|Zuckerschnute|Herzblatt|Sonnenschein|Glückspilz|Pechvogel
Schlafverweigerer|Sofaflüchtling|Ohrwurmzüchter|Ausdruckstänzer|Luftgitarrist|Luftgitarren-Gott|Hüftschwung-Held|Moonwalker|Robot-Dancer|Breakdance-Opa
Tanzflächen-Terror|Bassbombe|Chaosprinz|Chaosprinzessin|Chaos-Kapitän|Krawallprinzessin|Glitzerbombe|Discokugel|Stroboskop|Nebelmaschine
Konfettiregen|Lichtschwert|Laserschwert|Bassdrop|Dropjäger|Remix-Rakete|Plattenteller|Mischpult-Magier|Kopfnicker|Schulterzucker
Fingerschnipser|Fußwipper|Mitklatscher|Mitgröhler|Refrain-Rakete|Karaoke-Kaiser|Karaoke-Queen|Schief-Sänger|Duschsänger|Playback-Profi
Zurückbleiben bitte|Türen schließen|Endstation Party|Letzter Zug|Anschlusszug|Ersatzverkehr|Gleiswechsel|Bummelzug|Dampflok|Rangierlok
Abfahrtsignal|Pfeifkonzert|Volldampf|Hochgeschwindigkeit|Schienenschlawiner|Gleis-Gangster|Bahnhofsbaron|Fahrplan-Ignorant|Verspätungskönig|Pünktlich-Pauli
Zugbegleiter|Speisewagen-Star|Schlafwagen-Schreck|Lokomotive|Waggonwackler|Bahnschranke|Signalpfeife|Fahrkartenknipser|Bahnsteigkante|Gepäcknetz
Donau-Delfin|Schlossgespenst|Hohenzollern-Held|Spätzle-Express|Maultaschen-Gang|Schwabenpfeil|Donauwelle|Bahnhofsdiva|Sigma-Star|Albtrauf-Adler
Glitzerfee|Tanzfee|Discofee|Beatfee|Nebelfee|Konfettifee|Zauberfuß|Gummibein|Wackelpudding|Wackeldackel
Hampelmann|Zappelfrau|Springinsfeld|Hüpfburg|Flummi|Gummibärchen|Brausepulver|Zuckerwatte|Popcorn-Panik|Schokokuss
Lakritzschnecke|Kaugummiblase|Marshmallow|Kekskrümel|Butterbrezel|Pommesgabel|Ketchupkönig|Mayo-Monster|Currywurst-Kaiser|Döner-Diva
Pizzaprinz|Nudelholz|Spaghetti-Tänzer|Knoblauchbrot|Käsekrainer|Leberkäs-Lord|Brezelbaron|Laugenweckle|Wurstsalat-Wizard|Kässpätzle
Dancefloor-Diva|Dancefloor-Dino|Discodino|Partydino|T-Rex-Tänzer|Raptor-Rave|Dinoparty|Mammut-Moves|Säbelzahn-Swing|Urzeit-Groover
Weltraumtänzer|Astronautin|Raketenrudi|Kometenkind|Mondlandung|Sternschnuppe|Milchstraße|Galaxy-Groover|Ufo-Alarm|Alien-Anna
Partyalien|Discoalien|Neonalien|Space-Cowboy|Space-Cowgirl|Mars-Mambo|Jupiter-Jive|Saturn-Samba|Venus-Vibe|Pluto-Pogo
Ninja-Tänzer|Disco-Ninja|Bass-Ninja|Party-Pirat|Disco-Pirat|Glitzer-Pirat|Captain Konfetti|Captain Groove|Admiral Bass|Kapitän Nebel
Superheldin|Supertänzer|Mega-Mover|Ultra-Groover|Hyper-Hüpfer|Turbo-Tänzer|Turbo-Tante|Turbo-Onkel|Party-Opa|Party-Oma
Tanzbär|Partybär|Kuschelbär|Brummbär|Gummibär|Waschbär-Gang|Pandabär|Eisbär-Eleganz|Koala-Kuschler|Faultier-Fan
Lama-Drama|Alpaka-Alarm|Kamel-Karaoke|Giraffen-Groove|Zebra-Zumba|Nashorn-Note|Nilpferd-Party|Elefanten-Tanz|Pinguin-Polka|Robben-Rave
Hamsterbacke|Hamsterrad|Meerschwein|Kaninchenbau|Igel-Igor|Dachs-Disco|Fuchs-Funk|Wolfsgeheul|Eulenblick|Uhu-Ultra
Flamingo-Flow|Papagei-Party|Pfau-Parade|Kolibri-Kick|Spatz-Spektakel|Möwen-Moves|Taubenschlag|Kranich-Kür|Storch-Stomp|Specht-Beat
Krakenarme|Qualle-Disco|Seestern|Seepferdchen|Delfinsprung|Haifisch-Bar|Goldfisch|Kugelfisch|Krabben-Tanz|Hummer-Hustle
Discoschnecke|Turboschnecke|Glitzerschnecke|Partyschnecke|Schneckenrennen|Raupe Nimmersatt|Schmetterling|Glühwürmchen|Hummelflug|Marienkäfer
Partykracher|Stimmungskanone|Gute-Laune-Bombe|Laune-Laser|Grinsebacke|Lachflash|Kicherkönig|Kichererbse|Gackerhuhn|Lachmöwe
Pyjama-Party|Pantoffelheld|Sockenschuss|Glitzersocke|Discosocke|Kuschelsocke|Ringelsocke|Bommelmütze|Schlafmütze|Zipfelmütze
Gürtelschnalle|Lederjacke|Schlaghose|Plateauschuh|Glitzerhemd|Hawaiihemd|Leopardenmuster|Neonweste|Sonnenbrille-Nachts|Bauchtasche
Sonnenbrillen-Sven|Haargel-Held|Föhnfrisur|Vokuhila|Dauerwelle|Schnauzer-Style|Lockenkopf|Strubbelkopf|Igelfrisur|Zopfmuster
Nachtschicht|Morgengrauen|Sonnenaufgang|Dämmerung|Mitternacht|Geisterstunde|Halb Vier|Vier Uhr Früh|Letzte Runde Tanz|Zugabe
Zugabe-Rufer|Encore-Expertin|Lichtwunder|Lautstärke-Lord|Bassboost|Subwoofer|Lautsprecher|Megafon|Mikrofonständer|Kopfhörer
Vinyl-Vampir|Kassettenkind|Walkman|Mixtape|Schallplatte|Plattenkiste|Jukebox|Synthie-Pop|Eurodance|Neue Welle
Schlagerstar|Schlagerprinzessin|Technotante|Technoteddy|Housekatze|Hip-Hop-Hamster|Rockröhre|Punk-Pinguin|Pop-Prinzessin|Funk-Frosch
Polonaise-Profi|Macarena-Meister|Ententanz|Fliegerlied|Hände hoch|Arme hoch|Alle zusammen|Nochmal von vorn|Volle Kanne|Voll Karacho
Ohne Plan|Ohne Bremse|Mit Anlauf|Querfeldein|Kopfüber|Hals über Kopf|Wie ein Blitz|Wie ein Komet|Wie ein Tornado|Wie aufgezogen
Tornado-Tanz|Orkanböe|Gewitterwolke|Donnerwetter|Blitzableiter|Regenbogen|Nebelbank|Schneegestöber|Hitzewelle|Sonnenbrand
Hitzkopf|Feuerwerk|Wunderkerze|Knallfrosch|Böller-Baron|Raketenstart|Feuerwerkskörper|Funkenregen|Leuchtrakete|Glühbirne
Discoleuchte|Lavalampe|Lichterkette|Taschenlampe|Leuchtstab|Knicklicht|Neonröhre|Schwarzlicht|Spiegelkugel|Glitzerstaub
Schlummerlocke|Augenringe|Gähnkönig|Nickerchen|Powernap|Kaffeebohne|Espressokick|Energiebündel|Duracell-Hase|Flummi-Fritz
Tanzwütig|Hüpfwütig|Feierbiest|Tanzmaschine|Groovemaschine|Beatmaschine|Bassmaschine|Hüftmaschine|Shuffle-Shark|Twerk-Turtle
Grillmeister|Kochlöffel|Schneebesen|Pfannenwender|Topflappen|Eierkocher|Waffeleisen|Toastbrot|Sandwichkind|Mittelkind
Klassenclown|Hausmeister|Pausenclown|Streber-Tänzer|Nerd-Alarm|Brillenschlange|Bücherwurm|Mathe-Muffel|Physik-Phantom|Chemie-Chaot
Wackelkontakt|Kurzschluss|Stromausfall|Starkstrom|Wechselstrom|Akku-Leer|Akku-Voll|WLAN-Suchender|Funkloch|Ladekabel
Selfie-Sultan|Selfiestick|Filterqueen|Story-Spammer|Hashtag-Held|Like-Magnet|Follower-Fänger|Reel-Rebell|Emoji-Experte|Insta-Influenza
Zimtschnecke|Apfelstrudel|Bienenstich|Käsekuchen|Donauwellen-Diva|Schwarzwälder|Mohnschnecke|Berliner-Ballon|Krapfenkönig|Puderzucker
Pfefferminz|Brausebonbon|Zitronenfalter|Erdbeerfeld|Kirschkern|Pflaumenbaum|Apfelbäckchen|Bananenflanke|Kokosnuss|Ananas-Alarm
Mangoschnitte|Melonenkopf|Avocado-Kern|Gurkentruppe|Radieschen|Möhrchen|Kohlkopf|Rosenkohl|Brokkoli-Boss|Zucchini-Zauber
Glitzerglocke|Partyhut|Luftschlange|Luftballon|Konfettikanone|Tröte|Pappnase|Clownsnase|Schminkkoffer|Glitzerkleber
Geheimagent|Doppelagentin|Detektiv Disco|Inspektor Groove|Kommissar Bass|Spürnase|Schnüffler|Tarnkappe|Geheimtipp|Undercover-Tänzer
"""

PRE = ['Disco', 'Turbo', 'Glitzer', 'Konfetti', 'Neon', 'Bass', 'Groove', 'Funky', 'Laser', 'Nebel', 'Boogie', 'Party', 'Tanz', 'Hüpf',
       'Wackel', 'Kuschel', 'Mega', 'Ultra', 'Retro', 'Zappel', 'Techno', 'Polka', 'Samba', 'Limbo', 'Pogo', 'Rave', 'Funken', 'Sternen',
       'Gleis', 'Express', 'Bling', 'Shuffle', 'Mambo', 'Swing', 'Glamour', 'Pixel', 'Plüsch', 'Mondschein']
NOUN = ['Hamster', 'Pinguin', 'Lama', 'Alpaka', 'Faultier', 'Igel', 'Waschbär', 'Einhorn', 'Flamingo', 'Krake', 'Wombat', 'Otter',
        'Koala', 'Dackel', 'Mops', 'Erdmännchen', 'Qualle', 'Hummel', 'Giraffe', 'Toaster', 'Kartoffel', 'Brezel', 'Gurke', 'Nudel',
        'Waffel', 'Muffin', 'Keks', 'Pommes', 'Donut', 'Banane', 'Spätzle', 'Maultasche', 'Socke', 'Kaktus', 'Seehund', 'Biber',
        'Frosch', 'Eichhörnchen', 'Schildkröte', 'Pudel', 'Kugelfisch', 'Seepferdchen', 'Marienkäfer', 'Bratkartoffel', 'Kürbis']

# nie im Namen: Alkohol (User-Vorgabe) + Beleidigungsliste der App
DENY = re.compile(r'(bier|schnaps|bwein|bsekt|wodka|vodka|promille|pegel|kater|rausch|suff|sauf|besoffen|likör|cocktail|prost|shot|jägermeister|\bkorn\b|\brum\b|\bgin\b|whisky|blau\b|'
                  r'hurensohn|wichser|fotze|schlampe|nutte|missgeburt|spast|behindert|neger|kanake|schwuchtel|fick|nazi|hitler)', re.I)

# bewusst raus: Vornamen (könnten echte Personen treffen), Körper-/Brillen-Sprüche, versteckte Trink-Anspielungen
REMOVE = {'Sonnenbrillen-Sven', 'Raketenrudi', 'Alien-Anna', 'Pünktlich-Pauli', 'Igel-Igor', 'Flummi-Fritz', 'Brillenschlange',
          'Melonenkopf', 'Schwarzwälder', 'Haifisch-Bar', 'Letzte Runde Tanz', 'Volle Kanne', 'Hamsterbacke', 'Streber-Tänzer'}
FIX = {'Mitgröhler': 'Mitgröler'}
hand = [FIX.get(n.strip(), n.strip()) for line in HAND.strip().splitlines() for n in line.split('|') if n.strip() and n.strip() not in REMOVE]
names, seen = [], set()
def add(n):
    k = n.lower()
    if k in seen: return
    if not (2 <= len(n) <= 20): raise SystemExit('Länge: ' + n)
    if DENY.search(n): raise SystemExit('verboten: ' + n)
    seen.add(k); names.append(n)
for n in hand: add(n)
print('handgeschrieben:', len(names), file=sys.stderr)

rnd = random.Random(2410)
combos = [p + '-' + n for p in PRE for n in NOUN if len(p + '-' + n) <= 20]
rnd.shuffle(combos)
use = {}
for c in combos:
    if len(names) >= 1000: break
    p = c.split('-')[0]
    if use.get(p, 0) >= 16: continue      # kein Präfix zu oft
    before = len(names); add(c)
    if len(names) > before: use[p] = use.get(p, 0) + 1
if len(names) < 1000: raise SystemExit('zu wenige: %d' % len(names))
names.sort(key=lambda s: s.lower())

out = ("// 1000 Spaßnamen für die Anmeldung – werden zufällig vergeben, jeder nur einmal (Server prüft das).\n"
       "// Generiert mit server/scripts/gen-fun-names.py; nur jugendfreundliche Namen, keine Alkohol-Bezüge, max. 20 Zeichen.\n"
       "// Browser: window.ABFAHRT_NAMES · Server: require('…/fun-names.js')\n"
       "(function(n){ if (typeof module !== 'undefined' && module.exports) module.exports = n; else window.ABFAHRT_NAMES = n; })(" +
       json.dumps(names, ensure_ascii=False, indent=0).replace('\n', '') + ");\n")
io.open(sys.argv[1], 'w', encoding='utf-8', newline='\n').write(out)
print('gesamt:', len(names), file=sys.stderr)
