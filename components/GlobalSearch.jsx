'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, X, Building2, Compass, BookOpen, ArrowRight, Clock, Trash2, Package, Backpack, Languages } from 'lucide-react';
import PHRASES from '../lib/phrases';
import PACKING_CATEGORIES from '../lib/packingList';
import ETIQUETTE_SECTIONS from '../lib/etiquette';
import KANJI_CATEGORIES from '../lib/kanji';

const HISTORY_KEY = 'nippon-search-history';
const MAX_HISTORY = 10;

function loadHistory() {
    try {
        const raw = localStorage.getItem(HISTORY_KEY);
        return raw ? JSON.parse(raw) : [];
    } catch {
        return [];
    }
}

function saveHistory(entries) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
    } catch { /* quota exceeded — ignore */ }
}

export default function GlobalSearch({ isOpen, onClose, hotels = [], activities = [], onNavigate, isAuthenticated = true }) {
    const [query, setQuery] = useState('');
    const [history, setHistory] = useState([]);
    const inputRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setHistory(loadHistory());
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [isOpen]);

    const addToHistory = useCallback((term) => {
        const trimmed = term.trim();
        if (!trimmed || trimmed.length < 2) return;
        const updated = [trimmed, ...loadHistory().filter(h => h !== trimmed)].slice(0, MAX_HISTORY);
        saveHistory(updated);
        setHistory(updated);
    }, []);

    const removeHistoryEntry = useCallback((entry) => {
        const updated = loadHistory().filter(h => h !== entry);
        saveHistory(updated);
        setHistory(updated);
    }, []);

    const clearHistory = useCallback(() => {
        saveHistory([]);
        setHistory([]);
    }, []);

    // Search results
    const results = useMemo(() => {
        if (!query || query.length < 2) return { hotels: [], activities: [], phrases: [], packing: [], etiquette: [], kanji: [] };

        const q = query.toLowerCase();

        const matchedHotels = hotels.filter(h =>
            h.name?.toLowerCase().includes(q) ||
            h.address?.toLowerCase().includes(q) ||
            h.notes?.toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedActivities = activities.filter(a =>
            a.title?.toLowerCase().includes(q) ||
            a.description?.toLowerCase().includes(q) ||
            a.address?.toLowerCase().includes(q)
        ).slice(0, 5);

        const matchedPhrases = [];
        Object.entries(PHRASES).forEach(([categoryKey, category]) => {
            category.items.forEach(item => {
                if (item.de.toLowerCase().includes(q) ||
                    item.jp.includes(query) ||
                    item.romaji.toLowerCase().includes(q)) {
                    matchedPhrases.push({ ...item, category: category.label, categoryKey });
                }
            });
        });

        // Search packing list items
        const matchedPacking = [];
        Object.entries(PACKING_CATEGORIES).forEach(([catKey, cat]) => {
            cat.items.forEach(itemText => {
                if (itemText.toLowerCase().includes(q)) {
                    matchedPacking.push({ text: itemText, category: cat.label, categoryKey: catKey, icon: cat.icon });
                }
            });
        });

        // Search etiquette sections (title, rules do/dont)
        const matchedEtiquette = [];
        Object.entries(ETIQUETTE_SECTIONS).forEach(([sectionKey, section]) => {
            const titleMatch = section.title.toLowerCase().includes(q);
            const matchedRule = section.rules.find(r =>
                r.do.toLowerCase().includes(q) || r.dont.toLowerCase().includes(q)
            );

            if (titleMatch || matchedRule) {
                matchedEtiquette.push({
                    sectionKey,
                    title: section.title,
                    subtitle: section.subtitle,
                    icon: section.icon,
                    rulesCount: section.rules.length,
                    matchedRule: matchedRule ? (matchedRule.do.toLowerCase().includes(q) ? matchedRule.do : matchedRule.dont) : null
                });
            }
        });

        // Search kanji
        const matchedKanji = [];
        Object.entries(KANJI_CATEGORIES).forEach(([catKey, category]) => {
            category.items.forEach(item => {
                if (item.kanji.includes(query) ||
                    item.de.toLowerCase().includes(q) ||
                    item.romaji.toLowerCase().includes(q) ||
                    item.reading.includes(query)) {
                    matchedKanji.push({ ...item, category: category.label, categoryIcon: category.icon });
                }
            });
        });

        return {
            hotels: matchedHotels,
            activities: matchedActivities,
            phrases: matchedPhrases.slice(0, 5),
            packing: matchedPacking.slice(0, 5),
            etiquette: matchedEtiquette.slice(0, 5),
            kanji: matchedKanji.slice(0, 5),
        };
    }, [query, hotels, activities]);

    const totalResults = results.hotels.length + results.activities.length + results.phrases.length + results.packing.length + results.etiquette.length + results.kanji.length;

    const handleResultClick = (navigateTarget) => {
        addToHistory(query);
        onNavigate(navigateTarget);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] bg-ios-gray-50/95 dark:bg-ios-gray-950/95 backdrop-blur-lg animate-fade-in">
            <div className="flex flex-col h-full pt-safe">
                {/* Search Header */}
                <div className="flex items-center gap-3 px-4 py-3">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-ios-gray-400" />
                        <input
                            ref={inputRef}
                            type="text"
                            placeholder="Hotels, Aktivitäten, Packliste, Knigge..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            disabled={!isAuthenticated}
                            className={`input-ios pl-11 pr-4 bg-ios-gray-200 ${!isAuthenticated ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                    </div>
                    <button
                        onClick={onClose}
                        className="text-ios-blue font-medium text-base px-2 py-2 active:opacity-70 transition-opacity"
                    >
                        Abbrechen
                    </button>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-y-auto px-4 pb-8">
                    {!isAuthenticated ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                            <Search className="w-12 h-12 text-ios-gray-300 dark:text-ios-gray-600 mb-4" />
                            <p className="text-base font-semibold text-ios-gray-700 dark:text-ios-gray-300 mb-1">
                                Suche nicht verfügbar
                            </p>
                            <p className="text-sm text-ios-gray-500 dark:text-ios-gray-400">
                                Melde dich an, um die globale Suche zu nutzen.
                            </p>
                        </div>
                    ) : (
                        query.length < 2 ? (
                            /* Show search history when query is empty */
                            history.length > 0 ? (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider flex items-center gap-2">
                                            <Clock className="w-3.5 h-3.5" />
                                            Letzte Suchen
                                        </h3>
                                        <button
                                            onClick={clearHistory}
                                            className="text-xs text-ios-red font-medium px-2 py-1 rounded-ios
                                                 active:opacity-70 transition-opacity"
                                        >
                                            Alle löschen
                                        </button>
                                    </div>
                                    <div className="space-y-1">
                                        {history.map((entry, idx) => (
                                            <div
                                                key={idx}
                                                className="flex items-center gap-2 bg-white dark:bg-ios-gray-800
                                                     rounded-ios-lg overflow-hidden"
                                            >
                                                <button
                                                    onClick={() => setQuery(entry)}
                                                    className="flex-1 flex items-center gap-3 p-3 text-left
                                                         hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700 transition-colors"
                                                >
                                                    <Clock className="w-4 h-4 text-ios-gray-400 flex-shrink-0" />
                                                    <span className="text-sm text-ios-gray-950 dark:text-white truncate">{entry}</span>
                                                </button>
                                                <button
                                                    onClick={() => removeHistoryEntry(entry)}
                                                    className="p-3 text-ios-gray-400 hover:text-ios-red transition-colors"
                                                >
                                                    <X className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center py-16 text-ios-gray-400">
                                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">Mindestens 2 Zeichen eingeben</p>
                                </div>
                            )
                        ) : totalResults === 0 ? (
                            <div className="text-center py-16 text-ios-gray-400">
                                <p className="text-sm">Keine Ergebnisse für &bdquo;{query}&ldquo;</p>
                            </div>
                        ) : (
                            <div className="space-y-6">
                                {/* Hotels */}
                                {results.hotels.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Building2 className="w-3.5 h-3.5" />
                                            Hotels ({results.hotels.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.hotels.map(hotel => (
                                                <button
                                                    key={hotel.id}
                                                    onClick={() => handleResultClick({ tab: 'planning', view: 'hotels', id: hotel.id })}
                                                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-ios-gray-800
                                                         rounded-ios-lg hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700
                                                         transition-colors text-left"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-ios-gray-950 dark:text-white truncate">{hotel.name}</p>
                                                        {hotel.address && (
                                                            <p className="text-xs text-ios-gray-500 truncate">{hotel.address}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-ios-gray-400 flex-shrink-0 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Activities */}
                                {results.activities.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Compass className="w-3.5 h-3.5" />
                                            Aktivitäten ({results.activities.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.activities.map(activity => (
                                                <button
                                                    key={activity.id}
                                                    onClick={() => handleResultClick({ tab: 'planning', view: 'activities', id: activity.id })}
                                                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-ios-gray-800
                                                         rounded-ios-lg hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700
                                                         transition-colors text-left"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-ios-gray-950 dark:text-white truncate">
                                                            {activity.title}
                                                        </p>
                                                        {activity.description && (
                                                            <p className="text-xs text-ios-gray-500 truncate">{activity.description}</p>
                                                        )}
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-ios-gray-400 flex-shrink-0 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Phrases */}
                                {results.phrases.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <BookOpen className="w-3.5 h-3.5" />
                                            Phrasen ({results.phrases.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.phrases.map((phrase, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleResultClick({
                                                        tab: 'discover',
                                                        view: 'phrasebook',
                                                        category: phrase.categoryKey,
                                                        phrase: phrase.de,
                                                    })}
                                                    className="w-full p-3 bg-white dark:bg-ios-gray-800
                                                         rounded-ios-lg hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700
                                                         transition-colors text-left"
                                                >
                                                    <p className="font-medium text-ios-gray-950 dark:text-white">{phrase.de}</p>
                                                    <p className="text-sm text-ios-blue mt-0.5">{phrase.jp}</p>
                                                    <p className="text-xs text-ios-gray-500">{phrase.romaji} · {phrase.category}</p>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Packing items */}
                                {results.packing.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Package className="w-3.5 h-3.5" />
                                            Packliste ({results.packing.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.packing.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleResultClick({
                                                        tab: 'packing',
                                                        category: item.categoryKey,
                                                        item: item.text,
                                                    })}
                                                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-ios-gray-800
                                                         rounded-ios-lg hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700
                                                         transition-colors text-left"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-ios-gray-950 dark:text-white truncate">{item.text}</p>
                                                        <p className="text-xs text-ios-gray-500">{item.icon} {item.category}</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-ios-gray-400 flex-shrink-0 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Etiquette sections */}
                                {results.etiquette.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Backpack className="w-3.5 h-3.5" />
                                            Knigge ({results.etiquette.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.etiquette.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleResultClick({
                                                        tab: 'discover',
                                                        view: 'etiquette',
                                                        section: item.sectionKey,
                                                        rule: item.matchedRule,
                                                    })}
                                                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-ios-gray-800
                                                         rounded-ios-lg hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700
                                                         transition-colors text-left"
                                                >
                                                    <div className="min-w-0 flex-1">
                                                        <p className="font-medium text-ios-gray-950 dark:text-white truncate">
                                                            {item.icon} {item.title}
                                                        </p>
                                                        <p className="text-xs text-ios-gray-500">{item.subtitle} · {item.rulesCount} Regeln</p>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-ios-gray-400 flex-shrink-0 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Kanji */}
                                {results.kanji.length > 0 && (
                                    <div>
                                        <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                                            <Languages className="w-3.5 h-3.5" />
                                            Kanji ({results.kanji.length})
                                        </h3>
                                        <div className="space-y-1">
                                            {results.kanji.map((item, idx) => (
                                                <button
                                                    key={idx}
                                                    onClick={() => handleResultClick({
                                                        tab: 'discover',
                                                        view: 'kanji',
                                                    })}
                                                    className="w-full flex items-center justify-between p-3 bg-white dark:bg-ios-gray-800
                                                         rounded-ios-lg hover:bg-ios-gray-100 dark:hover:bg-ios-gray-700
                                                         transition-colors text-left"
                                                >
                                                    <div className="min-w-0 flex-1 flex items-center gap-3">
                                                        <span className="text-2xl font-bold">{item.kanji}</span>
                                                        <div>
                                                            <p className="font-medium text-ios-gray-950 dark:text-white">{item.de}</p>
                                                            <p className="text-xs text-ios-gray-500">{item.reading} · {item.romaji}</p>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-ios-gray-400 flex-shrink-0 ml-2" />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}
