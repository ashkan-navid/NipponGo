'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { Search, Volume2, Copy, Check, Star } from 'lucide-react';
import PHRASES from '../lib/phrases';

const FAVORITES_KEY = 'nippon-phrase-favorites';

function loadFavorites() {
    try {
        const raw = localStorage.getItem(FAVORITES_KEY);
        return raw ? new Set(JSON.parse(raw)) : new Set();
    } catch {
        return new Set();
    }
}

function saveFavorites(favSet) {
    try {
        localStorage.setItem(FAVORITES_KEY, JSON.stringify([...favSet]));
    } catch { /* quota exceeded */ }
}

export default function Phrasebook({ initialCategory, highlightPhrase, onHighlightDone }) {
    const [activeCategory, setActiveCategory] = useState(initialCategory || 'greetings');
    const [searchQuery, setSearchQuery] = useState('');
    const [copiedIndex, setCopiedIndex] = useState(null);
    const [speakingIndex, setSpeakingIndex] = useState(null);
    const [favorites, setFavorites] = useState(new Set());
    const highlightRef = useRef(null);

    // Load favorites on mount
    useEffect(() => {
        setFavorites(loadFavorites());
    }, []);

    // Navigate to category + highlight phrase when coming from search
    useEffect(() => {
        if (initialCategory) {
            setActiveCategory(initialCategory);
            setSearchQuery('');
        }
    }, [initialCategory]);

    useEffect(() => {
        if (highlightPhrase && highlightRef.current) {
            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightRef.current?.classList.add('ring-2', 'ring-ios-blue', 'ring-offset-2');
                setTimeout(() => {
                    highlightRef.current?.classList.remove('ring-2', 'ring-ios-blue', 'ring-offset-2');
                    onHighlightDone?.();
                }, 2000);
            }, 200);
        }
    }, [highlightPhrase, activeCategory, onHighlightDone]);

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

    const toggleFavorite = useCallback((phraseId) => {
        setFavorites(prev => {
            const next = new Set(prev);
            if (next.has(phraseId)) {
                next.delete(phraseId);
            } else {
                next.add(phraseId);
            }
            saveFavorites(next);
            return next;
        });
    }, []);

    // Build favorites list
    const favoritesPhrases = useMemo(() => {
        if (favorites.size === 0) return [];
        const result = [];
        Object.entries(PHRASES).forEach(([catKey, category]) => {
            category.items.forEach((item, idx) => {
                const id = `${catKey}:${idx}`;
                if (favorites.has(id)) {
                    result.push({ ...item, id });
                }
            });
        });
        return result;
    }, [favorites]);

    const filteredPhrases = useMemo(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            let results = [];
            Object.entries(PHRASES).forEach(([catKey, category]) => {
                category.items.forEach((item, idx) => {
                    if (item.de.toLowerCase().includes(query) ||
                        item.romaji.toLowerCase().includes(query)) {
                        results.push({ ...item, id: `${catKey}:${idx}` });
                    }
                });
            });
            return results;
        }

        if (activeCategory === 'favorites') {
            return favoritesPhrases;
        }

        return (PHRASES[activeCategory]?.items || []).map((item, idx) => ({
            ...item,
            id: `${activeCategory}:${idx}`,
        }));
    }, [activeCategory, searchQuery, favoritesPhrases]);

    return (
        <div className="p-4 space-y-4 pb-8">
            {/* Header */}
            <div className="space-y-4 mb-6">
                <div>
                    <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">
                        Wörterbuch
                    </h2>
                    <p className="text-ios-gray-600 dark:text-ios-gray-400 text-sm">
                        Wichtige Sätze für deine Reise
                    </p>
                </div>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ios-gray-400" />
                    <input
                        type="text"
                        placeholder="Suchen (Deutsch oder Romaji)..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="input-ios pl-10 pr-4 py-3"
                    />
                </div>
            </div>

            {/* Categories (only show if not searching) */}
            {!searchQuery && (
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
                    {/* Favorites tab */}
                    <button
                        onClick={() => setActiveCategory('favorites')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all
                                  ${activeCategory === 'favorites'
                                ? 'bg-ios-yellow text-white shadow-ios'
                                : 'bg-white dark:bg-ios-gray-800 text-ios-gray-600 dark:text-ios-gray-300 border border-ios-gray-200 dark:border-ios-gray-800'
                            }`}
                    >
                        <Star className={`w-4 h-4 ${activeCategory === 'favorites' ? 'fill-white' : ''}`} />
                        <span className="font-medium text-sm">Favoriten</span>
                        {favorites.size > 0 && (
                            <span className={`text-xs font-bold px-1.5 rounded-full ${activeCategory === 'favorites'
                                ? 'bg-white/30 text-white' : 'bg-ios-yellow/20 text-ios-yellow'}`}>
                                {favorites.size}
                            </span>
                        )}
                    </button>

                    {Object.entries(PHRASES).map(([key, data]) => (
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

            {/* Content */}
            <div className="space-y-3">
                {activeCategory === 'favorites' && favorites.size === 0 && !searchQuery ? (
                    <div className="text-center py-10 text-ios-gray-500">
                        <Star className="w-10 h-10 mx-auto mb-3 text-ios-gray-300" />
                        <p className="font-medium mb-1">Keine Favoriten</p>
                        <p className="text-sm">Markiere Phrasen mit ⭐ für schnellen Zugriff</p>
                    </div>
                ) : searchQuery && filteredPhrases.length === 0 ? (
                    <div className="text-center py-10 text-ios-gray-500">
                        <p>Keine Ergebnisse gefunden</p>
                    </div>
                ) : (
                    filteredPhrases.map((phrase, index) => {
                        const isHighlight = highlightPhrase && phrase.de === highlightPhrase;
                        const isFav = favorites.has(phrase.id);
                        return (
                            <div
                                key={phrase.id || index}
                                ref={isHighlight ? highlightRef : null}
                                className="bg-white dark:bg-ios-gray-800 p-4 rounded-ios-xl shadow-ios 
                                         border border-ios-gray-100 dark:border-ios-gray-700 transition-all duration-300"
                            >
                                <div className="flex justify-between items-start gap-4">
                                    <div className="space-y-1 flex-1 min-w-0">
                                        <p className="font-medium text-ios-gray-950 dark:text-white">
                                            {phrase.de}
                                        </p>
                                        <p className="text-xl font-bold text-ios-blue my-2 font-japanese">
                                            {phrase.jp}
                                        </p>
                                        <p className="text-sm text-ios-gray-500 font-mono">
                                            {phrase.romaji}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-0.5 shrink-0">
                                        <button
                                            onClick={() => toggleFavorite(phrase.id)}
                                            className={`p-2 rounded-lg transition-colors ${isFav
                                                ? 'text-ios-yellow'
                                                : 'text-ios-gray-300 hover:text-ios-yellow'}`}
                                            title={isFav ? 'Favorit entfernen' : 'Als Favorit markieren'}
                                        >
                                            <Star className={`w-5 h-5 ${isFav ? 'fill-ios-yellow' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => handleSpeak(phrase.jp, index)}
                                            className={`p-2 rounded-lg transition-colors ${speakingIndex === index
                                                ? 'text-ios-blue bg-ios-blue/10 animate-pulse'
                                                : 'text-ios-gray-400 hover:text-ios-blue hover:bg-ios-blue/10'}`}
                                            title="Aussprechen"
                                        >
                                            <Volume2 className="w-5 h-5" />
                                        </button>
                                        <button
                                            onClick={() => handleCopy(phrase.jp, index)}
                                            className="p-2 text-ios-gray-400 hover:text-ios-blue hover:bg-ios-blue/10 
                                                     rounded-lg transition-colors"
                                            title="Kopieren"
                                        >
                                            {copiedIndex === index ? (
                                                <Check className="w-5 h-5 text-ios-green" />
                                            ) : (
                                                <Copy className="w-5 h-5" />
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
