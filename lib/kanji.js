'use client';

const KANJI_CATEGORIES = {
    navigation: {
        label: 'Orientierung',
        icon: '🧭',
        items: [
            { kanji: '入口', reading: 'いりぐち', romaji: 'Iriguchi', de: 'Eingang' },
            { kanji: '出口', reading: 'でぐち', romaji: 'Deguchi', de: 'Ausgang' },
            { kanji: '北', reading: 'きた', romaji: 'Kita', de: 'Norden' },
            { kanji: '南', reading: 'みなみ', romaji: 'Minami', de: 'Süden' },
            { kanji: '東', reading: 'ひがし', romaji: 'Higashi', de: 'Osten' },
            { kanji: '西', reading: 'にし', romaji: 'Nishi', de: 'Westen' },
            { kanji: '右', reading: 'みぎ', romaji: 'Migi', de: 'Rechts' },
            { kanji: '左', reading: 'ひだり', romaji: 'Hidari', de: 'Links' },
        ],
    },
    signs: {
        label: 'Schilder',
        icon: '🪧',
        items: [
            { kanji: '禁煙', reading: 'きんえん', romaji: 'Kin\'en', de: 'Rauchen verboten' },
            { kanji: '危険', reading: 'きけん', romaji: 'Kiken', de: 'Gefahr' },
            { kanji: '注意', reading: 'ちゅうい', romaji: 'Chūi', de: 'Achtung / Vorsicht' },
            { kanji: '立入禁止', reading: 'たちいりきんし', romaji: 'Tachiiri kinshi', de: 'Kein Zutritt' },
            { kanji: '押', reading: 'おす', romaji: 'Osu', de: 'Drücken (Tür)' },
            { kanji: '引', reading: 'ひく', romaji: 'Hiku', de: 'Ziehen (Tür)' },
            { kanji: '無料', reading: 'むりょう', romaji: 'Muryō', de: 'Kostenlos / Gratis' },
            { kanji: '有料', reading: 'ゆうりょう', romaji: 'Yūryō', de: 'Kostenpflichtig' },
        ],
    },
    facilities: {
        label: 'Einrichtungen',
        icon: '🏢',
        items: [
            { kanji: '駅', reading: 'えき', romaji: 'Eki', de: 'Bahnhof' },
            { kanji: '空港', reading: 'くうこう', romaji: 'Kūkō', de: 'Flughafen' },
            { kanji: '病院', reading: 'びょういん', romaji: 'Byōin', de: 'Krankenhaus' },
            { kanji: '銀行', reading: 'ぎんこう', romaji: 'Ginkō', de: 'Bank' },
            { kanji: '郵便局', reading: 'ゆうびんきょく', romaji: 'Yūbinkyoku', de: 'Postamt' },
            { kanji: '交番', reading: 'こうばん', romaji: 'Kōban', de: 'Polizeiposten' },
            { kanji: '薬局', reading: 'やっきょく', romaji: 'Yakkyoku', de: 'Apotheke' },
        ],
    },
    people: {
        label: 'Personen',
        icon: '👤',
        items: [
            { kanji: '男', reading: 'おとこ', romaji: 'Otoko', de: 'Mann / Herren (WC)' },
            { kanji: '女', reading: 'おんな', romaji: 'Onna', de: 'Frau / Damen (WC)' },
            { kanji: '大人', reading: 'おとな', romaji: 'Otona', de: 'Erwachsener' },
            { kanji: '子供', reading: 'こども', romaji: 'Kodomo', de: 'Kind' },
            { kanji: '外国人', reading: 'がいこくじん', romaji: 'Gaikokujin', de: 'Ausländer' },
        ],
    },
    food: {
        label: 'Essen',
        icon: '🍱',
        items: [
            { kanji: '食', reading: 'しょく', romaji: 'Shoku', de: 'Essen / Mahlzeit' },
            { kanji: '飲', reading: 'のむ', romaji: 'Nomu', de: 'Trinken' },
            { kanji: '肉', reading: 'にく', romaji: 'Niku', de: 'Fleisch' },
            { kanji: '魚', reading: 'さかな', romaji: 'Sakana', de: 'Fisch' },
            { kanji: '水', reading: 'みず', romaji: 'Mizu', de: 'Wasser' },
            { kanji: '茶', reading: 'ちゃ', romaji: 'Cha', de: 'Tee' },
        ],
    },
};

export default KANJI_CATEGORIES;
