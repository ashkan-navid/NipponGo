'use client';

import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import {
    Plane, Hotel, MapPin, Package, BookOpen, CalendarDays,
    ChevronRight, Sparkles, CheckCircle2, Clock, Sun, CloudRain,
    Cloud, CloudSnow, Wind, Zap, CloudFog,
    Book, Coins, ShieldAlert, Languages, Info, Brain, Wallet
} from 'lucide-react';
import PACKING_CATEGORIES from '../lib/packingList';
import JAPAN_FACTS from '../lib/japanFacts';

const MapComponent = dynamic(() => import('./Map'), { ssr: false });

// Weather icon mapping
const WEATHER_ICONS = {
    '01': Sun, '02': Cloud, '03': Cloud, '04': Cloud,
    '09': CloudRain, '10': CloudRain, '11': Zap,
    '13': CloudSnow, '50': CloudFog,
};

function getWeatherIcon(iconCode) {
    if (!iconCode) return Sun;
    const prefix = iconCode.substring(0, 2);
    return WEATHER_ICONS[prefix] || Cloud;
}

// Format date to German locale
function formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('de-DE', {
        weekday: 'short', day: '2-digit', month: '2-digit',
    });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // HH:MM
}

// Format date with optional time
function formatDateWithTime(dateStr, timeStr) {
    if (!dateStr) return '';
    const formatted = new Date(dateStr).toLocaleDateString('de-DE', {
        weekday: 'short', day: '2-digit', month: '2-digit',
    });
    if (timeStr) {
        return `${formatted} · ${formatTime(timeStr)}`;
    }
    return formatted;
}

export default function Dashboard({
    hotels = [],
    activities = [],
    flights = [],
    tripCountdown,
    onTabChange,
    onLoginRequired,
    invitationsData,
    weather,
    forecast,
    user,
    isAuthenticated,
}) {
    // Japan fact of the day (deterministic based on date)
    const todayDate = new Date().toDateString();
    const factSeed = todayDate.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
    const [factOffset, setFactOffset] = useState(0);
    const currentFact = JAPAN_FACTS[(factSeed + factOffset) % JAPAN_FACTS.length];

    const today = useMemo(() => {
        const d = new Date();
        d.setHours(0, 0, 0, 0);
        return d;
    }, []);

    const todayStr = useMemo(() => today.toISOString().split('T')[0], [today]);

    // Today's hotel (check-in <= today < check-out)
    const todayHotel = useMemo(() => {
        return hotels.find(h => {
            if (!h.check_in_date || !h.check_out_date) return false;
            const checkIn = new Date(h.check_in_date);
            const checkOut = new Date(h.check_out_date);
            checkIn.setHours(0, 0, 0, 0);
            checkOut.setHours(0, 0, 0, 0);
            return checkIn <= today && today < checkOut;
        });
    }, [hotels, today]);

    // Today's activities
    const todayActivities = useMemo(() => {
        return activities.filter(a => a.planned_date === todayStr);
    }, [activities, todayStr]);

    // Today's flights
    const todayFlights = useMemo(() => {
        return flights.filter(f => {
            if (!f.departure_time) return false;
            return f.departure_time.startsWith(todayStr);
        });
    }, [flights, todayStr]);

    // Upcoming events (next 5, excluding today)
    const upcomingEvents = useMemo(() => {
        const events = [];
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        hotels.forEach(h => {
            if (h.check_in_date) {
                const d = new Date(h.check_in_date);
                d.setHours(0, 0, 0, 0);
                if (d >= tomorrow) {
                    events.push({ type: 'hotel-in', date: d, item: h, label: `Check-in: ${h.name}`, icon: '🏨' });
                }
            }
            if (h.check_out_date) {
                const d = new Date(h.check_out_date);
                d.setHours(0, 0, 0, 0);
                if (d >= tomorrow) {
                    events.push({ type: 'hotel-out', date: d, item: h, label: `Check-out: ${h.name}`, icon: '🚪' });
                }
            }
        });

        activities.filter(a => !a.completed && a.planned_date).forEach(a => {
            const d = new Date(a.planned_date);
            d.setHours(0, 0, 0, 0);
            if (d >= tomorrow) {
                const typeEmoji = { temple: '⛩️', restaurant: '🍜', shopping: '🛍️', park: '🌸', museum: '🏛️', entertainment: '🎮', landmark: '🗼' };
                events.push({ type: 'activity', date: d, item: a, label: a.title, icon: typeEmoji[a.type] || '📍' });
            }
        });

        flights.forEach(f => {
            if (f.departure_time) {
                const d = new Date(f.departure_time);
                if (d >= tomorrow) {
                    events.push({ type: 'flight', date: d, item: f, label: `${f.departure_iata} → ${f.arrival_iata}`, icon: '✈️' });
                }
            }
        });

        return events.sort((a, b) => a.date - b.date).slice(0, 5);
    }, [hotels, activities, flights, today]);

    // Progress stats
    const activityProgress = useMemo(() => {
        const total = activities.length;
        const completed = activities.filter(a => a.completed).length;
        return { total, completed, percent: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }, [activities]);

    // Packing list data (for before-trip progress)
    const { data: packingData } = useQuery({
        queryKey: ['packing'],
        queryFn: async () => {
            const res = await fetch('/api/packing?sync=true', { credentials: 'same-origin' });
            if (!res.ok) return { items: [] };
            return res.json();
        },
        enabled: isAuthenticated,
        staleTime: 30000,
    });

    const packingProgress = useMemo(() => {
        if (!packingData?.items) return { total: 0, checked: 0, percent: 0 };
        const items = packingData.items;
        const friendItems = packingData.friendItems || [];
        let total = 0, checked = 0;
        Object.entries(PACKING_CATEGORIES).forEach(([key, cat]) => {
            cat.items.forEach(defItem => {
                total++;
                const userItem = items.find(i => i.category === key && i.item_text === defItem);
                const friendChecked = friendItems.some(
                    i => i.category === key && i.item_text === defItem && i.is_checked
                );
                if ((userItem && userItem.is_checked) || friendChecked) checked++;
            });
        });
        // Custom items (own)
        const customItems = items.filter(i => i.is_custom);
        total += customItems.length;
        checked += customItems.filter(i => i.is_checked).length;
        // Friend custom items not already in own list
        const friendCustom = friendItems.filter(i => i.is_custom);
        friendCustom.forEach(fi => {
            if (!customItems.some(ci => ci.item_text === fi.item_text && ci.category === fi.category)) {
                total++;
                if (fi.is_checked) checked++;
            }
        });
        return { total, checked, percent: total > 0 ? Math.round((checked / total) * 100) : 0 };
    }, [packingData]);

    // Friends online count
    const friendCount = invitationsData?.shared?.length || 0;

    // Determine hero state
    const isOnTrip = todayHotel != null;
    const isTripOver = !isOnTrip && tripCountdown === null && hotels.length > 0;

    // Unauthenticated state
    if (!isAuthenticated) {
        return (
            <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                <div className="text-6xl mb-4">🇯🇵</div>
                <h1 className="text-2xl font-bold text-ios-gray-950 dark:text-white mb-2">
                    Willkommen bei NipponGo
                </h1>
                <p className="text-ios-gray-500 dark:text-ios-gray-400 mb-6 max-w-sm">
                    Dein persönlicher Japan-Reisebegleiter. Melde dich an, um deine Reise zu planen.
                </p>
                <button
                    onClick={onLoginRequired}
                    className="px-6 py-3 bg-ios-blue text-white font-semibold rounded-ios-xl
                             shadow-ios transition-all active:scale-95"
                >
                    Anmelden
                </button>
            </div>
        );
    }

    const WeatherIcon = weather ? getWeatherIcon(weather?.icon) : Sun;

    return (
        <div className="h-full overflow-y-auto overscroll-y-contain pb-safe">
            {/* Hero Section */}
            <div className={`relative overflow-hidden px-5 pt-5 pb-6 ${isOnTrip
                ? 'bg-gradient-to-br from-pink-500 via-rose-400 to-orange-300 dark:from-pink-800 dark:via-rose-700 dark:to-orange-600'
                : 'bg-gradient-to-br from-indigo-500 via-blue-500 to-cyan-400 dark:from-indigo-800 dark:via-blue-700 dark:to-cyan-600'
                }`}>
                {/* Decorative elements */}
                <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-white/10 -translate-y-8 translate-x-8" />
                <div className="absolute bottom-0 left-0 w-24 h-24 rounded-full bg-white/5 translate-y-8 -translate-x-8" />

                {/* Sakura petals during trip */}
                {isOnTrip && (
                    <div aria-hidden="true" className="absolute inset-0 overflow-hidden pointer-events-none">
                        {[12, 28, 45, 62, 78].map((x, i) => (
                            <span
                                key={i}
                                className="sakura-petal"
                                style={{
                                    '--petal-x': `${x}%`,
                                    '--petal-delay': `${i * 1.2}s`,
                                    '--petal-duration': `${5 + i * 0.8}s`,
                                    animationIterationCount: 'infinite',
                                }}
                            >🌸</span>
                        ))}
                    </div>
                )}

                <div className="relative z-10">
                    <p className="text-white/80 text-sm font-medium mb-1">
                        {isOnTrip ? '🌸 Du bist in Japan!' : isTripOver ? 'Reise abgeschlossen' : 'Deine Japan-Reise'}
                    </p>

                    {isOnTrip ? (
                        <>
                            <h1 className="text-2xl font-bold text-white mb-3">
                                {todayHotel.name}
                            </h1>
                            {todayHotel.address && (
                                <p className="text-white/70 text-sm flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5" />
                                    {todayHotel.address}
                                </p>
                            )}
                        </>
                    ) : tripCountdown !== null && tripCountdown >= 0 ? (
                        <>
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-5xl font-extrabold text-white tabular-nums">
                                    {tripCountdown}
                                </span>
                                <span className="text-xl font-semibold text-white/80">
                                    {tripCountdown === 1 ? 'Tag' : 'Tage'}
                                </span>
                            </div>
                            <p className="text-white/70 text-sm">bis zum Abflug ✈️</p>
                        </>
                    ) : (
                        <h1 className="text-2xl font-bold text-white">
                            Hallo{user?.username ? `, ${user.username}` : ''}! 👋
                        </h1>
                    )}

                    {/* Weather pill */}
                    {weather && weather.temp !== null && (
                        <div className="mt-3 inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm
                                      rounded-full px-3 py-1.5 text-white text-sm font-medium">
                            <WeatherIcon className="w-4 h-4" />
                            {weather.temp}°{weather.description ? ` · ${weather.description}` : ''} · {weather.city || 'Tokyo'}
                        </div>
                    )}
                </div>
            </div>

            {/* Weather Forecast */}
            {forecast && forecast.length > 0 && (
                <div className="px-4 mt-4">
                    <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                        <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                            📅 Wetter-Vorhersage
                        </h2>
                        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
                            {forecast.map((day) => {
                                const FIcon = getWeatherIcon(day.icon);
                                const dayName = new Date(day.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' });
                                return (
                                    <div key={day.date}
                                        className="flex-shrink-0 w-[72px] text-center p-2.5 rounded-ios-lg
                                                   bg-ios-gray-50 dark:bg-ios-gray-800"
                                    >
                                        <p className="text-xs font-semibold text-ios-gray-600 dark:text-ios-gray-300">{dayName}</p>
                                        <FIcon className="w-6 h-6 mx-auto my-1.5 text-ios-blue" />
                                        <div className="flex items-center justify-center gap-1 text-xs">
                                            <span className="font-bold text-ios-gray-950 dark:text-white">{day.max}°</span>
                                            <span className="text-ios-gray-400">{day.min}°</span>
                                        </div>
                                        {day.pop > 20 && (
                                            <p className="text-[10px] text-ios-blue mt-1">💧 {day.pop}%</p>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            <div className="px-4 mt-4 space-y-4 pb-6">
                {/* Today Section */}
                {(todayFlights.length > 0 || todayActivities.length > 0 || todayHotel) && (
                    <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                        <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                            📅 Heute
                        </h2>
                        <div className="space-y-2.5">
                            {todayFlights.map(f => (
                                <button key={f.id} onClick={() => onTabChange('planning')}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-ios-lg
                                             bg-ios-gray-50 dark:bg-ios-gray-800 text-left transition-all active:scale-[0.98]">
                                    <div className="w-9 h-9 rounded-ios bg-sky-100 dark:bg-sky-900/40 flex items-center justify-center text-lg">✈️</div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-semibold text-ios-gray-950 dark:text-white truncate">
                                            {f.departure_iata} → {f.arrival_iata}
                                        </p>
                                        <p className="text-xs text-ios-gray-500">
                                            {f.airline || f.flight_number} · {f.departure_time ? formatTime(f.departure_time.split('T')[1] || '') : ''}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-4 h-4 text-ios-gray-400 shrink-0" />
                                </button>
                            ))}
                            {todayActivities.map(a => (
                                <button key={a.id} onClick={() => onTabChange('planning')}
                                    className="w-full flex items-center gap-3 p-2.5 rounded-ios-lg
                                             bg-ios-gray-50 dark:bg-ios-gray-800 text-left transition-all active:scale-[0.98]">
                                    <div className={`w-9 h-9 rounded-ios flex items-center justify-center text-lg
                                        ${a.completed ? 'bg-green-100 dark:bg-green-900/40' : 'bg-indigo-100 dark:bg-indigo-900/40'}`}>
                                        {a.completed ? '✅' : ({ temple: '⛩️', restaurant: '🍜', shopping: '🛍️', park: '🌸', museum: '🏛️', entertainment: '🎮', landmark: '🗼' }[a.type] || '📍')}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className={`text-sm font-semibold truncate ${a.completed ? 'text-ios-gray-400 line-through' : 'text-ios-gray-950 dark:text-white'}`}>
                                            {a.title}
                                        </p>
                                        {a.planned_time && (
                                            <p className="text-xs text-ios-gray-500">{formatTime(a.planned_time)}</p>
                                        )}
                                    </div>
                                    {a.completed && <CheckCircle2 className="w-4 h-4 text-ios-green shrink-0" />}
                                    {!a.completed && <ChevronRight className="w-4 h-4 text-ios-gray-400 shrink-0" />}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Quick Actions */}
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                    <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                        ⚡ Schnellzugriff
                    </h2>
                    <div className="grid grid-cols-4 gap-2">
                        {[
                            { view: 'phrasebook', icon: Book, label: 'Wörterbuch', bg: 'bg-blue-100 dark:bg-blue-900/30', fg: 'text-blue-600 dark:text-blue-400' },
                            { view: 'etiquette', icon: BookOpen, label: 'Knigge', bg: 'bg-purple-100 dark:bg-purple-900/30', fg: 'text-purple-600 dark:text-purple-400' },
                            { view: 'currency', icon: Coins, label: 'Währung', bg: 'bg-amber-100 dark:bg-amber-900/30', fg: 'text-amber-600 dark:text-amber-400' },
                            { view: 'emergency', icon: ShieldAlert, label: 'Notfall', bg: 'bg-red-100 dark:bg-red-900/30', fg: 'text-red-600 dark:text-red-400' },
                            { view: 'kanji', icon: Languages, label: 'Kanji', bg: 'bg-teal-100 dark:bg-teal-900/30', fg: 'text-teal-600 dark:text-teal-400' },
                            { view: 'japaninfo', icon: Info, label: 'Japan-Info', bg: 'bg-emerald-100 dark:bg-emerald-900/30', fg: 'text-emerald-600 dark:text-emerald-400' },
                            { view: 'quiz', icon: Brain, label: 'Quiz', bg: 'bg-pink-100 dark:bg-pink-900/30', fg: 'text-pink-600 dark:text-pink-400' },
                            { view: 'budget', icon: Wallet, label: 'Budget', bg: 'bg-orange-100 dark:bg-orange-900/30', fg: 'text-orange-600 dark:text-orange-400' },
                        ].map(({ view, icon: Icon, label, bg, fg }) => (
                            <button
                                key={view}
                                onClick={() => onTabChange('discover', view)}
                                className="flex flex-col items-center gap-1.5 p-2.5 rounded-ios-xl
                                         bg-ios-gray-50 dark:bg-ios-gray-800
                                         transition-all active:scale-[0.95] text-center"
                            >
                                <div className={`w-9 h-9 rounded-ios-lg flex items-center justify-center ${bg} ${fg}`}>
                                    <Icon className="w-4.5 h-4.5" />
                                </div>
                                <span className="text-[11px] font-medium text-ios-gray-700 dark:text-ios-gray-300 leading-tight">{label}</span>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Japan Fact of the Day */}
                <div className="bg-gradient-to-br from-rose-50 to-orange-50 dark:from-ios-gray-900 dark:to-ios-gray-900
                              rounded-ios-xl shadow-ios p-4 animate-fade-in
                              border border-rose-100/50 dark:border-ios-gray-800">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                            🎌 Wusstest du schon?
                        </h2>
                        <button
                            onClick={() => setFactOffset(prev => prev + 1)}
                            className="text-xs text-ios-blue font-medium px-2 py-1 rounded-ios
                                     active:opacity-70 transition-opacity"
                        >
                            Nächster →
                        </button>
                    </div>
                    <p className="text-sm text-ios-gray-700 dark:text-ios-gray-300 leading-relaxed">
                        {currentFact}
                    </p>
                </div>

                {/* Progress Section - conditional based on trip status */}
                {(!isOnTrip && tripCountdown !== null && tripCountdown > 0) ? (
                    // Before trip: Show packing progress
                    <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                        <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                            📦 Packlisten-Fortschritt
                        </h2>
                        <div>
                            <div className="flex items-center justify-between mb-1.5">
                                <span className="text-sm font-medium text-ios-gray-700 dark:text-ios-gray-300">Gepackt</span>
                                <span className="text-xs font-semibold text-ios-blue">
                                    {packingProgress.checked}/{packingProgress.total}
                                </span>
                            </div>
                            <div className="h-2.5 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-ios-blue to-ios-green rounded-full transition-all duration-500"
                                    style={{ width: `${packingProgress.percent}%` }}
                                />
                            </div>
                            <p className="text-xs text-ios-gray-500 mt-2">
                                {packingProgress.percent}% bereit für die Reise
                            </p>
                        </div>
                        <button
                            onClick={() => onTabChange('packing')}
                            className="mt-3 w-full text-center text-sm text-ios-blue font-medium
                                     hover:underline transition-colors"
                        >
                            Zur Packliste →
                        </button>
                    </div>
                ) : (
                    // During/after trip: Show activity progress (if activities exist)
                    activities.length > 0 && (
                        <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                            <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                                📊 Reise-Fortschritt
                            </h2>
                            <div className="space-y-3">
                                {/* Activities progress */}
                                <div>
                                    <div className="flex items-center justify-between mb-1.5">
                                        <span className="text-sm font-medium text-ios-gray-700 dark:text-ios-gray-300">Aktivitäten</span>
                                        <span className="text-xs font-semibold text-ios-indigo">
                                            {activityProgress.completed}/{activityProgress.total}
                                        </span>
                                    </div>
                                    <div className="h-2 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
                                            style={{ width: `${activityProgress.percent}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )
                )}

                {/* Upcoming Events */}
                {upcomingEvents.length > 0 && (
                    <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                        <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                            🗓️ Nächste Events
                        </h2>
                        <div className="space-y-2">
                            {upcomingEvents.map((event, i) => (
                                <div key={`${event.type}-${i}`}
                                    className="flex items-center gap-3 p-2 rounded-ios-lg">
                                    <div className="w-8 h-8 rounded-ios bg-ios-gray-100 dark:bg-ios-gray-800
                                                  flex items-center justify-center text-base shrink-0">
                                        {event.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-ios-gray-950 dark:text-white truncate">
                                            {event.label}
                                        </p>
                                        <p className="text-xs text-ios-gray-500">
                                            {(() => {
                                                const dateStr = event.date.toISOString();
                                                let timeStr = null;
                                                if (event.type === 'activity' && event.item.planned_time) {
                                                    timeStr = event.item.planned_time;
                                                } else if (event.type === 'hotel-in' && event.item.check_in_time) {
                                                    timeStr = event.item.check_in_time;
                                                } else if (event.type === 'hotel-out' && event.item.check_out_time) {
                                                    timeStr = event.item.check_out_time;
                                                } else if (event.type === 'flight' && event.item.departure_time) {
                                                    const dt = new Date(event.item.departure_time);
                                                    timeStr = dt.toTimeString().substring(0, 5);
                                                }
                                                return formatDateWithTime(dateStr, timeStr);
                                            })()}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <button
                            onClick={() => onTabChange('timeline')}
                            className="mt-3 w-full text-center text-sm text-ios-blue font-medium
                                     hover:underline transition-colors"
                        >
                            Alle Events anzeigen →
                        </button>
                    </div>
                )}

                {/* Trip Stats */}
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4 animate-fade-in">
                    <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider mb-3">
                        🗾 Reise-Übersicht
                    </h2>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-2xl font-bold text-ios-orange">{hotels.length}</p>
                            <p className="text-xs text-ios-gray-500">Hotels</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-ios-indigo">{activities.length}</p>
                            <p className="text-xs text-ios-gray-500">Aktivitäten</p>
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-sky-500">{flights.length}</p>
                            <p className="text-xs text-ios-gray-500">Flüge</p>
                        </div>
                    </div>
                    {friendCount > 0 && (
                        <div className="mt-3 pt-3 border-t border-ios-gray-100 dark:border-ios-gray-800 text-center">
                            <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400">
                                👥 {friendCount} {friendCount === 1 ? 'Reisepartner' : 'Reisepartner'}
                            </p>
                        </div>
                    )}
                </div>

                {/* Map Card - always at the end */}
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios overflow-hidden animate-fade-in">
                    <div className="p-4 border-b border-ios-gray-200 dark:border-ios-gray-800">
                        <h2 className="text-sm font-semibold text-ios-gray-500 dark:text-ios-gray-400 uppercase tracking-wider">
                            🗺️ Karte
                        </h2>
                    </div>
                    <div className="h-64">
                        <MapComponent
                            hotels={hotels}
                            activities={activities}
                            showWeather={false}
                            autoLocate={true}
                        />
                    </div>
                </div>

                {/* Empty state */}
                {hotels.length === 0 && activities.length === 0 && flights.length === 0 && (
                    <div className="text-center py-8 animate-fade-in">
                        <div className="text-5xl mb-3">✨</div>
                        <h3 className="text-lg font-bold text-ios-gray-950 dark:text-white mb-1">
                            Starte deine Reiseplanung
                        </h3>
                        <p className="text-sm text-ios-gray-500 dark:text-ios-gray-400 mb-4 max-w-xs mx-auto">
                            Füge Hotels, Aktivitäten und Flüge hinzu, um dein Dashboard zu füllen.
                        </p>
                        <button
                            onClick={() => onTabChange('planning')}
                            className="inline-flex items-center gap-2 px-5 py-2.5 bg-ios-blue text-white
                                     font-semibold rounded-ios-xl shadow-ios transition-all active:scale-95"
                        >
                            <Sparkles className="w-4 h-4" />
                            Jetzt planen
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
