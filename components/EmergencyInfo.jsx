'use client';

import { useState } from 'react';
import { Phone, Copy, Check, MapPin, Smartphone, ExternalLink } from 'lucide-react';
import { USEFUL_APPS } from '../lib/japanInfo';

const EMERGENCY_NUMBERS = [
    { number: '110', label: 'Polizei (警察)', icon: '🚔', color: 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400', desc: 'Diebstahl, Überfall, Verkehrsunfall' },
    { number: '119', label: 'Feuerwehr & Krankenwagen (消防・救急)', icon: '🚑', color: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400', desc: 'Feuer, medizinischer Notfall' },
    { number: '118', label: 'Küstenwache (海上保安庁)', icon: '⚓', color: 'bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400', desc: 'Notfall auf See' },
];

const EMBASSIES = [
    { country: '🇩🇪 Deutschland', name: 'Deutsche Botschaft Tokyo', phone: '+81-3-5791-7700', address: '4-5-10 Minami-Azabu, Minato-ku, Tokyo' },
    { country: '🇦🇹 Österreich', name: 'Österreichische Botschaft Tokyo', phone: '+81-3-3451-8281', address: '1-1-20 Moto-Azabu, Minato-ku, Tokyo' },
    { country: '🇨🇭 Schweiz', name: 'Schweizer Botschaft Tokyo', phone: '+81-3-5449-8400', address: '5-9-12 Minami-Azabu, Minato-ku, Tokyo' },
];

const EMERGENCY_PHRASES = [
    { de: 'Hilfe!', jp: '助けて！', romaji: 'Tasukete!' },
    { de: 'Rufen Sie die Polizei!', jp: '警察を呼んでください！', romaji: 'Keisatsu o yonde kudasai!' },
    { de: 'Rufen Sie einen Krankenwagen!', jp: '救急車を呼んでください！', romaji: 'Kyūkyūsha o yonde kudasai!' },
    { de: 'Ich brauche einen Arzt', jp: '医者が必要です', romaji: 'Isha ga hitsuyō desu' },
    { de: 'Ich fühle mich nicht gut', jp: '気分が悪いです', romaji: 'Kibun ga warui desu' },
    { de: 'Wo ist die nächste Apotheke?', jp: '一番近い薬局はどこですか？', romaji: 'Ichiban chikai yakkyoku wa doko desu ka?' },
    { de: 'Ich habe meinen Pass verloren', jp: 'パスポートをなくしました', romaji: 'Pasupōto o nakushimashita' },
    { de: 'Ich bin allergisch gegen...', jp: '...アレルギーがあります', romaji: '...arerugī ga arimasu' },
];

const USEFUL_PLACES = [
    { name: '7-Bank ATM', icon: '💳', desc: 'In jedem 7-Eleven — akzeptiert internationale Karten (Visa, Mastercard)', tip: 'Verfügbar 24/7' },
    { name: 'Konbini (コンビニ)', icon: '🏪', desc: '7-Eleven, Lawson, FamilyMart — überall und rund um die Uhr', tip: '24h Essen, Geld, Toilette' },
    { name: 'Postamt (〒)', icon: '📮', desc: 'Rotes 〒-Symbol — auch Geldwechsel und ATM', tip: 'Post-ATMs akzeptieren oft internationale Karten' },
    { name: 'Kōban (交番)', icon: '🚔', desc: 'Kleine Polizeiposten an belebten Orten — sehr hilfsbereit!', tip: 'Fragen nach dem Weg? Kōban ist oft die beste Anlaufstelle' },
];

export default function EmergencyInfo() {
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [speakingIndex, setSpeakingIndex] = useState(null);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleSpeak = (text, index) => {
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'ja-JP';
        utterance.rate = 0.8;
        utterance.onstart = () => setSpeakingIndex(index);
        utterance.onend = () => setSpeakingIndex(null);
        utterance.onerror = () => setSpeakingIndex(null);
        speechSynthesis.speak(utterance);
    };

    return (
        <div className="p-4 space-y-5 pb-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">
                    🆘 Notfall-Infos
                </h2>
                <p className="text-ios-gray-500 dark:text-ios-gray-400 text-sm mt-0.5">
                    Wichtige Nummern und Phrasen für den Ernstfall
                </p>
            </div>

            {/* Emergency Numbers */}
            <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                    📞 Notruf-Nummern
                </h3>
                {EMERGENCY_NUMBERS.map((item) => (
                    <a
                        key={item.number}
                        href={`tel:${item.number}`}
                        className="flex items-center gap-3 p-4 bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios
                                   border border-ios-gray-100 dark:border-ios-gray-700 transition-all active:scale-[0.98]"
                    >
                        <div className={`w-12 h-12 rounded-ios-lg flex items-center justify-center text-xl ${item.color}`}>
                            {item.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ios-gray-950 dark:text-white">{item.label}</p>
                            <p className="text-xs text-ios-gray-500 mt-0.5">{item.desc}</p>
                        </div>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl font-bold text-ios-red tabular-nums">{item.number}</span>
                            <Phone className="w-5 h-5 text-ios-red" />
                        </div>
                    </a>
                ))}
            </div>

            {/* Emergency Phrases */}
            <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                    🗣️ Notfall-Phrasen
                </h3>
                <div className="space-y-2">
                    {EMERGENCY_PHRASES.map((phrase, index) => (
                        <div
                            key={index}
                            className="bg-white dark:bg-ios-gray-800 p-3.5 rounded-ios-xl shadow-ios
                                       border border-ios-gray-100 dark:border-ios-gray-700"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex-1 min-w-0">
                                    <p className="font-medium text-ios-gray-950 dark:text-white text-sm">{phrase.de}</p>
                                    <p className="text-lg font-bold text-ios-red mt-1">{phrase.jp}</p>
                                    <p className="text-xs text-ios-gray-500 font-mono mt-0.5">{phrase.romaji}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                    <button
                                        onClick={() => handleSpeak(phrase.jp, index)}
                                        className={`p-2 rounded-lg transition-colors ${speakingIndex === index
                                            ? 'text-ios-red bg-ios-red/10 animate-pulse'
                                            : 'text-ios-gray-400 hover:text-ios-red hover:bg-ios-red/10'
                                            }`}
                                        aria-label={`${phrase.de} aussprechen`}
                                    >
                                        <Phone className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleCopy(phrase.jp, index)}
                                        className="p-2 text-ios-gray-400 hover:text-ios-blue hover:bg-ios-blue/10 rounded-lg transition-colors"
                                        aria-label={`${phrase.jp} kopieren`}
                                    >
                                        {copiedIndex === index ? (
                                            <Check className="w-4 h-4 text-ios-green" />
                                        ) : (
                                            <Copy className="w-4 h-4" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Embassies */}
            <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                    🏛️ Botschaften in Tokyo
                </h3>
                {EMBASSIES.map((embassy) => (
                    <div
                        key={embassy.country}
                        className="bg-white dark:bg-ios-gray-800 p-4 rounded-ios-xl shadow-ios
                                   border border-ios-gray-100 dark:border-ios-gray-700"
                    >
                        <p className="font-semibold text-ios-gray-950 dark:text-white">{embassy.country}</p>
                        <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 mt-0.5">{embassy.name}</p>
                        <div className="flex items-center gap-4 mt-2">
                            <a href={`tel:${embassy.phone}`} className="flex items-center gap-1.5 text-sm text-ios-blue font-medium">
                                <Phone className="w-3.5 h-3.5" /> {embassy.phone}
                            </a>
                        </div>
                        <p className="flex items-start gap-1.5 text-xs text-ios-gray-500 mt-1.5">
                            <MapPin className="w-3.5 h-3.5 mt-0.5 shrink-0" /> {embassy.address}
                        </p>
                    </div>
                ))}
            </div>

            {/* Useful Places */}
            <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                    📍 Nützliche Anlaufstellen
                </h3>
                {USEFUL_PLACES.map((place) => (
                    <div
                        key={place.name}
                        className="flex items-start gap-3 bg-white dark:bg-ios-gray-800 p-3.5 rounded-ios-xl shadow-ios
                                   border border-ios-gray-100 dark:border-ios-gray-700"
                    >
                        <span className="text-2xl mt-0.5">{place.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ios-gray-950 dark:text-white text-sm">{place.name}</p>
                            <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400 mt-0.5">{place.desc}</p>
                            <p className="text-xs text-ios-blue mt-1 font-medium">{place.tip}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Useful Apps */}
            <div className="space-y-2.5">
                <h3 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                    📱 Nützliche Apps
                </h3>
                {USEFUL_APPS.map((app) => (
                    <div
                        key={app.name}
                        className="flex items-start gap-3 bg-white dark:bg-ios-gray-800 p-3.5 rounded-ios-xl shadow-ios
                                   border border-ios-gray-100 dark:border-ios-gray-700"
                    >
                        <span className="text-2xl mt-0.5">{app.icon}</span>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-ios-gray-950 dark:text-white text-sm">{app.name}</p>
                            <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400 mt-0.5">{app.desc}</p>
                            <p className="text-xs text-ios-orange mt-1 font-medium">{app.note}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Footer */}
            <div className="p-4 bg-ios-red/5 border border-ios-red/15 rounded-ios-xl">
                <p className="text-sm text-ios-gray-600 dark:text-ios-gray-300 leading-relaxed">
                    <strong className="text-ios-red">Wichtig:</strong> Bei Notrufen auf Japanisch oder Englisch
                    sprechen. Der Standort wird automatisch übermittelt. Bleibe ruhig und nenne deinen Standort,
                    wenn möglich eine naheliegende Adresse oder Sehenswürdigkeit.
                </p>
            </div>
        </div>
    );
}
