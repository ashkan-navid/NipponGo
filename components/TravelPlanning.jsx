'use client';

import { useState, useEffect } from 'react';
import { Building2, Compass, Plane } from 'lucide-react';
import HotelsList from './HotelsList';
import ActivitiesList from './ActivitiesList';
import FlightsList from './FlightsList';
import { hapticLight } from '../lib/haptics';

const VIEWS = [
    { id: 'flights', label: 'Flüge', icon: Plane },
    { id: 'hotels', label: 'Hotels', icon: Building2 },
    { id: 'activities', label: 'Aktivitäten', icon: Compass },
];

export default function TravelPlanning({ emitDataChanged, initialView, highlightId, onHighlightDone, hotelCount = 0, activityCount = 0, flightCount = 0 }) {
    const [activeView, setActiveView] = useState(initialView || 'activities');

    useEffect(() => {
        if (initialView) {
            setActiveView(initialView);
        }
    }, [initialView]);

    return (
        <div className="h-full flex flex-col">
            {/* Segmented control */}
            <div className="flex-shrink-0 p-4 pb-0">
                <div className="flex gap-1 p-1 bg-ios-gray-100 dark:bg-ios-gray-900 rounded-ios-xl">
                    {VIEWS.map((view) => {
                        const Icon = view.icon;
                        const count = view.id === 'hotels' ? hotelCount : view.id === 'activities' ? activityCount : view.id === 'flights' ? flightCount : 0;
                        return (
                            <button
                                key={view.id}
                                onClick={() => {
                                    hapticLight();
                                    setActiveView(view.id);
                                }}
                                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-2
                                           rounded-ios font-medium transition-all active:scale-95 relative ${activeView === view.id
                                        ? 'bg-white dark:bg-ios-gray-800 text-ios-blue shadow-ios'
                                        : 'text-ios-gray-500 dark:text-ios-gray-400'
                                    }`}
                                title={view.label}
                            >
                                <Icon className="w-5 h-5" />
                                {count > 0 && (
                                    <span className={`px-1.5 py-0.5 rounded-full text-xs font-semibold ${activeView === view.id
                                        ? 'bg-ios-blue/10 text-ios-blue'
                                        : 'bg-ios-gray-200 dark:bg-ios-gray-700 text-ios-gray-500 dark:text-ios-gray-400'
                                        }`}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content area */}
            <div className="flex-1 min-h-0 overflow-auto">
                {activeView === 'flights' && (
                    <FlightsList
                        emitDataChanged={emitDataChanged}
                        highlightId={activeView === 'flights' ? highlightId : null}
                        onHighlightDone={onHighlightDone}
                    />
                )}
                {activeView === 'hotels' && (
                    <HotelsList
                        emitDataChanged={emitDataChanged}
                        highlightId={activeView === 'hotels' ? highlightId : null}
                        onHighlightDone={onHighlightDone}
                    />
                )}
                {activeView === 'activities' && (
                    <ActivitiesList
                        emitDataChanged={emitDataChanged}
                        highlightId={activeView === 'activities' ? highlightId : null}
                        onHighlightDone={onHighlightDone}
                    />
                )}
            </div>
        </div>
    );
}
