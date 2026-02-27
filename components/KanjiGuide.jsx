'use client';

import { useState, useMemo } from 'react';
import { Search, Copy, Check } from 'lucide-react';
import KANJI_CATEGORIES from '../lib/kanji';

export default function KanjiGuide() {
    const [activeCategory, setActiveCategory] = useState('navigation');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);

    const handleCopy = (text, index) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const filteredItems = useMemo(() => {
        if (!searchQuery) {
            return KANJI_CATEGORIES[activeCategory]?.items || [];
        }
        const query = searchQuery.toLowerCase();
        let results = [];
        Object.values(KANJI_CATEGORIES).forEach(category => {
            const matches = category.items.filter(item =>
                item.kanji.includes(query) ||
                item.de.toLowerCase().includes(query) ||
                item.romaji.toLowerCase().includes(query) ||
                item.reading.includes(query)
            );
            results = [...results, ...matches];
        });
        return results;
    }, [activeCategory, searchQuery]);

    return (
        <div className="p-4 space-y-4 pb-8">
            {/* Header */}
            <div className="space-y-4 mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">
                        🈳 Nützliche Kanji
                    </h2>
                    <p className="text-ios-gray-500 dark:text-ios-gray-400 text-sm mt-0.5">
                        Die wichtigsten Schriftzeichen für Schilder und Orientierung
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ios-gray-400" />
                    <input
                        type="text"
                        placeholder="Suchen (Deutsch, Romaji oder Kanji)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-ios pl-10 pr-4 py-3"
                    />
                </div>
            </div>

            {/* Categories */}
            {!searchQuery && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {Object.entries(KANJI_CATEGORIES).map(([key, data]) => (
                        <button
                            key={key}
                            onClick={() => setActiveCategory(key)}
                            className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                                      ${activeCategory === key
                                    ? 'bg-ios-blue text-white shadow-ios'
                                    : 'bg-white dark:bg-ios-gray-800 text-ios-gray-600 dark:text-ios-gray-300 border border-ios-gray-200 dark:border-ios-gray-800'
                                }`}
                        >
                            <span>{data.icon}</span>
                            <span className="font-medium text-sm">{data.label}</span>
                        </button>
                    ))}
                </div>
            )}

            {/* Kanji Grid */}
            <div className="grid grid-cols-2 gap-3">
                {filteredItems.length === 0 ? (
                    <div className="col-span-2 text-center py-10 text-ios-gray-500">
                        <p>Keine Ergebnisse gefunden</p>
                    </div>
                ) : (
                    filteredItems.map((item, index) => (
                        <div
                            key={`${item.kanji}-${index}`}
                            className="bg-white dark:bg-ios-gray-800 p-4 rounded-ios-xl shadow-ios
                                       border border-ios-gray-100 dark:border-ios-gray-700 relative group"
                        >
                            <button
                                onClick={() => handleCopy(item.kanji, index)}
                                className="absolute top-2 right-2 p-1.5 text-ios-gray-400 hover:text-ios-blue
                                           hover:bg-ios-blue/10 rounded-lg transition-colors"
                                aria-label={`${item.kanji} kopieren`}
                            >
                                {copiedIndex === index ? (
                                    <Check className="w-3.5 h-3.5 text-ios-green" />
                                ) : (
                                    <Copy className="w-3.5 h-3.5" />
                                )}
                            </button>
                            <p className="text-3xl font-bold text-ios-gray-950 dark:text-white mb-2 leading-tight">
                                {item.kanji}
                            </p>
                            <p className="text-sm font-medium text-ios-blue mb-0.5">
                                {item.de}
                            </p>
                            <p className="text-xs text-ios-gray-500">
                                {item.reading} · {item.romaji}
                            </p>
                        </div>
                    ))
                )}
            </div>

            {/* Tip */}
            <div className="p-4 bg-ios-blue/5 border border-ios-blue/15 rounded-ios-xl">
                <p className="text-sm text-ios-gray-600 dark:text-ios-gray-300 leading-relaxed">
                    <strong className="text-ios-blue">Tipp:</strong> Du musst diese Kanji nicht lesen können —
                    es reicht, die Zeichen wiederzuerkennen! Achte besonders auf 入口 (Eingang) und 出口 (Ausgang)
                    an Bahnhöfen und Gebäuden.
                </p>
            </div>
        </div>
    );
}
