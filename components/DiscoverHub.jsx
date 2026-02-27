'use client';

import { useState, useEffect } from 'react';
import { Book, BookOpen, Coins, ShieldAlert, Languages, Info, Brain, Wallet } from 'lucide-react';
import Phrasebook from './Phrasebook';
import EtiquetteGuide from './EtiquetteGuide';
import CurrencyConverter from './CurrencyConverter';
import EmergencyInfo from './EmergencyInfo';
import KanjiGuide from './KanjiGuide';
import JapanInfo from './JapanInfo';
import JapanQuiz from './JapanQuiz';
import BudgetTracker from './BudgetTracker';
import { hapticLight } from '../lib/haptics';

const VIEWS = [
    { id: 'phrasebook', label: 'Wörterbuch', icon: Book },
    { id: 'etiquette', label: 'Knigge', icon: BookOpen },
    { id: 'currency', label: 'Währung', icon: Coins },
    { id: 'emergency', label: 'Notfall', icon: ShieldAlert },
    { id: 'kanji', label: 'Kanji', icon: Languages },
    { id: 'japaninfo', label: 'Japan-Info', icon: Info },
    { id: 'quiz', label: 'Quiz', icon: Brain },
    { id: 'budget', label: 'Budget', icon: Wallet },
];

export default function DiscoverHub({ initialView, highlightTarget, onHighlightDone }) {
    const [activeView, setActiveView] = useState(initialView || 'phrasebook');

    // Switch view when navigated from search
    useEffect(() => {
        if (initialView) {
            setActiveView(initialView);
        }
    }, [initialView]);

    return (
        <div className="h-full flex flex-col">
            {/* Scrollable segmented control */}
            <div className="flex-shrink-0 p-4 pb-0">
                <div className="flex gap-1 p-1 bg-ios-gray-100 dark:bg-ios-gray-900 rounded-ios-xl overflow-x-auto scrollbar-hide">
                    {VIEWS.map((view) => {
                        const Icon = view.icon;
                        return (
                            <button
                                key={view.id}
                                onClick={() => {
                                    hapticLight();
                                    setActiveView(view.id);
                                }}
                                className={`flex items-center justify-center gap-1.5 py-2.5 px-3
                                           rounded-ios font-medium text-sm transition-all active:scale-95 whitespace-nowrap shrink-0 ${activeView === view.id
                                        ? 'bg-white dark:bg-ios-gray-800 text-ios-blue shadow-ios'
                                        : 'text-ios-gray-500 dark:text-ios-gray-400'
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {view.label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-auto">
                {activeView === 'phrasebook' && (
                    <Phrasebook
                        initialCategory={highlightTarget?.category || null}
                        highlightPhrase={highlightTarget?.phrase || null}
                        onHighlightDone={onHighlightDone}
                    />
                )}
                {activeView === 'etiquette' && (
                    <EtiquetteGuide
                        highlightSection={activeView === 'etiquette' ? highlightTarget?.section : null}
                        highlightRuleText={activeView === 'etiquette' ? highlightTarget?.rule : null}
                        onHighlightDone={onHighlightDone}
                    />
                )}
                {activeView === 'currency' && (
                    <CurrencyConverter />
                )}
                {activeView === 'emergency' && (
                    <EmergencyInfo />
                )}
                {activeView === 'kanji' && (
                    <KanjiGuide />
                )}
                {activeView === 'japaninfo' && (
                    <JapanInfo />
                )}
                {activeView === 'quiz' && (
                    <JapanQuiz />
                )}
                {activeView === 'budget' && (
                    <BudgetTracker />
                )}
            </div>
        </div>
    );
}
