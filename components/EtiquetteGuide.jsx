'use client';

import { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import ETIQUETTE_SECTIONS from '../lib/etiquette';
import { hapticLight } from '../lib/haptics';

const COLOR_MAP = {
    red: {
        ring: 'ring-ios-red/20',
        bg: 'bg-ios-red/10',
        doBg: 'bg-ios-green',
        dontBg: 'bg-ios-red',
    },
    blue: {
        ring: 'ring-ios-blue/20',
        bg: 'bg-ios-blue/10',
        doBg: 'bg-ios-green',
        dontBg: 'bg-ios-red',
    },
    orange: {
        ring: 'ring-ios-orange/20',
        bg: 'bg-ios-orange/10',
        doBg: 'bg-ios-green',
        dontBg: 'bg-ios-red',
    },
    purple: {
        ring: 'ring-ios-purple/20',
        bg: 'bg-ios-purple/10',
        doBg: 'bg-ios-green',
        dontBg: 'bg-ios-red',
    },
    green: {
        ring: 'ring-ios-green/20',
        bg: 'bg-ios-green/10',
        doBg: 'bg-ios-green',
        dontBg: 'bg-ios-red',
    },
};

export default function EtiquetteGuide({ highlightSection, highlightRuleText, onHighlightDone }) {
    const [expandedSection, setExpandedSection] = useState('onsen');
    const [highlightedRule, setHighlightedRule] = useState(null);
    const sectionRefs = useRef({});
    const ruleRefs = useRef({});

    // Auto-expand and scroll to highlighted section from search
    useEffect(() => {
        if (highlightSection && ETIQUETTE_SECTIONS[highlightSection]) {
            setExpandedSection(highlightSection);

            setTimeout(() => {
                if (highlightRuleText) {
                    setHighlightedRule(highlightRuleText);
                    ruleRefs.current[highlightRuleText]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    ruleRefs.current[highlightRuleText]?.classList.add('ring-2', 'ring-ios-blue', 'ring-offset-2');
                    setTimeout(() => {
                        ruleRefs.current[highlightRuleText]?.classList.remove('ring-2', 'ring-ios-blue', 'ring-offset-2');
                        setHighlightedRule(null);
                        onHighlightDone?.();
                    }, 2000);
                } else {
                    sectionRefs.current[highlightSection]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    sectionRefs.current[highlightSection]?.classList.add('ring-2', 'ring-ios-blue', 'ring-offset-2');
                    setTimeout(() => {
                        sectionRefs.current[highlightSection]?.classList.remove('ring-2', 'ring-ios-blue', 'ring-offset-2');
                        onHighlightDone?.();
                    }, 2000);
                }
            }, 200);
        }
    }, [highlightSection, highlightRuleText, onHighlightDone]);

    const toggleSection = (key) => {
        hapticLight();
        setExpandedSection(expandedSection === key ? null : key);
    };

    return (
        <div className="p-4 space-y-4 pb-8">
            {/* Header */}
            <div>
                <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">
                    🙇 Japan Knigge
                </h2>
                <p className="text-ios-gray-500 dark:text-ios-gray-400 text-sm mt-0.5">
                    Wichtige Verhaltensregeln für deine Reise
                </p>
            </div>

            {/* Accordion sections */}
            <div className="space-y-3">
                {Object.entries(ETIQUETTE_SECTIONS).map(([key, section]) => {
                    const isExpanded = expandedSection === key;
                    const colors = COLOR_MAP[section.color] || COLOR_MAP.blue;

                    return (
                        <div
                            key={key}
                            ref={el => sectionRefs.current[key] = el}
                            className={`bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios
                                       border border-ios-gray-200 dark:border-ios-gray-700 overflow-hidden
                                       transition-all ${isExpanded ? `ring-2 ${colors.ring}` : ''}`}
                        >
                            {/* Section header */}
                            <button
                                onClick={() => toggleSection(key)}
                                className="w-full flex items-center justify-between p-4 transition-all active:scale-[0.99]"
                            >
                                <div className="flex items-center gap-3">
                                    <div className={`text-2xl p-2 rounded-ios ${colors.bg}`}>
                                        {section.icon}
                                    </div>
                                    <div className="text-left">
                                        <h3 className="font-semibold text-ios-gray-950 dark:text-white text-[15px]">
                                            {section.title}
                                        </h3>
                                        <p className="text-xs text-ios-gray-400 dark:text-ios-gray-500">
                                            {section.subtitle} · {section.rules.length} Regeln
                                        </p>
                                    </div>
                                </div>
                                {isExpanded
                                    ? <ChevronUp className="w-5 h-5 text-ios-gray-400 flex-shrink-0" />
                                    : <ChevronDown className="w-5 h-5 text-ios-gray-400 flex-shrink-0" />
                                }
                            </button>

                            {/* Expanded content */}
                            {isExpanded && (
                                <div className="px-4 pb-4 space-y-3 animate-fade-in">
                                    {/* Intro text */}
                                    {section.intro && (
                                        <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 italic px-1">
                                            {section.intro}
                                        </p>
                                    )}

                                    {section.rules.map((rule, idx) => {
                                        const isRuleHighlighted = highlightedRule && (rule.do === highlightedRule || rule.dont === highlightedRule);
                                        return (
                                            <div
                                                key={idx}
                                                ref={el => {
                                                    ruleRefs.current[rule.do] = el;
                                                    ruleRefs.current[rule.dont] = el;
                                                }}
                                                className={`space-y-2 p-3 bg-ios-gray-50 dark:bg-ios-gray-900/60 rounded-ios transition-all duration-300
                                                    ${isRuleHighlighted ? 'ring-2 ring-ios-blue ring-offset-2 ring-offset-white dark:ring-offset-ios-gray-800' : ''}`}
                                            >
                                                {/* Do */}
                                                <div className="flex items-start gap-2.5">
                                                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${colors.doBg}
                                                               flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
                                                        ✓
                                                    </span>
                                                    <p className="flex-1 text-sm text-ios-gray-900 dark:text-white font-medium leading-snug">
                                                        {rule.do}
                                                    </p>
                                                </div>
                                                {/* Don't */}
                                                <div className="flex items-start gap-2.5">
                                                    <span className={`flex-shrink-0 w-5 h-5 rounded-full ${colors.dontBg}
                                                               flex items-center justify-center text-white text-xs font-bold mt-0.5`}>
                                                        ✕
                                                    </span>
                                                    <p className="flex-1 text-sm text-ios-gray-500 dark:text-ios-gray-400 leading-snug">
                                                        {rule.dont}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer tip */}
            <div className="p-4 bg-ios-blue/5 border border-ios-blue/15 rounded-ios-xl">
                <p className="text-sm text-ios-gray-600 dark:text-ios-gray-300 leading-relaxed">
                    <strong className="text-ios-blue">Tipp:</strong> Japaner sind sehr verständnisvoll gegenüber
                    Touristen. Allein der Versuch, diese Regeln zu befolgen, wird sehr geschätzt! Ein freundliches
                    Lächeln und eine leichte Verbeugung öffnen viele Türen.
                </p>
            </div>
        </div>
    );
}
