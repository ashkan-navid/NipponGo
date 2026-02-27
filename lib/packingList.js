'use client';

const PACKING_CATEGORIES = {
  documents: {
    label: 'Dokumente',
    icon: '📋',
    items: [
      'Reisepass (min. 6 Monate gültig)',
      'Flugtickets (Ausdruck + Digital)',
      'Hotelbuchungen (Bestätigungen)',
      'Reiseversicherung (Unterlagen)',
      'Internationaler Führerschein',
      'Impfpass / Gesundheitskarte',
      'Notfallkontakte (Liste)',
      'Japan Rail Pass (falls gekauft)',
      'Kopien aller wichtigen Dokumente',
      'Passfoto (für manche Pässe)',
    ]
  },
  clothing: {
    label: 'Kleidung',
    icon: '👔',
    items: [
      'Unterwäsche (7+ Tage)',
      'Socken (7+ Paar)',
      'T-Shirts / Oberteile',
      'Lange Hose / Jeans',
      'Kurze Hose / Rock',
      'Pullover / Jacke',
      'Regenjacke / Regenmantel',
      'Bequeme Wanderschuhe',
      'Flip-Flops / Sandalen (für Onsen)',
      'Schlafanzug',
      'Elegante Kleidung (gehobene Restaurants)',
    ]
  },
  electronics: {
    label: 'Elektronik',
    icon: '🔌',
    items: [
      'Smartphone + Ladekabel',
      'Powerbank (mind. 10.000 mAh)',
      'Reiseadapter (Typ A für Japan)',
      'Kopfhörer / Earbuds',
      'Kamera + Speicherkarten',
      'Kamera-Akku + Ladegerät',
      'E-Reader / Tablet',
      'Mehrfachsteckdose',
    ]
  },
  hygiene: {
    label: 'Hygiene',
    icon: '🧴',
    items: [
      'Zahnbürste + Zahnpasta',
      'Shampoo / Duschgel (Reisegröße)',
      'Deo',
      'Sonnencreme (SPF 50+)',
      'Rasierer',
      'Haarbürste / Kamm',
      'Handtücher (Mikrofaser)',
      'Feuchttücher',
      'Taschentücher',
      'Kontaktlinsen + Lösung',
    ]
  },
  medical: {
    label: 'Reiseapotheke',
    icon: '💊',
    items: [
      'Schmerzmittel (Ibuprofen, Paracetamol)',
      'Magen-Darm-Mittel',
      'Allergiemedikamente',
      'Pflaster + Verbandsmaterial',
      'Desinfektionsmittel',
      'Insektenschutzmittel',
      'Persönliche Medikamente (Vorrat + Rezept)',
      'Fieberthermometer',
      'Salbe gegen Mückenstiche',
      'Halstabletten',
    ]
  },
  misc: {
    label: 'Sonstiges',
    icon: '🎒',
    items: [
      'Rucksack / Tagesrucksack',
      'Wiederverwendbare Wasserflasche',
      'Reiseführer (Buch oder App)',
      'Notizbuch + Stift',
      'Sonnenbrille',
      'Regenschirm (faltbar)',
      'Plastiktüten / Beutel (für Schuhe)',
      'Wäschebeutel',
      'Reisekissen',
      'Schlafmaske + Ohrstöpsel',
      'Snacks für die Reise',
      'Kleine Geschenke (Omiyage)',
      'SIM-Karte / Pocket WiFi',
    ]
  }
};

export default PACKING_CATEGORIES;
