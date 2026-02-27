'use client';

export const COST_OVERVIEW = {
    food: {
        label: 'Essen & Trinken',
        icon: '🍜',
        items: [
            { name: 'Onigiri (Konbini)', jpy: '120–200', eur: '~0,80–1,30' },
            { name: 'Bento-Box (Konbini)', jpy: '400–700', eur: '~2,50–4,50' },
            { name: 'Ramen (Restaurant)', jpy: '800–1.200', eur: '~5–8' },
            { name: 'Sushi (Kaiten/Conveyor)', jpy: '1.000–2.500', eur: '~6–16' },
            { name: 'Sushi (gehoben)', jpy: '5.000–15.000', eur: '~32–96' },
            { name: 'Gyūdon (Yoshinoya etc.)', jpy: '400–600', eur: '~2,50–4' },
            { name: 'Kaffee (Konbini)', jpy: '100–150', eur: '~0,60–1' },
            { name: 'Kaffee (Café)', jpy: '400–700', eur: '~2,50–4,50' },
            { name: 'Flasche Wasser (Automat)', jpy: '100–130', eur: '~0,65–0,85' },
            { name: 'Bier (Konbini, 500ml)', jpy: '200–350', eur: '~1,30–2,25' },
        ],
    },
    transport: {
        label: 'Transport',
        icon: '🚄',
        items: [
            { name: 'U-Bahn (Kurzstrecke)', jpy: '170–200', eur: '~1,10–1,30' },
            { name: 'U-Bahn (Langstrecke)', jpy: '200–400', eur: '~1,30–2,60' },
            { name: 'Shinkansen (Tokyo→Osaka)', jpy: '~13.870', eur: '~89' },
            { name: 'JR Pass (7 Tage)', jpy: '~50.000', eur: '~320' },
            { name: 'Taxi (Grundgebühr)', jpy: '500–700', eur: '~3,20–4,50' },
            { name: 'Taxi (10 Min Fahrt)', jpy: '1.500–2.500', eur: '~10–16' },
            { name: 'Bus (Stadtbus)', jpy: '200–250', eur: '~1,30–1,60' },
            { name: 'IC-Karte (Suica/Pasmo)', jpy: '500 Pfand', eur: '~3,20 Pfand' },
        ],
    },
    accommodation: {
        label: 'Unterkunft (pro Nacht)',
        icon: '🏨',
        items: [
            { name: 'Capsule Hotel', jpy: '3.000–5.000', eur: '~19–32' },
            { name: 'Hostel (Dorm)', jpy: '2.500–4.500', eur: '~16–29' },
            { name: 'Business Hotel', jpy: '6.000–12.000', eur: '~39–77' },
            { name: 'Ryokan (einfach)', jpy: '8.000–15.000', eur: '~51–96' },
            { name: 'Ryokan (gehoben)', jpy: '20.000–50.000', eur: '~128–320' },
            { name: 'Mittelklasse-Hotel', jpy: '10.000–20.000', eur: '~64–128' },
        ],
    },
    activities: {
        label: 'Aktivitäten & Sonstiges',
        icon: '⛩️',
        items: [
            { name: 'Tempel-Eintritt', jpy: '300–1.000', eur: '~2–6,50' },
            { name: 'Museum-Eintritt', jpy: '500–2.000', eur: '~3,20–13' },
            { name: 'Onsen (öffentlich)', jpy: '500–1.500', eur: '~3,20–10' },
            { name: 'Schließfach (Bahnhof)', jpy: '300–700', eur: '~2–4,50' },
            { name: 'SIM-Karte (7 Tage)', jpy: '2.000–4.000', eur: '~13–26' },
            { name: 'Pocket WiFi (7 Tage)', jpy: '4.000–6.000', eur: '~26–39' },
        ],
    },
};

export const HOLIDAYS = [
    { date: '1. Januar', name: '元日 (Ganjitsu)', de: 'Neujahr', note: 'Wichtigster Feiertag. Geschäfte teils geschlossen, Tempel sehr voll.' },
    { date: '2. Montag im Januar', name: '成人の日 (Seijin no Hi)', de: 'Tag der Volljährigkeit', note: 'Feierlichkeiten für 20-Jährige. Kein großer Einfluss auf Touristen.' },
    { date: '11. Februar', name: '建国記念の日 (Kenkoku Kinen no Hi)', de: 'Tag der Staatsgründung', note: 'Normaler Feiertag, keine besonderen Einschränkungen.' },
    { date: '23. Februar', name: '天皇誕生日 (Tennō Tanjōbi)', de: 'Geburtstag des Kaisers', note: 'Kaiserpalast-Gärten öffentlich zugänglich.' },
    { date: '20./21. März', name: '春分の日 (Shunbun no Hi)', de: 'Frühlingsanfang', note: 'Beginn der Kirschblüten-Saison in Südwest-Japan.' },
    { date: '29. April', name: '昭和の日 (Shōwa no Hi)', de: 'Shōwa-Tag', note: '⚠️ Beginn der Goldenen Woche! Hotels & Züge sehr voll.' },
    { date: '3. Mai', name: '憲法記念日 (Kenpō Kinenbi)', de: 'Verfassungstag', note: '⚠️ Goldene Woche — Preise steigen, früh buchen!' },
    { date: '4. Mai', name: 'みどりの日 (Midori no Hi)', de: 'Tag des Grüns', note: '⚠️ Goldene Woche — Nationalparks besonders beliebt.' },
    { date: '5. Mai', name: 'こどもの日 (Kodomo no Hi)', de: 'Kindertag', note: '⚠️ Ende der Goldenen Woche. Koinobori (Karpfenfahnen) überall.' },
    { date: '3. Montag im Juli', name: '海の日 (Umi no Hi)', de: 'Tag des Meeres', note: 'Inoffizieller Sommerferienstart. Strände voll.' },
    { date: '11. August', name: '山の日 (Yama no Hi)', de: 'Tag der Berge', note: 'Gut für Wanderungen. Teil der Obon-Saison.' },
    { date: '13.–16. August', name: 'お盆 (Obon)', de: 'Obon-Festival', note: '⚠️ Kein offizieller Feiertag, aber Reisewelle! Züge & Flüge voll.' },
    { date: '3. Montag im September', name: '敬老の日 (Keirō no Hi)', de: 'Tag der Senioren', note: 'Normaler Feiertag.' },
    { date: '22./23. September', name: '秋分の日 (Shūbun no Hi)', de: 'Herbstanfang', note: 'Beginn der Herbstlaub-Saison in Nord-Japan.' },
    { date: '2. Montag im Oktober', name: 'スポーツの日 (Supōtsu no Hi)', de: 'Tag des Sports', note: 'Viele Sport-Events und Festivals.' },
    { date: '3. November', name: '文化の日 (Bunka no Hi)', de: 'Tag der Kultur', note: 'Museen teils kostenlos, Kunstfestivals.' },
    { date: '23. November', name: '勤労感謝の日 (Kinrō Kansha no Hi)', de: 'Tag der Arbeit', note: 'Herbstlaub-Saison in Kansai auf dem Höhepunkt.' },
    { date: '31. Dezember', name: '大晦日 (Ōmisoka)', de: 'Silvester', note: 'Tempelglocken schlagen 108 Mal. Soba-Nudeln essen als Tradition.' },
];

export const SEASONS = [
    { month: 'Jan', sakura: false, koyo: false, rainy: false, snow: true, temp: '2–10°C', tip: 'Winterschlussverkauf (Fukubukuro), Skigebiete offen' },
    { month: 'Feb', sakura: false, koyo: false, rainy: false, snow: true, temp: '3–11°C', tip: 'Schneefestival Sapporo, Pflaumblüte beginnt' },
    { month: 'Mär', sakura: true, koyo: false, rainy: false, snow: false, temp: '7–14°C', tip: '🌸 Kirschblüte im Süden (Kyūshū ab Ende März)' },
    { month: 'Apr', sakura: true, koyo: false, rainy: false, snow: false, temp: '12–19°C', tip: '🌸 Hauptsaison Kirschblüte (Tokyo, Kyoto)' },
    { month: 'Mai', sakura: false, koyo: false, rainy: false, snow: false, temp: '17–23°C', tip: '⚠️ Goldene Woche (29.4–5.5), danach ruhiger' },
    { month: 'Jun', sakura: false, koyo: false, rainy: true, snow: false, temp: '21–26°C', tip: '☔ Regenzeit (Tsuyu) — Regenschirm Pflicht!' },
    { month: 'Jul', sakura: false, koyo: false, rainy: true, snow: false, temp: '25–31°C', tip: 'Feuerwerk-Festivals (Hanabi Taikai), sehr schwül' },
    { month: 'Aug', sakura: false, koyo: false, rainy: false, snow: false, temp: '26–32°C', tip: 'Obon-Festival, Sommerferien — sehr heiß & voll' },
    { month: 'Sep', sakura: false, koyo: false, rainy: false, snow: false, temp: '22–28°C', tip: 'Taifun-Saison, aber angenehmer werdend' },
    { month: 'Okt', sakura: false, koyo: true, rainy: false, snow: false, temp: '16–22°C', tip: '🍁 Herbstlaub beginnt (Norden zuerst)' },
    { month: 'Nov', sakura: false, koyo: true, rainy: false, snow: false, temp: '10–17°C', tip: '🍁 Hauptsaison Herbstlaub (Kyoto, Nara)' },
    { month: 'Dez', sakura: false, koyo: false, rainy: false, snow: true, temp: '4–12°C', tip: 'Weihnachtsbeleuchtungen, Silvester-Traditionen' },
];

export const KONBINI_GUIDE = {
    intro: 'Japanische Konbinis (コンビニ) sind weit mehr als Kioske — sie sind Allround-Servicestationen mit erstaunlich gutem Essen.',
    chains: [
        { name: '7-Eleven', logo: '7️⃣', tip: '7-Bank ATM für internationale Kreditkarten!' },
        { name: 'Lawson', logo: '🏪', tip: 'Bekannt für Karaage-Kun (frittiertes Hähnchen)' },
        { name: 'FamilyMart', logo: '🏬', tip: 'Famichiki (frittiertes Hähnchen) ist legendär' },
    ],
    mustTry: [
        { name: 'Onigiri (おにぎり)', desc: 'Reisbällchen mit Füllung — ab ¥120', icon: '🍙' },
        { name: 'Bento-Box (弁当)', desc: 'Komplette Mahlzeit — ab ¥400', icon: '🍱' },
        { name: 'Sandwiches (サンド)', desc: 'Weich und frisch — besonders Ei-Sandwich', icon: '🥪' },
        { name: 'Nikuman (肉まん)', desc: 'Gedämpfte Fleischbrötchen (Winter)', icon: '🥟' },
        { name: 'Oden (おでん)', desc: 'Eintopf mit Fischkuchen, Ei, Rettich (Winter)', icon: '🍢' },
        { name: 'Melon Pan (メロンパン)', desc: 'Süßes Brötchen mit knuspriger Kruste', icon: '🍈' },
        { name: 'Matcha-Desserts', desc: 'Pudding, Mochi, Eis — saisonal wechselnd', icon: '🍵' },
        { name: 'Strong Zero', desc: 'Alkoholisches Mixgetränk — Kultgetränk', icon: '🍹' },
    ],
    services: [
        'Geldabheben (7-Bank ATM)',
        'Pakete versenden & empfangen',
        'Tickets drucken (Konzerte, Busse)',
        'Toilette (kostenlos!)',
        'Essen aufwärmen lassen',
        'Kopieren & Drucken',
        'Steuerfrei-Einkauf (Tax Free ab ¥5.000)',
    ],
};

export const USEFUL_APPS = [
    { name: 'Suica / PASMO', desc: 'IC-Karte für Züge, Busse und Konbini-Bezahlung', icon: '🚃', note: 'Apple Wallet oder Google Pay' },
    { name: 'Google Translate', desc: 'Kamera-Übersetzung für Schilder und Speisekarten', icon: '📸', note: 'Japanisch offline herunterladen!' },
    { name: 'Navitime / Jorudan', desc: 'Zug-Routing mit Umsteigeinfos und Kosten', icon: '🗺️', note: 'Essentiell für Zugfahrten' },
    { name: 'Tabelog', desc: 'Japanisches Restaurant-Bewertungsportal', icon: '🍽️', note: 'Besser als Google für lokale Empfehlungen' },
    { name: 'PayPay', desc: 'Beliebtes QR-Code-Bezahlsystem', icon: '💳', note: 'Nicht überall als Tourist nutzbar' },
    { name: 'Tenki.jp', desc: 'Detaillierte Japan-Wettervorhersage', icon: '🌤️', note: 'Genauer als internationale Wetter-Apps' },
];
