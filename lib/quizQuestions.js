/**
 * Japan Quiz — 30 multiple-choice questions across 5 categories.
 * Each question has a German question, 4 options, correct answer index, and an explanation.
 */

const QUIZ_QUESTIONS = [
    // -- Kultur & Tradition --
    {
        category: 'Kultur',
        question: 'Wie begrüßt man sich traditionell in Japan?',
        options: ['Handschlag', 'Verbeugung', 'Umarmung', 'Winken'],
        correct: 1,
        explanation: 'In Japan verbeugt man sich zur Begrüßung. Je tiefer die Verbeugung, desto mehr Respekt wird gezeigt.',
    },
    {
        category: 'Kultur',
        question: 'Was bedeutet „Omiyage"?',
        options: ['Gastgeschenk/Souvenir', 'Reispass', 'Bahnticket', 'Tempelbesuch'],
        correct: 0,
        explanation: 'Omiyage sind Mitbringsel, die man von Reisen für Freunde und Kollegen kauft — eine wichtige Tradition.',
    },
    {
        category: 'Kultur',
        question: 'Welches Fest wird am 3. März gefeiert?',
        options: ['Tanabata', 'Hinamatsuri', 'Obon', 'Shichi-Go-San'],
        correct: 1,
        explanation: 'Hinamatsuri (Puppenfest) am 3. März feiert Mädchen mit kunstvollen Puppen-Ausstellungen.',
    },
    {
        category: 'Kultur',
        question: 'Was ist ein „Torii"?',
        options: ['Ein Essstäbchen', 'Ein Schrein-Tor', 'Ein Sumo-Ring', 'Ein Kimono-Gürtel'],
        correct: 1,
        explanation: 'Torii sind die markanten roten Tore am Eingang von Shinto-Schreinen.',
    },
    {
        category: 'Kultur',
        question: 'Welche Blume ist das Symbol Japans?',
        options: ['Rose', 'Chrysantheme', 'Tulpe', 'Lilie'],
        correct: 1,
        explanation: 'Die 16-blättrige Chrysantheme ist das kaiserliche Siegel Japans.',
    },
    {
        category: 'Kultur',
        question: 'Was ist ein „Ryokan"?',
        options: ['Kampfsportart', 'Traditionelles Gasthaus', 'Kirschblüte', 'Bademantel'],
        correct: 1,
        explanation: 'Ein Ryokan ist ein traditionelles japanisches Gasthaus mit Tatami-Böden, Futon und Kaiseki-Essen.',
    },

    // -- Essen & Trinken --
    {
        category: 'Essen',
        question: 'Was darf man in Japan NICHT mit Stäbchen tun?',
        options: ['Nudeln schlürfen', 'Stäbchen in Reis stecken', 'Schüssel anheben', 'Suppe trinken'],
        correct: 1,
        explanation: 'Senkrecht im Reis steckende Stäbchen erinnern an ein buddhistisches Totenritual.',
    },
    {
        category: 'Essen',
        question: 'Was ist „Onigiri"?',
        options: ['Sushi-Rolle', 'Reisbällchen', 'Teigtasche', 'Nudelsuppe'],
        correct: 1,
        explanation: 'Onigiri sind dreieckige Reisbällchen, oft mit Füllung und Nori-Alge umwickelt.',
    },
    {
        category: 'Essen',
        question: 'Was bedeutet „Itadakimasu"?',
        options: ['Guten Appetit', 'Entschuldigung', 'Prost', 'Danke'],
        correct: 0,
        explanation: '„Itadakimasu" sagt man vor dem Essen — es drückt Dankbarkeit für die Mahlzeit aus.',
    },
    {
        category: 'Essen',
        question: 'Welches Getränk kommt aus Automaten in Japan?',
        options: ['Nur Wasser', 'Nur Cola', 'Fast alles – auch heißer Kaffee', 'Nur Tee'],
        correct: 2,
        explanation: 'Japans ~5,5 Millionen Automaten verkaufen alles: heiße/kalte Getränke, Suppen und sogar Speisen.',
    },
    {
        category: 'Essen',
        question: 'Was ist „Wagyu"?',
        options: ['Eine Nudel-Art', 'Japanisches Rindfleisch', 'Fermentierter Fisch', 'Meeresfrüchte-Mix'],
        correct: 1,
        explanation: 'Wagyu bezeichnet japanische Rinderrassen, berühmt für ihre Marmorierung und Zartheit.',
    },
    {
        category: 'Essen',
        question: 'Was sagt man NACH dem Essen?',
        options: ['Sayonara', 'Gochisousama deshita', 'Kampai', 'Sumimasen'],
        correct: 1,
        explanation: '„Gochisousama deshita" (es war ein Festmahl) bedankt sich nach dem Essen.',
    },

    // -- Transport --
    {
        category: 'Transport',
        question: 'Was ist ein „Shinkansen"?',
        options: ['Eine Fähre', 'Ein Hochgeschwindigkeitszug', 'Ein Taxi', 'Ein Flugzeug'],
        correct: 1,
        explanation: 'Shinkansen (Kugel-Züge) fahren bis zu 320 km/h und sind fast nie verspätet.',
    },
    {
        category: 'Transport',
        question: 'Was ist eine IC-Karte?',
        options: ['Nur Zufahrt zum Kino', 'Kontaktlose Bezahlkarte für ÖPNV', 'Visum', 'Museumskarte'],
        correct: 1,
        explanation: 'IC-Karten (Suica/PASMO) sind kontaktlose Karten für Bahn, Bus und sogar Einkäufe.',
    },
    {
        category: 'Transport',
        question: 'Wie lang ist die durchschnittliche Verspätung des Shinkansen pro Jahr?',
        options: ['30 Minuten', 'Unter 1 Minute', '10 Minuten', '5 Minuten'],
        correct: 1,
        explanation: 'Der Shinkansen hat eine durchschnittliche Verspätung von unter einer Minute — weltweit einzigartig.',
    },
    {
        category: 'Transport',
        question: 'Auf welcher Seite fährt man in Japan Auto?',
        options: ['Rechts', 'Links', 'Beide Seiten', 'Nur Autobahn rechts'],
        correct: 1,
        explanation: 'In Japan herrscht Linksverkehr — wie in Großbritannien.',
    },
    {
        category: 'Transport',
        question: 'Was ist ein „Ekiben"?',
        options: ['Bahnhofs-Bentobox', 'Fahrkarte', 'Wartesaal', 'Lokomotiven-Typ'],
        correct: 0,
        explanation: 'Ekiben sind regionale Bento-Boxen, die an Bahnhöfen verkauft werden — jede Region hat ihre eigene Spezialität.',
    },
    {
        category: 'Transport',
        question: 'Wie viele Fahrgäste nutzen täglich die Tokioter U-Bahn?',
        options: ['~1 Million', '~3,5 Millionen', '~8,7 Millionen', '~500.000'],
        correct: 2,
        explanation: 'Die Tokioter Metro befördert täglich über 8,7 Millionen Fahrgäste — die meisten weltweit.',
    },

    // -- Geografie --
    {
        category: 'Geografie',
        question: 'Aus wie vielen Hauptinseln besteht Japan?',
        options: ['2', '4', '6', '8'],
        correct: 1,
        explanation: 'Japan hat 4 Hauptinseln: Hokkaido, Honshu, Shikoku und Kyushu — plus tausende kleiner Inseln.',
    },
    {
        category: 'Geografie',
        question: 'Wie hoch ist der Fuji?',
        options: ['2.776m', '3.776m', '4.776m', '1.776m'],
        correct: 1,
        explanation: 'Der Fuji ist mit 3.776m der höchste Berg Japans und ein UNESCO-Weltkulturerbe.',
    },
    {
        category: 'Geografie',
        question: 'In welcher Zeitzone liegt Japan?',
        options: ['UTC+7', 'UTC+9', 'UTC+8', 'UTC+10'],
        correct: 1,
        explanation: 'Japan liegt in der Zeitzone UTC+9 (JST) — es gibt keine Sommer-/Winterzeitumstellung.',
    },
    {
        category: 'Geografie',
        question: 'Welche Stadt war vor Tokyo die Hauptstadt?',
        options: ['Osaka', 'Kyoto', 'Nara', 'Hiroshima'],
        correct: 1,
        explanation: 'Kyoto war über 1.000 Jahre lang (794-1868) die Hauptstadt Japans.',
    },
    {
        category: 'Geografie',
        question: 'Wie viele aktive Vulkane hat Japan?',
        options: ['~10', '~50', '~111', '~200'],
        correct: 2,
        explanation: 'Japan hat etwa 111 aktive Vulkane — es liegt auf dem pazifischen Feuerring.',
    },
    {
        category: 'Geografie',
        question: 'Was ist die größte Insel Japans?',
        options: ['Hokkaido', 'Honshu', 'Kyushu', 'Shikoku'],
        correct: 1,
        explanation: 'Honshu ist die größte Insel und beherbergt Tokyo, Osaka und Kyoto.',
    },

    // -- Reisetipps --
    {
        category: 'Reisetipps',
        question: 'Gibt man in Japan Trinkgeld?',
        options: ['Ja, immer 15%', 'Nein, es ist unhöflich', 'Nur im Hotel', 'Nur bei Taxifahrten'],
        correct: 1,
        explanation: 'In Japan gilt Trinkgeld als unhöflich — der Service ist bereits im Preis inbegriffen.',
    },
    {
        category: 'Reisetipps',
        question: 'Was findet man in jedem Konbini?',
        options: ['Nur Süßigkeiten', 'Geldautomat, warmes Essen & Toilette', 'Nur Zeitungen', 'Nur Getränke'],
        correct: 1,
        explanation: 'Konbinis (7-Eleven, Lawson, FamilyMart) bieten ATMs, Essen, Toiletten, Druckservice und mehr — 24/7.',
    },
    {
        category: 'Reisetipps',
        question: 'Was sollte man vor dem Betreten eines japanischen Hauses tun?',
        options: ['Klopfen', 'Schuhe ausziehen', 'Sich verbeugen', 'Hut abnehmen'],
        correct: 1,
        explanation: 'Schuhe werden im genkan (Eingangsbereich) ausgezogen — ein absolutes Muss.',
    },
    {
        category: 'Reisetipps',
        question: 'Wann ist die Kirschblüte (Sakura) normalerweise?',
        options: ['Januar-Februar', 'März-April', 'Juli-August', 'Oktober-November'],
        correct: 1,
        explanation: 'Die Kirschblüte ist typischerweise Ende März bis Mitte April — die beliebteste Reisezeit.',
    },
    {
        category: 'Reisetipps',
        question: 'Welche Notruf-Nummer gilt in Japan für die Polizei?',
        options: ['119', '110', '112', '911'],
        correct: 1,
        explanation: 'Polizei: 110, Feuerwehr/Rettung: 119. Beide sind kostenlos auch vom Handy erreichbar.',
    },
    {
        category: 'Reisetipps',
        question: 'Was ist ein „Pocket WiFi"?',
        options: ['Kostenloses Café-WLAN', 'Mobiler WLAN-Router zum Mieten', 'App-Name', 'Hotelzimmer-Service'],
        correct: 1,
        explanation: 'Pocket WiFi ist ein tragbarer Router, den man am Flughafen mieten kann — sehr beliebt bei Touristen.',
    },
];

export default QUIZ_QUESTIONS;
