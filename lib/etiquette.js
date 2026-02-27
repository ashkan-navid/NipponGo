'use client';

const ETIQUETTE_SECTIONS = {
  onsen: {
    title: 'Onsen & Sento',
    subtitle: '温泉・銭湯',
    icon: '♨️',
    color: 'red',
    intro: 'Japanische Badekultur hat strenge, aber einfache Regeln.',
    rules: [
      {
        do: 'Komplett ausziehen — Onsen sind Nacktbäder',
        dont: 'Badekleidung tragen',
      },
      {
        do: 'Gründlich waschen BEVOR du ins Becken steigst',
        dont: 'Ungewaschen ins gemeinsame Becken gehen',
      },
      {
        do: 'Kleines Handtuch außerhalb des Beckens lassen oder auf dem Kopf balancieren',
        dont: 'Handtuch ins Wasser tauchen',
      },
      {
        do: 'Tattoos abdecken oder privates Onsen buchen',
        dont: 'Tattoos offen zeigen (viele Onsen verbieten sie)',
      },
      {
        do: 'Leise sein und die Ruhe genießen',
        dont: 'Laut reden, planschen oder Musik hören',
      },
    ],
  },
  subway: {
    title: 'U-Bahn & Zug',
    subtitle: '電車',
    icon: '🚇',
    color: 'blue',
    intro: 'Züge in Japan sind pünktlich, sauber und leise — das wird auch von Fahrgästen erwartet.',
    rules: [
      {
        do: 'Auf den markierten Linien am Boden anstellen',
        dont: 'Sich vordrängeln oder neben der Markierung stehen',
      },
      {
        do: 'Erst aussteigen lassen, dann einsteigen',
        dont: 'Gleichzeitig ein- und aussteigen',
      },
      {
        do: 'Handy auf lautlos stellen (マナーモード)',
        dont: 'Telefonieren oder laut Musik hören',
      },
      {
        do: 'Rucksack abnehmen und vor dir halten',
        dont: 'Rucksack auf dem Rücken lassen',
      },
      {
        do: 'Priority Seats für Ältere, Schwangere und Menschen mit Behinderung freihalten',
        dont: 'Priority Seats einfach besetzen',
      },
      {
        do: 'Leise sprechen',
        dont: 'Laute Gespräche führen',
      },
    ],
  },
  dining: {
    title: 'Restaurant & Essen',
    subtitle: '食事',
    icon: '🍜',
    color: 'orange',
    intro: 'Essen hat in Japan eine tiefe kulturelle Bedeutung. Diese Regeln zeigen Respekt.',
    rules: [
      {
        do: '„Itadakimasu" (いただきます) vor dem Essen sagen',
        dont: 'Sofort anfangen ohne Dankbarkeit zu zeigen',
      },
      {
        do: '„Gochisousama deshita" (ごちそうさまでした) nach dem Essen sagen',
        dont: 'Einfach aufstehen und gehen',
      },
      {
        do: 'Schüssel zum Mund führen (bei Reis und Suppe)',
        dont: 'Sich tief über den Teller beugen',
      },
      {
        do: 'Nudelsuppe ruhig schlürfen — das zeigt Genuss!',
        dont: 'Leise essen (wird teils als unhöflich empfunden)',
      },
      {
        do: 'Stäbchen auf dem Stäbchenhalter (箸置き) ablegen',
        dont: 'Stäbchen aufrecht in den Reis stecken (Totenritual!)',
      },
      {
        do: 'Kein Trinkgeld geben — es wird nicht erwartet',
        dont: 'Trinkgeld auf dem Tisch lassen (kann als Beleidigung wirken)',
      },
      {
        do: 'An der Kasse oder am Automaten zahlen',
        dont: 'Geld direkt dem Kellner in die Hand drücken',
      },
    ],
  },
  temples: {
    title: 'Tempel & Schreine',
    subtitle: '寺・神社',
    icon: '⛩️',
    color: 'purple',
    intro: 'Tempel (buddhistisch) und Schreine (shintoistisch) sind heilige Orte mit klaren Verhaltensregeln.',
    rules: [
      {
        do: 'Am Torii (Eingangstor) leicht verbeugen',
        dont: 'Einfach durchlaufen ohne Respekt zu zeigen',
      },
      {
        do: 'Am Reinigungsbrunnen (Temizuya) Hände und Mund waschen',
        dont: 'Das Reinigungsritual überspringen',
      },
      {
        do: 'Leise sein und sich respektvoll verhalten',
        dont: 'Laut reden, rennen oder herumalbern',
      },
      {
        do: 'Schuhe ausziehen, wo Schilder es verlangen',
        dont: 'Mit Schuhen in Gebetsräume gehen',
      },
      {
        do: 'Schilder bezüglich Fotografie beachten',
        dont: 'In Gebetsräumen oder bei Zeremonien fotografieren',
      },
    ],
  },
  general: {
    title: 'Allgemeine Verhaltensregeln',
    subtitle: 'マナー',
    icon: '🙇',
    color: 'green',
    intro: 'Diese allgemeinen Regeln helfen dir, respektvoll und höflich durchs Land zu reisen.',
    rules: [
      {
        do: 'Schuhe ausziehen beim Betreten von Häusern, Ryokans und manchen Restaurants',
        dont: 'Mit Straßenschuhen auf Tatami-Matten treten',
      },
      {
        do: 'Müll mitnehmen — es gibt kaum öffentliche Mülleimer',
        dont: 'Müll auf der Straße oder in Parks liegen lassen',
      },
      {
        do: 'In der Öffentlichkeit leise sein',
        dont: 'Laut telefonieren oder sprechen',
      },
      {
        do: 'Visitenkarten mit beiden Händen annehmen und respektvoll lesen',
        dont: 'Visitenkarten achtlos in die Hosentasche stecken',
      },
      {
        do: 'Leicht verbeugen zur Begrüßung — eine Verbeugung reicht',
        dont: 'Händeschütteln erzwingen (nur wenn angeboten)',
      },
      {
        do: 'Im Gehen rechts bleiben, auf Rolltreppen links stehen (Osaka: rechts)',
        dont: 'Mitten auf dem Gehweg stehen bleiben',
      },
      {
        do: 'Nase leise putzen oder dafür auf die Toilette gehen',
        dont: 'Laut und öffentlich die Nase schnäuzen',
      },
    ],
  },
  ryokan: {
    title: 'Ryokan & Tatami',
    subtitle: '旅館',
    icon: '🏠',
    color: 'orange',
    intro: 'Ryokans sind traditionelle japanische Gasthäuser mit besonderen Verhaltensregeln.',
    rules: [
      {
        do: 'Schuhe am Eingang ausziehen und in die bereitgestellten Hausschuhe schlüpfen',
        dont: 'Mit (Haus-)Schuhen auf Tatami-Matten treten — Tatami nur barfuß oder mit Socken',
      },
      {
        do: 'Den bereitgestellten Yukata (浴衣) tragen — auch zum Abendessen und Frühstück',
        dont: 'Den Yukata mit dem linken Seite unter dem rechten schließen (das ist für Verstorbene)',
      },
      {
        do: 'Das Futon nach dem Schlafen ordentlich zusammenlegen oder liegen lassen',
        dont: 'Essen im Zimmer bestellen, wenn es nicht angeboten wird',
      },
      {
        do: 'Das Kaiseki-Abendessen (会席) genießen und probieren',
        dont: 'Sich beschweren, wenn die Portionen ungewohnt sind — es sind viele Gänge',
      },
      {
        do: 'Pünktlich zu den Mahlzeiten erscheinen (Zeiten werden beim Check-in mitgeteilt)',
        dont: 'Zu spät kommen — die Küche bereitet alles frisch vor',
      },
    ],
  },
  izakaya: {
    title: 'Izakaya & Bar',
    subtitle: '居酒屋',
    icon: '🍶',
    color: 'purple',
    intro: 'Izakayas sind japanische Kneipen — gesellig, laut und voller ungeschriebener Regeln.',
    rules: [
      {
        do: '„Kanpai!" (乾杯) rufen, bevor alle trinken',
        dont: 'Alleine trinken, bevor alle angestoßen haben',
      },
      {
        do: 'Beim Nachschenken zuerst anderen einschenken — nie dir selbst zuerst',
        dont: 'Dir selbst Bier/Sake nachschenken (andere werden es für dich tun)',
      },
      {
        do: 'Gerichte zum Teilen bestellen — Izakaya ist Gruppenessen',
        dont: 'Nur für dich selbst bestellen ohne die Gruppe zu fragen',
      },
      {
        do: 'Am Ende „Otsukaresama deshita" (お疲れ様でした) sagen',
        dont: 'Ohne Verabschiedung gehen',
      },
      {
        do: 'Mit dem „Otoshi" (お通し) rechnen — ein kleines Pflichtgericht als Couvert',
        dont: 'Den Otoshi zurückschicken (ist Teil der Rechnung und nicht optional)',
      },
    ],
  },
  photography: {
    title: 'Fotografieren',
    subtitle: '写真撮影',
    icon: '📸',
    color: 'blue',
    intro: 'Japan ist fotogen, aber es gibt wichtige Regeln beim Fotografieren.',
    rules: [
      {
        do: 'Vor dem Fotografieren von Personen um Erlaubnis fragen',
        dont: 'Geisha, Maiko oder Fremde ohne Erlaubnis fotografieren',
      },
      {
        do: 'Verbotsschilder (撮影禁止) beachten — besonders in Tempeln und Museen',
        dont: 'In Gebetsräumen, bei Zeremonien oder mit Blitz in Museen fotografieren',
      },
      {
        do: 'Bei Straßenfotografie diskret sein und den Verkehr nicht blockieren',
        dont: 'Mitten auf der Straße oder auf Bahngleisen für Fotos stehen bleiben',
      },
      {
        do: 'In Onsen und Umkleiden das Handy komplett wegpacken',
        dont: 'In Badebereichen das Handy auch nur in der Hand halten (Kameraverdacht)',
      },
    ],
  },
};

export default ETIQUETTE_SECTIONS;
