'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { COST_OVERVIEW, HOLIDAYS, SEASONS, KONBINI_GUIDE } from '../lib/japanInfo';

function Section({ title, icon, defaultOpen = false, children }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    return (
        <div className="bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios border border-ios-gray-100 dark:border-ios-gray-700 overflow-hidden">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between p-4 text-left transition-colors active:bg-ios-gray-50 dark:active:bg-ios-gray-700"
            >
                <span className="flex items-center gap-2.5 font-semibold text-ios-gray-950 dark:text-white">
                    <span className="text-xl">{icon}</span>
                    {title}
                </span>
                {isOpen ? (
                    <ChevronUp className="w-5 h-5 text-ios-gray-400" />
                ) : (
                    <ChevronDown className="w-5 h-5 text-ios-gray-400" />
                )}
            </button>
            {isOpen && (
                <div className="px-4 pb-4 pt-0 border-t border-ios-gray-100 dark:border-ios-gray-700">
                    {children}
                </div>
            )}
        </div>
    );
}

function CostTable({ category }) {
    return (
        <div className="mt-3 space-y-1.5">
            {category.items.map((item, i) => (
                <div key={i} className="flex justify-between items-center py-1.5 border-b border-ios-gray-100/60 dark:border-ios-gray-700/60 last:border-0">
                    <span className="text-sm text-ios-gray-700 dark:text-ios-gray-300">{item.name}</span>
                    <span className="text-sm font-medium text-ios-gray-950 dark:text-white tabular-nums whitespace-nowrap ml-3">
                        ¥{item.jpy} <span className="text-xs text-ios-gray-500">({item.eur})</span>
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function JapanInfo() {
    return (
        <div className="p-4 space-y-3 pb-8">
            {/* Header */}
            <div className="mb-2">
                <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">
                    🇯🇵 Japan-Info
                </h2>
                <p className="text-ios-gray-500 dark:text-ios-gray-400 text-sm mt-0.5">
                    Kosten, Feiertage, Saisons und Konbini-Tipps
                </p>
            </div>

            {/* Costs */}
            {Object.entries(COST_OVERVIEW).map(([key, category]) => (
                <Section key={key} title={category.label} icon={category.icon} defaultOpen={key === 'food'}>
                    <CostTable category={category} />
                    <p className="text-xs text-ios-gray-500 mt-3 italic">
                        Preise sind Richtwerte (2024/2025). 1€ ≈ ¥155–165.
                    </p>
                </Section>
            ))}

            {/* Season Calendar */}
            <Section title="Saisonkalender" icon="📅">
                <div className="mt-3 overflow-x-auto -mx-4 px-4">
                    <div className="grid grid-cols-4 gap-1.5 min-w-[320px]">
                        {SEASONS.map((s) => (
                            <div
                                key={s.month}
                                className={`p-2 rounded-ios text-center text-xs border
                                    ${s.sakura ? 'bg-pink-50 dark:bg-pink-900/20 border-pink-200 dark:border-pink-800' :
                                        s.koyo ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800' :
                                            s.rainy ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' :
                                                s.snow ? 'bg-sky-50 dark:bg-sky-900/20 border-sky-200 dark:border-sky-800' :
                                                    'bg-ios-gray-50 dark:bg-ios-gray-700 border-ios-gray-200 dark:border-ios-gray-600'}
                                `}
                            >
                                <p className="font-bold text-ios-gray-950 dark:text-white">{s.month}</p>
                                <p className="text-[10px] text-ios-gray-500 dark:text-ios-gray-400 mt-0.5">{s.temp}</p>
                                <div className="flex justify-center gap-0.5 mt-1">
                                    {s.sakura && <span title="Kirschblüte">🌸</span>}
                                    {s.koyo && <span title="Herbstlaub">🍁</span>}
                                    {s.rainy && <span title="Regenzeit">☔</span>}
                                    {s.snow && <span title="Schnee">❄️</span>}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-wrap gap-3 mt-3 text-xs text-ios-gray-500">
                        <span>🌸 Kirschblüte</span>
                        <span>🍁 Herbstlaub</span>
                        <span>☔ Regenzeit</span>
                        <span>❄️ Schnee</span>
                    </div>
                </div>
                <div className="mt-3 space-y-1.5">
                    {SEASONS.map((s) => (
                        <p key={s.month} className="text-xs text-ios-gray-600 dark:text-ios-gray-400">
                            <strong className="text-ios-gray-900 dark:text-ios-gray-200">{s.month}:</strong> {s.tip}
                        </p>
                    ))}
                </div>
            </Section>

            {/* Holidays */}
            <Section title="Feiertage & Goldene Woche" icon="🎌">
                <div className="mt-3 space-y-2">
                    {HOLIDAYS.map((h, i) => (
                        <div key={i} className="py-2 border-b border-ios-gray-100/60 dark:border-ios-gray-700/60 last:border-0">
                            <div className="flex items-baseline gap-2">
                                <span className="text-xs font-mono text-ios-gray-500 whitespace-nowrap">{h.date}</span>
                                <span className="text-sm font-semibold text-ios-gray-950 dark:text-white">{h.de}</span>
                            </div>
                            <p className="text-xs text-ios-gray-600 dark:text-ios-gray-400 mt-0.5">{h.name}</p>
                            <p className="text-xs text-ios-gray-500 mt-1">{h.note}</p>
                        </div>
                    ))}
                </div>
            </Section>

            {/* Konbini Guide */}
            <Section title="Konbini-Guide" icon="🏪">
                <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 mt-3">{KONBINI_GUIDE.intro}</p>

                {/* Chains */}
                <div className="flex gap-2 mt-3">
                    {KONBINI_GUIDE.chains.map((chain) => (
                        <div key={chain.name} className="flex-1 bg-ios-gray-50 dark:bg-ios-gray-700 p-3 rounded-ios text-center">
                            <p className="text-2xl">{chain.logo}</p>
                            <p className="text-xs font-semibold text-ios-gray-950 dark:text-white mt-1">{chain.name}</p>
                            <p className="text-[10px] text-ios-gray-500 mt-0.5">{chain.tip}</p>
                        </div>
                    ))}
                </div>

                {/* Must Try */}
                <h4 className="text-sm font-semibold text-ios-gray-950 dark:text-white mt-4 mb-2">Must-Try Items</h4>
                <div className="space-y-1.5">
                    {KONBINI_GUIDE.mustTry.map((item) => (
                        <div key={item.name} className="flex items-start gap-2.5 py-1.5">
                            <span className="text-lg mt-0.5">{item.icon}</span>
                            <div>
                                <p className="text-sm font-medium text-ios-gray-950 dark:text-white">{item.name}</p>
                                <p className="text-xs text-ios-gray-500">{item.desc}</p>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Services */}
                <h4 className="text-sm font-semibold text-ios-gray-950 dark:text-white mt-4 mb-2">Konbini-Services</h4>
                <div className="space-y-1">
                    {KONBINI_GUIDE.services.map((service, i) => (
                        <p key={i} className="text-sm text-ios-gray-600 dark:text-ios-gray-400 flex items-center gap-2">
                            <span className="w-1.5 h-1.5 bg-ios-blue rounded-full shrink-0" />
                            {service}
                        </p>
                    ))}
                </div>
            </Section>
        </div>
    );
}
