'use client';

import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Compass, Calendar, PlaneTakeoff, PlaneLanding } from 'lucide-react';
import useAuthStore from '../store/authStore';

export default function TimelineView({ onNavigate }) {
    const { isAuthenticated } = useAuthStore();

    const { data: activitiesData, isLoading: activitiesLoading } = useQuery({
        queryKey: ['activities'],
        queryFn: async () => {
            const res = await fetch('/api/activities');
            if (!res.ok) throw new Error();
            return res.json();
        },
        enabled: isAuthenticated,
    });

    const { data: hotelsData, isLoading: hotelsLoading } = useQuery({
        queryKey: ['hotels'],
        queryFn: async () => {
            const res = await fetch('/api/hotels');
            if (!res.ok) throw new Error();
            return res.json();
        },
        enabled: isAuthenticated,
    });

    const { data: flightsData, isLoading: flightsLoading } = useQuery({
        queryKey: ['flights'],
        queryFn: async () => {
            const res = await fetch('/api/flights');
            if (!res.ok) throw new Error();
            return res.json();
        },
        enabled: isAuthenticated,
    });

    // Helper function to parse flight times consistently (same logic as FlightsList.jsx)
    const parseFlightTime = (isoString) => {
        if (!isoString) return { date: '', time: '' };
        const normalized = isoString.replace(' ', 'T');
        const dateMatch = normalized.match(/^(\d{4}-\d{2}-\d{2})/);
        const timeMatch = normalized.match(/T(\d{2}:\d{2})/);
        return {
            date: dateMatch ? dateMatch[1] : '',
            time: timeMatch ? timeMatch[1] : '',
        };
    };

    const timelineItems = useMemo(() => {
        const items = [];

        if (activitiesData?.activities) {
            activitiesData.activities.forEach(act => {
                if (act.planned_date) {
                    items.push({
                        id: `act_${act.id}`,
                        entityId: act.id,
                        type: 'activity',
                        date: act.planned_date,
                        time: act.planned_time || null,
                        title: act.title,
                        description: act.description,
                        isCompleted: act.completed,
                        lat: act.latitude || act.lat,
                        lon: act.longitude || act.lon,
                        activityType: act.type
                    });
                } else {
                    items.push({
                        id: `act_${act.id}`,
                        entityId: act.id,
                        type: 'activity',
                        date: '9999-12-31',
                        time: act.planned_time || null,
                        title: act.title,
                        description: act.description,
                        isUnplanned: true,
                        isCompleted: act.completed,
                    });
                }
            });
        }

        if (hotelsData?.all) {
            hotelsData.all.forEach(hotel => {
                if (hotel.check_in_date) {
                    items.push({
                        id: `hotel_in_${hotel.id}`,
                        entityId: hotel.id,
                        type: 'hotel_in',
                        date: hotel.check_in_date,
                        time: hotel.check_in_time || null,
                        title: `Check-in: ${hotel.name}`,
                        lat: hotel.latitude,
                        lon: hotel.longitude,
                        address: hotel.address
                    });
                }
                if (hotel.check_out_date && hotel.check_out_date !== hotel.check_in_date) {
                    items.push({
                        id: `hotel_out_${hotel.id}`,
                        entityId: hotel.id,
                        type: 'hotel_out',
                        date: hotel.check_out_date,
                        time: hotel.check_out_time || null,
                        title: `Check-out: ${hotel.name}`,
                    });
                }
            });
        }

        if (flightsData?.flights) {
            flightsData.flights.forEach(flight => {
                if (flight.departure_time) {
                    const parsedDeparture = parseFlightTime(flight.departure_time);
                    items.push({
                        id: `flight_out_${flight.id}`,
                        entityId: flight.id,
                        type: 'flight_out',
                        date: parsedDeparture.date,
                        time: parsedDeparture.time,
                        title: `Abflug: ${flight.flight_number} (${flight.departure_iata} → ${flight.arrival_iata})`,
                        description: 'Dauer: ' + (flight.duration ? flight.duration.replace(/PT(?:(\d+)H)?(?:(\d+)M)?/, (m, h, min) => `${h || 0}h ${min || 0}m`) : ''),
                        scheduled_status: flight.scheduled_status
                    });
                }
                if (flight.arrival_time) {
                    const parsedArrival = parseFlightTime(flight.arrival_time);
                    items.push({
                        id: `flight_in_${flight.id}`,
                        entityId: flight.id,
                        type: 'flight_in',
                        date: parsedArrival.date,
                        time: parsedArrival.time,
                        title: `Ankunft: ${flight.flight_number} (${flight.departure_iata} → ${flight.arrival_iata})`,
                        scheduled_status: flight.scheduled_status
                    });
                }
            });
        }

        // Sort items by date ascending, then by time within same date
        items.sort((a, b) => {
            if (a.date === b.date) {
                // Within activities, sort by time (items without time go last)
                if (a.time && b.time) {
                    const timeOrder = a.time.localeCompare(b.time);
                    if (timeOrder !== 0) return timeOrder;
                } else if (a.time) {
                    return -1;
                } else if (b.time) {
                    return 1;
                }

                // If times are equal or both missing, sort by type
                // Sort check-ins before activities, check-outs after activities
                const order = { 'flight_out': 1, 'flight_in': 2, 'hotel_in': 3, 'activity': 4, 'hotel_out': 5 };
                return (order[a.type] || 2) - (order[b.type] || 2);
            }
            return a.date.localeCompare(b.date);
        });

        // Group by Date
        const grouped = {};
        items.forEach(item => {
            const dateKey = item.date;
            if (!grouped[dateKey]) grouped[dateKey] = [];
            grouped[dateKey].push(item);
        });

        return grouped;
    }, [activitiesData, hotelsData, flightsData]);

    const formatDate = (dateStr) => {
        if (dateStr === '9999-12-31') return 'Ohne festes Datum';
        const date = new Date(dateStr + 'T12:00:00Z');
        return date.toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const isToday = (dateStr) => {
        if (dateStr === '9999-12-31') return false;
        const today = new Date();
        const date = new Date(dateStr + 'T12:00:00Z');
        return date.toDateString() === today.toDateString();
    };


    // Loading state
    if (activitiesLoading || hotelsLoading || flightsLoading) {
        return (
            <div className="space-y-6 p-4 pb-8">
                {[1, 2, 3].map(i => (
                    <div key={i} className="space-y-3 animate-pulse">
                        <div className="h-6 bg-ios-gray-200 dark:bg-ios-gray-800 rounded w-40"></div>
                        <div className="flex gap-4">
                            <div className="w-10 h-10 bg-ios-gray-200 dark:bg-ios-gray-800 rounded-full flex-shrink-0"></div>
                            <div className="flex-1 bg-ios-gray-100 dark:bg-ios-gray-800 rounded-ios-xl p-4 space-y-2">
                                <div className="h-5 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-3/4"></div>
                                <div className="h-4 bg-ios-gray-200 dark:bg-ios-gray-700 rounded w-1/2"></div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (Object.keys(timelineItems).length === 0) {
        return (
            <div className="text-center py-16 px-4">
                <Compass className="w-16 h-16 mx-auto text-ios-gray-300 dark:text-ios-gray-700 mb-4" />
                <h3 className="text-lg font-semibold text-ios-gray-900 dark:text-white mb-2">
                    Noch keine Timeline
                </h3>
                <p className="text-ios-gray-500 dark:text-ios-gray-400 mb-6">
                    Füge Hotels und Aktivitäten hinzu, um deine Reise-Timeline zu erstellen.
                </p>
                {onNavigate && (
                    <button
                        onClick={() => onNavigate({ tab: 'planning', view: 'activities' })}
                        className="px-6 py-3 bg-ios-blue text-white rounded-ios-lg font-medium
                                 shadow-ios transition-all active:scale-95"
                    >
                        Erste Aktivität hinzufügen
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="space-y-6 p-4 pb-8 overflow-hidden animate-fade-in">
            {Object.entries(timelineItems).map(([date, items]) => {
                const todayFlag = isToday(date);
                return (
                    <div key={date}>
                        <div className={`sticky top-0 z-20 backdrop-blur-ios py-2 px-4 -mx-4 mb-3 border-y shadow-sm flex items-center gap-2 ${todayFlag
                            ? 'bg-ios-blue/95 border-ios-blue text-white'
                            : 'bg-ios-gray-50/95 dark:bg-ios-gray-950/95 border-ios-gray-200 dark:border-ios-gray-800'
                            }`}>
                            <Calendar className={`w-4 h-4 ${todayFlag ? 'text-white' : 'text-ios-blue'}`} />
                            <h3 className={`font-bold text-sm uppercase tracking-wider flex-1 ${todayFlag ? 'text-white' : 'text-ios-blue'
                                }`}>
                                {formatDate(date)}
                            </h3>
                            {todayFlag && (
                                <span className="text-xs font-semibold bg-white/20 px-2 py-0.5 rounded-full">
                                    HEUTE
                                </span>
                            )}
                        </div>

                        <div className="space-y-4 relative before:absolute before:inset-0 before:ml-[19px] before:-translate-x-px before:h-full before:w-0.5 before:bg-ios-gray-200 dark:before:bg-ios-gray-700">
                            {items.map((item, idx) => {
                                // Calculate time gap to previous item
                                let gapElement = null;
                                if (idx > 0) {
                                    const prev = items[idx - 1];
                                    if (prev.time && item.time && prev.time < item.time) {
                                        const [ph, pm] = prev.time.split(':').map(Number);
                                        const [ch, cm] = item.time.split(':').map(Number);
                                        const diffMins = (ch * 60 + cm) - (ph * 60 + pm);
                                        if (diffMins >= 15) {
                                            const h = Math.floor(diffMins / 60);
                                            const m = diffMins % 60;
                                            const label = h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                                            gapElement = (
                                                <div key={`gap_${item.id}`} className="relative flex items-center pl-14 pr-1">
                                                    <div className="flex-1 flex items-center gap-2">
                                                        <div className="flex-1 h-px border-t border-dashed border-ios-gray-300 dark:border-ios-gray-600" />
                                                        <span className="text-[11px] text-ios-gray-400 dark:text-ios-gray-500 font-medium whitespace-nowrap select-none">
                                                            {label}
                                                        </span>
                                                        <div className="flex-1 h-px border-t border-dashed border-ios-gray-300 dark:border-ios-gray-600" />
                                                    </div>
                                                </div>
                                            );
                                        }
                                    }
                                }

                                return (
                                    <React.Fragment key={item.id}>
                                        {gapElement}
                                        <div className="relative flex items-start gap-4">
                                            {/* Node indicator */}
                                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 bg-white dark:bg-ios-gray-800 shrink-0 z-10 shadow-sm text-sm
                                    ${item.type === 'hotel_in' ? 'border-ios-indigo' :
                                                    item.type === 'hotel_out' ? 'border-ios-orange' :
                                                        item.type === 'flight_out' || item.type === 'flight_in' ? 'border-ios-blue' :
                                                            item.isCompleted ? 'border-ios-green' : 'border-ios-blue'
                                                }`}>
                                                {item.type === 'activity' ? (item.isCompleted ? '✔️' : '📍') :
                                                    item.type === 'hotel_in' ? '🏨' :
                                                        item.type === 'flight_out' ? <PlaneTakeoff className="w-5 h-5 text-ios-blue" /> :
                                                            item.type === 'flight_in' ? <PlaneLanding className="w-5 h-5 text-ios-blue" /> : '👋'}
                                            </div>

                                            {/* Card */}
                                            <button
                                                onClick={() => {
                                                    if (!onNavigate) return;
                                                    if (item.type === 'activity') {
                                                        onNavigate({ tab: 'planning', view: 'activities', id: item.entityId });
                                                    } else if (item.type.startsWith('hotel')) {
                                                        onNavigate({ tab: 'planning', view: 'hotels', id: item.entityId });
                                                    } else if (item.type.startsWith('flight')) {
                                                        onNavigate({ tab: 'planning', view: 'flights', id: item.entityId });
                                                    }
                                                }}
                                                className="flex-1 min-w-0 bg-white dark:bg-ios-gray-800 p-4 rounded-ios-xl shadow-ios border border-ios-gray-100 dark:border-ios-gray-700 text-left transition-colors active:bg-ios-gray-50 dark:active:bg-ios-gray-700"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <h4 className={`font-semibold text-ios-gray-950 dark:text-white flex-1 truncate ${item.isCompleted ? 'line-through text-ios-gray-400' : ''}`}>
                                                        {item.title}
                                                    </h4>
                                                    {item.time && (
                                                        <span className="text-xs font-medium text-ios-blue bg-ios-blue/10 px-2 py-0.5 rounded-full flex-shrink-0">
                                                            {item.time}
                                                        </span>
                                                    )}
                                                </div>
                                                {item.description && (
                                                    <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 mt-1 leading-relaxed">
                                                        {item.description}
                                                    </p>
                                                )}
                                                {item.address && item.type === 'hotel_in' && (
                                                    <p className="text-xs text-ios-gray-500 mt-2 flex items-center gap-1">
                                                        <span className="truncate">{item.address}</span>
                                                    </p>
                                                )}
                                            </button>
                                        </div>
                                    </React.Fragment>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
