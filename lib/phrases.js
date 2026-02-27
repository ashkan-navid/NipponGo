'use client';

// Shared phrasebook data used by Phrasebook.jsx and GlobalSearch.jsx
const PHRASES = {
    greetings: {
        label: 'Begrüßung',
        icon: '👋',
        items: [
            { de: 'Hallo / Guten Tag', jp: 'こんにちは', romaji: 'Konnichiwa' },
            { de: 'Guten Morgen', jp: 'おはようございます', romaji: 'Ohayou gozaimasu' },
            { de: 'Guten Abend', jp: 'こんばんは', romaji: 'Konbanwa' },
            { de: 'Gute Nacht', jp: 'おやすみなさい', romaji: 'Oyasumi nasai' },
            { de: 'Auf Wiedersehen', jp: 'さようなら', romaji: 'Sayounara' },
            { de: 'Bis später', jp: 'またね', romaji: 'Mata ne' },
            { de: 'Willkommen', jp: 'ようこそ', romaji: 'Youkoso' },
            { de: 'Lange nicht gesehen', jp: 'お久しぶりです', romaji: 'Ohisashiburi desu' },
        ]
    },
    basics: {
        label: 'Basis',
        icon: '✨',
        items: [
            { de: 'Ja', jp: 'はい', romaji: 'Hai' },
            { de: 'Nein', jp: 'いいえ', romaji: 'Iie' },
            { de: 'Danke', jp: 'ありがとうございます', romaji: 'Arigatou gozaimasu' },
            { de: 'Vielen Dank', jp: 'どうもありがとう', romaji: 'Doumo arigatou' },
            { de: 'Bitte (Gern geschehen)', jp: 'どういたしまして', romaji: 'Douitashimashite' },
            { de: 'Entschuldigung', jp: 'すみません', romaji: 'Sumimasen' },
            { de: 'Es tut mir leid', jp: 'ごめんなさい', romaji: 'Gomen nasai' },
            { de: 'Ich verstehe nicht', jp: 'わかりません', romaji: 'Wakarimasen' },
            { de: 'Ich verstehe', jp: 'わかりました', romaji: 'Wakarimashita' },
            { de: 'Sprechen Sie Englisch?', jp: '英語を話せますか？', romaji: 'Eigo o hanasemasuka?' },
        ]
    },
    restaurant: {
        label: 'Restaurant',
        icon: '🍜',
        items: [
            { de: 'Einen Tisch für zwei, bitte', jp: '二名です', romaji: 'Ni-mei desu' },
            { de: 'Speisekarte, bitte', jp: 'メニューをお願いします', romaji: 'Menyuu o onegaishimasu' },
            { de: 'Das hier, bitte', jp: 'これをください', romaji: 'Kore o kudasai' },
            { de: 'Wasser, bitte', jp: 'お水をお願いします', romaji: 'Omizu o onegaishimasu' },
            { de: 'Es war lecker', jp: 'ごちそうさまでした', romaji: 'Gochisousama deshita' },
            { de: 'Rechnung, bitte', jp: 'お会計をお願いします', romaji: 'Okaikei o onegaishimasu' },
            { de: 'Empfehlung?', jp: 'おすすめは何ですか？', romaji: 'Osusume wa nan desu ka?' },
            { de: 'Ich bin allergisch gegen...', jp: '...アレルギーがあります', romaji: '...arerugii ga arimasu' },
            { de: 'Vegetarisch', jp: 'ベジタリアン', romaji: 'Bejitarian' },
            { de: 'Wie viel kostet das?', jp: 'いくらですか？', romaji: 'Ikura desu ka?' },
        ]
    },
    hotel: {
        label: 'Hotel',
        icon: '🏨',
        items: [
            { de: 'Ich habe eine Reservierung', jp: '予約があります', romaji: 'Yoyaku ga arimasu' },
            { de: 'Einchecken, bitte', jp: 'チェックインお願いします', romaji: 'Chekkuin onegaishimasu' },
            { de: 'Auschecken, bitte', jp: 'チェックアウトお願いします', romaji: 'Chekkuauto onegaishimasu' },
            { de: 'Wo ist der Aufzug?', jp: 'エレベーターはどこですか？', romaji: 'Erebeetaa wa doko desu ka?' },
            { de: 'Gibt es WLAN?', jp: 'Wi-Fiはありますか？', romaji: 'Waifai wa arimasu ka?' },
            { de: 'Können Sie ein Taxi rufen?', jp: 'タクシーを呼んでもらえますか？', romaji: 'Takushii o yonde moraemasu ka?' },
            { de: 'Gepäck aufbewahren?', jp: '荷物を預けてもいいですか？', romaji: 'Nimotsu o azukete mo ii desu ka?' },
        ]
    },
    shopping: {
        label: 'Einkaufen',
        icon: '🛍️',
        items: [
            { de: 'Ich schaue nur', jp: '見ているだけです', romaji: 'Miteiru dake desu' },
            { de: 'Haben Sie das in einer anderen Größe?', jp: '他のサイズはありますか？', romaji: 'Hoka no saizu wa arimasu ka?' },
            { de: 'Kann ich mit Karte bezahlen?', jp: 'カードで払えますか？', romaji: 'Kaado de haraemasu ka?' },
            { de: 'Das nehme ich', jp: 'これにします', romaji: 'Kore ni shimasu' },
            { de: 'Gibt es das günstiger?', jp: 'もう少し安くなりますか？', romaji: 'Mou sukoshi yasuku narimasu ka?' },
            { de: 'Tüte, bitte', jp: '袋をください', romaji: 'Fukuro o kudasai' },
            { de: 'Steuerfrei?', jp: '免税できますか？', romaji: 'Menzei dekimasu ka?' },
        ]
    },
    transport: {
        label: 'Unterwegs',
        icon: '🚄',
        items: [
            { de: 'Wo ist der Bahnhof?', jp: '駅はどこですか？', romaji: 'Eki wa doko desu ka?' },
            { de: 'Wo ist die Toilette?', jp: 'トイレはどこですか？', romaji: 'Toire wa doko desu ka?' },
            { de: 'Hält dieser Zug in …?', jp: 'この電車は…に止まりますか？', romaji: 'Kono densha wa … ni tomarimasu ka?' },
            { de: 'Wie viel kostet das?', jp: 'いくらですか？', romaji: 'Ikura desu ka?' },
            { de: 'Nächste Haltestelle?', jp: '次の停留所はどこですか？', romaji: 'Tsugi no teiryuujo wa doko desu ka?' },
            { de: 'Eine Fahrkarte nach …, bitte', jp: '…までの切符をください', romaji: '… made no kippu o kudasai' },
            { de: 'Welcher Bahnsteig?', jp: '何番線ですか？', romaji: 'Nanban-sen desu ka?' },
            { de: 'Ist dieser Platz frei?', jp: 'この席は空いていますか？', romaji: 'Kono seki wa aiteimasu ka?' },
        ]
    },
    directions: {
        label: 'Orientierung',
        icon: '📍',
        items: [
            { de: 'Wo ist …?', jp: '…はどこですか？', romaji: '… wa doko desu ka?' },
            { de: 'Links', jp: '左', romaji: 'Hidari' },
            { de: 'Rechts', jp: '右', romaji: 'Migi' },
            { de: 'Geradeaus', jp: 'まっすぐ', romaji: 'Massugu' },
            { de: 'Ist es weit von hier?', jp: 'ここから遠いですか？', romaji: 'Koko kara tooi desu ka?' },
            { de: 'Können Sie mir den Weg zeigen?', jp: '道を教えてもらえますか？', romaji: 'Michi o oshiete moraemasu ka?' },
            { de: 'Ich habe mich verlaufen', jp: '道に迷いました', romaji: 'Michi ni mayoimashita' },
        ]
    },
    numbers: {
        label: 'Zahlen',
        icon: '🔢',
        items: [
            { de: 'Eins', jp: '一 (いち)', romaji: 'Ichi' },
            { de: 'Zwei', jp: '二 (に)', romaji: 'Ni' },
            { de: 'Drei', jp: '三 (さん)', romaji: 'San' },
            { de: 'Vier', jp: '四 (よん)', romaji: 'Yon' },
            { de: 'Fünf', jp: '五 (ご)', romaji: 'Go' },
            { de: 'Sechs', jp: '六 (ろく)', romaji: 'Roku' },
            { de: 'Sieben', jp: '七 (なな)', romaji: 'Nana' },
            { de: 'Acht', jp: '八 (はち)', romaji: 'Hachi' },
            { de: 'Neun', jp: '九 (きゅう)', romaji: 'Kyuu' },
            { de: 'Zehn', jp: '十 (じゅう)', romaji: 'Juu' },
        ]
    },
    emergency: {
        label: 'Notfall',
        icon: '🚨',
        items: [
            { de: 'Hilfe!', jp: '助けて！', romaji: 'Tasukete!' },
            { de: 'Polizei', jp: '警察', romaji: 'Keisatsu' },
            { de: 'Krankenwagen', jp: '救急車', romaji: 'Kyuukyuusha' },
            { de: 'Ich habe meinen Pass verloren', jp: 'パスポートをなくしました', romaji: 'Pasupooto o nakushimashita' },
            { de: 'Ich brauche einen Arzt', jp: '医者が必要です', romaji: 'Isha ga hitsuyou desu' },
            { de: 'Krankenhaus', jp: '病院', romaji: 'Byouin' },
            { de: 'Ich fühle mich nicht gut', jp: '気分が悪いです', romaji: 'Kibun ga warui desu' },
        ]
    },
    medical: {
        label: 'Arzt & Apotheke',
        icon: '🏥',
        items: [
            { de: 'Wo ist die nächste Apotheke?', jp: '一番近い薬局はどこですか？', romaji: 'Ichiban chikai yakkyoku wa doko desu ka?' },
            { de: 'Ich habe Kopfschmerzen', jp: '頭が痛いです', romaji: 'Atama ga itai desu' },
            { de: 'Ich habe Bauchschmerzen', jp: 'お腹が痛いです', romaji: 'Onaka ga itai desu' },
            { de: 'Ich habe Fieber', jp: '熱があります', romaji: 'Netsu ga arimasu' },
            { de: 'Ich bin erkältet', jp: '風邪をひきました', romaji: 'Kaze o hikimashita' },
            { de: 'Haben Sie Medikamente gegen...?', jp: '...の薬はありますか？', romaji: '...no kusuri wa arimasu ka?' },
            { de: 'Ich bin allergisch gegen...', jp: '...アレルギーがあります', romaji: '...arerugī ga arimasu' },
            { de: 'Versicherungskarte', jp: '保険証', romaji: 'Hokenshō' },
        ]
    },
    konbini: {
        label: 'Konbini',
        icon: '🏪',
        items: [
            { de: 'Bitte aufwärmen', jp: '温めてください', romaji: 'Atatamete kudasai' },
            { de: 'Stäbchen, bitte', jp: 'お箸をください', romaji: 'Ohashi o kudasai' },
            { de: 'Tüte, bitte', jp: '袋をお願いします', romaji: 'Fukuro o onegaishimasu' },
            { de: 'Kann ich mit IC-Karte bezahlen?', jp: 'ICカードで払えますか？', romaji: 'IC kaado de haraemasu ka?' },
            { de: 'Quittung ist nicht nötig', jp: 'レシートは大丈夫です', romaji: 'Reshīto wa daijōbu desu' },
            { de: 'Toilette?', jp: 'トイレはどこですか？', romaji: 'Toire wa doko desu ka?' },
        ]
    },
};

export default PHRASES;
