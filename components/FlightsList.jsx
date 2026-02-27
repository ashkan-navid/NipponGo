'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    Plane, PlaneTakeoff, PlaneLanding, Clock,
    Trash2, Plus, X, Edit2, RefreshCw
} from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import { hapticLight, hapticSuccess, hapticError } from '../lib/haptics';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import ConfirmDialog from './ConfirmDialog';
import PullToRefresh from './PullToRefresh';

export default function FlightsList({ emitDataChanged, highlightId, onHighlightDone }) {
    const addToast = useToastStore((s) => s.addToast);
    const { isAuthenticated } = useAuthStore();
    const queryClient = useQueryClient();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, flight: null });
    const [formData, setFormData] = useState({ flight_number: '', date: '', type: 'outbound' });

    const { data: flightsData, isLoading, isFetching, error, refetch } = useQuery({
        queryKey: ['flights'],
        queryFn: async () => {
            const res = await fetch('/api/flights');
            if (res.status === 401) return { flights: [] };
            if (!res.ok) throw new Error('Fehler beim Laden der Flüge');
            return res.json();
        },
        enabled: isAuthenticated,
        retry: 1,
        retryDelay: 300,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
    });

    const flights = flightsData?.flights || [];

    const handleRefresh = async () => {
        await refetch();
    };

    const createMutation = useMutation({
        mutationFn: async (newFlight) => {
            const res = await apiFetch('/api/flights', {
                method: 'POST',
                body: JSON.stringify(newFlight),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Fehler beim Anlegen');
            }
            return res.json();
        },
        onSuccess: (data) => {
            hapticSuccess();
            addToast('Flug hinzugefügt', 'success');
            setIsFormOpen(false);
            setFormData({ flight_number: '', date: '', type: 'outbound' });
            emitDataChanged?.('flights', 'add', data?.flight_number);
        },
        onError: (err) => {
            hapticError();
            addToast(err.message, 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['flights'] });
        },
    });

    const deleteMutation = useMutation({
        mutationFn: async ({ id }) => {
            const res = await apiFetch(`/api/flights?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Fehler beim Löschen');
            return res.json();
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['flights'] });
            const prev = queryClient.getQueryData(['flights']);
            queryClient.setQueryData(['flights'], (old) => {
                if (!old?.flights) return old;
                return { ...old, flights: old.flights.filter(f => f.id !== id) };
            });
            return { prev };
        },
        onSuccess: (_data, { flightNumber }) => {
            hapticSuccess();
            addToast('Flug gelöscht', 'success');
            emitDataChanged?.('flights', 'delete', flightNumber);
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['flights'], ctx.prev);
            hapticError();
            addToast(err.message || 'Fehler beim Löschen', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['flights'] });
        },
    });

    const handleCreate = (e) => {
        e.preventDefault();
        if (!formData.flight_number || !formData.date) {
            addToast('Bitte Flugnummer und Datum eingeben', 'error');
            return;
        }
        createMutation.mutate(formData);
    };

    const parseTimezoneString = (isoString) => {
        if (!isoString) return { timeStr: '--:--', dateStr: '', tzStr: '' };

        // Example format from API: "2026-02-22 17:25+01:00" or "2026-02-22T17:25+01:00"
        // Also handling UTC 'Z' or missing timezone gracefully
        const normalizedStr = isoString.replace(' ', 'T');

        try {
            // If the string contains explicit offsets like '+01:00' or '-05:00' or 'Z'
            const timeMatch = normalizedStr.match(/T(\d{2}:\d{2})(:\d{2})?(.*)$/);
            const dateMatch = normalizedStr.match(/^(\d{4})-(\d{2})-(\d{2})/);

            if (timeMatch && dateMatch) {
                const timeStr = timeMatch[1]; // "17:25"
                const tzStrRaw = timeMatch[3]; // "+01:00" or "Z"

                let tzParsed = '';
                if (tzStrRaw && tzStrRaw !== 'Z' && tzStrRaw !== '') {
                    // Extract just the hours for a cleaner UI, e.g. "+01:00" -> "+01"
                    const offsetMatch = tzStrRaw.match(/^([+-]\d{2})/);
                    if (offsetMatch) {
                        tzParsed = `(UTC${offsetMatch[1]})`;
                    }
                } else if (tzStrRaw === 'Z') {
                    tzParsed = '(UTC)';
                }

                return { timeStr, tzStr: tzParsed, rawStr: normalizedStr };
            }

            // Fallback for unrecognized formats
            const d = new Date(normalizedStr);
            return { timeStr: d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' }), tzStr: '', rawStr: normalizedStr };
        } catch (e) {
            console.error("Error parsing date:", isoString, e);
            return { timeStr: '--:--', dateStr: '', tzStr: '', rawStr: normalizedStr };
        }
    };

    const formatTime = (isoString) => {
        const { timeStr } = parseTimezoneString(isoString);
        return timeStr;
    };

    const formatTz = (isoString) => {
        const { tzStr } = parseTimezoneString(isoString);
        return tzStr;
    };

    const formatDate = (isoString) => {
        if (!isoString) return '';
        const normalized = isoString.replace(' ', 'T');
        const datePart = normalized.split('T')[0];
        const d = new Date(datePart + 'T12:00:00Z');
        return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatDuration = (ptString) => {
        if (!ptString) return '';
        const match = ptString.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
        if (match) {
            const h = match[1] || '0';
            const m = match[2] || '0';
            return `${h}h, ${m} Min.`;
        }
        return ptString;
    };

    const formatDayDate = (isoString) => {
        if (!isoString) return '';
        // We still use Date for getting the weekday, but we force it to parse the local part as UTC
        // to avoid weekday shifting on timezone boundaries.
        const normalizedStr = isoString.replace(' ', 'T');
        const datePart = normalizedStr.split('T')[0]; // "YYYY-MM-DD"
        if (datePart) {
            const d = new Date(`${datePart}T12:00:00Z`); // parse at noon UTC to safely get the day
            return d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: 'short' });
        }
        return '';
    };

    const getStatusInfo = (status) => {
        if (status === 'CANCELLED') return { color: 'text-ios-red', bg: 'bg-ios-red/10' };
        if (status === 'DELAYED') return { color: 'text-ios-orange', bg: 'bg-ios-orange/10' };
        return { color: 'text-ios-green', bg: 'bg-ios-green/10' };
    };

    // Parse a flight time string to a Date for comparison
    const flightTimeToDate = (timeStr) => {
        if (!timeStr) return null;
        const normalized = timeStr.replace(' ', 'T');
        const d = new Date(normalized);
        return isNaN(d.getTime()) ? null : d;
    };

    // Format layover duration from ms
    const formatLayoverDuration = (ms) => {
        if (ms <= 0) return '';
        const totalMins = Math.floor(ms / 60000);
        const h = Math.floor(totalMins / 60);
        const m = totalMins % 60;
        if (h > 0 && m > 0) return `${h}h ${m} Min.`;
        if (h > 0) return `${h}h`;
        return `${m} Min.`;
    };

    // Renders a list of flights with layover indicators between them
    const renderFlightGroup = (groupFlights) => {
        // Sort by departure time
        const sorted = [...groupFlights].sort((a, b) => {
            const da = flightTimeToDate(a.departure_time);
            const db = flightTimeToDate(b.departure_time);
            if (!da || !db) return 0;
            return da.getTime() - db.getTime();
        });

        const elements = [];
        sorted.forEach((flight, idx) => {
            elements.push(renderFlightCard(flight));

            // Add layover indicator between consecutive flights
            if (idx < sorted.length - 1) {
                const currArrival = flightTimeToDate(flight.arrival_time);
                const nextDeparture = flightTimeToDate(sorted[idx + 1].departure_time);
                const layoverAirport = flight.arrival_iata || sorted[idx + 1].departure_iata || '';

                if (currArrival && nextDeparture) {
                    const layoverMs = nextDeparture.getTime() - currArrival.getTime();
                    const layoverStr = formatLayoverDuration(layoverMs);

                    elements.push(
                        <div key={`layover_${flight.id}_${sorted[idx + 1].id}`}
                            className="flex items-center gap-3 py-2 px-1">
                            <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700 border-dashed" />
                            <div className="flex items-center gap-1.5 text-[12px] text-ios-gray-500 dark:text-ios-gray-400 font-medium whitespace-nowrap">
                                <Clock className="w-3.5 h-3.5 text-ios-orange" />
                                <span>1 Stop in <span className="font-semibold text-ios-gray-700 dark:text-ios-gray-300">{layoverAirport}</span></span>
                                {layoverStr && <span className="text-ios-orange font-semibold">· {layoverStr}</span>}
                            </div>
                            <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700 border-dashed" />
                        </div>
                    );
                }
            }
        });
        return elements;
    };

    const renderFlightCard = (flight) => {
        const isOutbound = flight.type === 'outbound';
        const { color: statusColor, bg: statusBg } = getStatusInfo(flight.scheduled_status);

        const depIata = flight.departure_iata || '--';
        const arrIata = flight.arrival_iata || '--';
        const depTime = formatTime(flight.departure_time);
        const arrTime = formatTime(flight.arrival_time);
        const depTz = formatTz(flight.departure_time);
        const arrTz = formatTz(flight.arrival_time);
        const durationStr = formatDuration(flight.duration);

        // "Frankfurt am Main · So., 22. Feb."
        const depLocationStr = `${depIata} · ${formatDayDate(flight.departure_time)}`;
        const arrLocationStr = `${arrIata} · ${formatDayDate(flight.arrival_time)}`;

        return (
            <div key={flight.id} className="relative overflow-hidden rounded-ios-xl shadow-ios bg-white dark:bg-ios-gray-800 border border-ios-gray-100 dark:border-ios-gray-700">
                <div className="overflow-x-auto snap-x snap-mandatory scrollbar-hide flex w-full">
                    {/* Main Card Content */}
                    <div className="w-full shrink-0 snap-center bg-white dark:bg-ios-gray-800 p-5 md:px-6 md:py-5">

                        {/* Top Section */}
                        <div className="flex items-center justify-between mb-8 md:mb-8 relative">
                            {/* Left IATA & Info */}
                            <div className="flex flex-col items-start min-w-[70px] md:min-w-[80px]">
                                <div className="flex items-center gap-1.5 md:gap-2 mb-1">
                                    <span className="text-[34px] md:text-[42px] leading-none font-normal text-ios-gray-950 dark:text-white tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{depIata}</span>
                                    <Plane className="w-[18px] h-[18px] md:w-[20px] md:h-[20px] text-ios-gray-500 fill-ios-gray-500/20 rotate-45 transform" />
                                </div>
                                <a href={`https://www.google.com/search?q=Flughafen+${depIata}`} target="_blank" rel="noreferrer" className="text-[11px] md:text-[12px] text-ios-gray-500 hover:text-ios-gray-950 dark:hover:text-white underline decoration-ios-gray-400 underline-offset-2 whitespace-nowrap -ml-[2px]">
                                    Flughafeninfos
                                </a>
                            </div>

                            {/* Center Line & Duration */}
                            <div className="flex-1 flex flex-col items-center px-1 md:px-2 mt-[-10px]">
                                <span className="text-[12px] md:text-[13px] text-ios-gray-600 dark:text-ios-gray-400 mb-1 leading-none">{durationStr || 'Dauer unbekannt'}</span>
                                <div className="w-full flex items-center justify-center">
                                    <div className="h-[2px] bg-[#e0e0e0] dark:bg-ios-gray-700 flex-1 w-full max-w-[200px]"></div>
                                </div>
                            </div>

                            {/* Right IATA & Info */}
                            <div className="flex flex-col items-end min-w-[70px] md:min-w-[80px] text-right">
                                <div className="text-[34px] md:text-[42px] leading-none font-normal text-ios-gray-950 dark:text-white mb-1 tracking-tight" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>{arrIata}</div>
                                <a href={`https://www.google.com/search?q=Flughafen+${arrIata}`} target="_blank" rel="noreferrer" className="text-[11px] md:text-[12px] text-ios-gray-500 hover:text-ios-gray-950 dark:hover:text-white underline decoration-ios-gray-400 underline-offset-2 whitespace-nowrap -mr-[2px]">
                                    Flughafeninfos
                                </a>
                            </div>
                        </div>

                        {/* Bottom Section */}
                        <div className="flex flex-col md:grid md:grid-cols-2 gap-6 relative">
                            {/* Vertical Divider (Desktop Only) */}
                            <div className="hidden md:block absolute left-1/2 top-0 bottom-0 w-[1px] bg-[#e0e0e0] dark:bg-ios-gray-700 -ml-[0.5px]"></div>

                            {/* Departure Details */}
                            <div className="flex flex-col md:pr-4">
                                <div className="text-[14px] md:text-[14.5px] font-[500] text-ios-gray-950 dark:text-white mb-2 md:mb-3">
                                    {depLocationStr}
                                </div>

                                <div className="flex justify-between items-end gap-1 w-full text-left bg-white dark:bg-ios-gray-800">
                                    <div className="flex flex-col flex-1 min-w-0 pr-1">
                                        <div className="text-[11px] md:text-[12px] text-ios-gray-600 dark:text-ios-gray-400 mb-[2px] leading-tight">Planmäßiger Abflug {depTz && <span className="font-medium text-ios-gray-500 opacity-80">{depTz}</span>}</div>
                                        <div className={`text-[17px] md:text-[20px] font-normal leading-none tracking-tight flex items-baseline gap-1 ${statusColor === 'text-ios-green' ? 'text-ios-gray-950 dark:text-white' : statusColor}`}>
                                            {statusColor !== 'text-ios-green' && <del className="text-ios-gray-400 text-[13px] md:text-sm mr-1.5">{depTime}</del>}
                                            <span>{depTime}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col w-[60px] md:w-[70px] pl-2 md:pl-3 border-l border-[#e0e0e0] dark:border-ios-gray-700 shrink-0">
                                        <div className="text-[11px] md:text-[12px] text-ios-gray-600 dark:text-ios-gray-400 mb-[2px]">Terminal</div>
                                        <div className="text-[17px] md:text-[20px] font-normal leading-none tracking-tight text-ios-gray-950 dark:text-white">{flight.terminal_out || '-'}</div>
                                    </div>
                                    <div className="flex flex-col w-[60px] md:w-[70px] pl-2 md:pl-3 shrink-0">
                                        <div className="text-[11px] md:text-[12px] text-ios-gray-600 dark:text-ios-gray-400 mb-[2px]">Gate</div>
                                        <div className="text-[17px] md:text-[20px] font-normal leading-none tracking-tight text-ios-gray-950 dark:text-white">{flight.gate_out || '-'}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Arrival Details */}
                            <div className="flex flex-col md:pl-4 mt-2 md:mt-0">
                                <div className="text-[14px] md:text-[14.5px] font-[500] text-ios-gray-950 dark:text-white mb-2 md:mb-3 tracking-tight">
                                    {arrLocationStr}
                                </div>

                                <div className="flex justify-between items-end gap-1 w-full text-left bg-white dark:bg-ios-gray-800">
                                    <div className="flex flex-col flex-1 min-w-0 pr-1">
                                        <div className="text-[11px] md:text-[12px] text-ios-gray-600 dark:text-ios-gray-400 mb-[2px] leading-tight">Planmäßige Landung {arrTz && <span className="font-medium text-ios-gray-500 opacity-80">{arrTz}</span>}</div>
                                        <div className="text-[17px] md:text-[20px] font-normal leading-none tracking-tight flex items-baseline gap-1 text-ios-gray-950 dark:text-white">
                                            <span>{arrTime}</span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col w-[60px] md:w-[70px] pl-2 md:pl-3 border-l border-[#e0e0e0] dark:border-ios-gray-700 shrink-0">
                                        <div className="text-[11px] md:text-[12px] text-ios-gray-600 dark:text-ios-gray-400 mb-[2px]">Terminal</div>
                                        <div className="text-[17px] md:text-[20px] font-normal leading-none tracking-tight text-ios-gray-950 dark:text-white">{flight.terminal_in || '-'}</div>
                                    </div>
                                    <div className="flex flex-col w-[60px] md:w-[70px] pl-2 md:pl-3 shrink-0">
                                        <div className="text-[11px] md:text-[12px] text-ios-gray-600 dark:text-ios-gray-400 mb-[2px]">Gate</div>
                                        <div className="text-[17px] md:text-[20px] font-normal leading-none tracking-tight text-ios-gray-950 dark:text-white">{flight.gate_in || '-'}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Extra flight details at the bottom (Airline, Flight num, Delete) */}
                        <div className="mt-6 md:mt-6 pt-3 border-t border-[#e0e0e0] dark:border-ios-gray-700 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-0">
                            <div className="flex items-center gap-2 md:gap-3 flex-wrap text-[12px] text-ios-gray-600 dark:text-ios-gray-400 w-full md:w-auto">
                                {flight.last_synced_at && (
                                    <div className="flex items-center gap-1.5 bg-ios-gray-50 dark:bg-ios-gray-900 px-2 md:px-2.5 py-1 md:py-1.5 rounded-full border border-ios-gray-200 dark:border-ios-gray-700 shrink-0">
                                        <RefreshCw className="w-[10px] h-[10px] md:w-[11px] md:h-[11px]" />
                                        <span className="text-[11px] md:text-[12px]">Aktualisiert um {new Date(flight.last_synced_at * 1000).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                )}
                                <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${statusBg} ${statusColor} shrink-0`}>
                                    {flight.scheduled_status || 'SCHEDULED'}
                                </span>
                            </div>

                            <div className="flex items-center justify-between w-full md:w-auto mt-3 md:mt-0">
                                <div className="flex items-center truncate gap-1.5 md:gap-2">
                                    {flight.flight_number && (
                                        <span className="text-[12px] md:text-[13px] font-medium text-ios-gray-800 dark:text-ios-gray-200 shrink-0">
                                            {flight.flight_number}
                                        </span>
                                    )}
                                    {flight.flight_number && (flight.airline || flight.aircraft) && (
                                        <span className="text-ios-gray-400 dark:text-ios-gray-600 text-[10px] md:text-[11px] shrink-0">•</span>
                                    )}
                                    {(flight.airline || flight.aircraft) && (
                                        <span className="text-[11px] md:text-[12px] text-ios-gray-500 truncate">
                                            Quelle: {[flight.airline, flight.aircraft].filter(Boolean).join(' · ')}
                                        </span>
                                    )}
                                </div>
                                <div className="hidden md:flex shrink-0 ml-auto md:ml-3">
                                    <button
                                        onClick={() => setDeleteConfirm({ open: true, flight })}
                                        className="p-1 px-2.5 text-ios-red hover:bg-ios-red/10 border-0 transition-colors flex items-center justify-center gap-1.5 text-[12px] font-medium"
                                    >
                                        <Trash2 className="w-3.5 h-3.5" /> Löschen
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Swipe Actions Area (mobile) */}
                    <div className="md:hidden w-[80px] shrink-0 snap-end flex items-stretch border-l border-ios-gray-100 dark:border-ios-gray-700">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ open: true, flight }); }}
                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-ios-red text-white transition-colors active:bg-ios-red/80"
                        >
                            <Trash2 className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Löschen</span>
                        </button>
                    </div>
                </div>
            </div>
        );
    };

    // Loading skeleton matching ActivitiesList style
    if (isLoading || (!isAuthenticated && !error)) {
        return (
            <div className="p-4 pb-8 space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-8 w-40 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-lg animate-pulse" />
                    <div className="flex gap-2">
                        <div className="w-9 h-9 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full animate-pulse" />
                        <div className="w-9 h-9 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white dark:bg-ios-gray-800 p-4 rounded-ios-xl shadow-ios flex items-start gap-3 opacity-60">
                            <div className="w-6 h-6 rounded-full bg-ios-gray-200 dark:bg-ios-gray-700 animate-pulse shrink-0" />
                            <div className="flex-1 space-y-2">
                                <div className="h-4 w-2/3 bg-ios-gray-200 dark:bg-ios-gray-700 rounded animate-pulse" />
                                <div className="h-3 w-1/2 bg-ios-gray-100 dark:bg-ios-gray-900 rounded animate-pulse" />
                                <div className="h-10 w-full bg-ios-blue/5 dark:bg-ios-blue/10 rounded-ios-lg animate-pulse mt-2" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-8 text-center">
                <div className="w-16 h-16 mx-auto mb-4 bg-ios-red/10 rounded-full flex items-center justify-center">
                    <X className="w-8 h-8 text-ios-red" />
                </div>
                <p className="text-ios-gray-700 dark:text-ios-gray-300 mb-4">
                    Flüge konnten nicht geladen werden.
                </p>
                <button
                    onClick={() => refetch()}
                    className="px-6 py-3 bg-ios-blue text-white rounded-ios-lg font-medium
                             transition-all active:scale-95 flex items-center gap-2 mx-auto"
                >
                    <RefreshCw className="w-4 h-4" />
                    Erneut versuchen
                </button>
            </div>
        );
    }

    const outboundFlights = flights.filter(f => f.type === 'outbound');
    const returnFlights = flights.filter(f => f.type === 'return');

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="p-4 pb-8">
                {/* Header */}
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">Flüge</h2>
                        <p className="text-sm text-ios-gray-500 mt-1 flex items-center gap-1">
                            <Plane className="w-3 h-3" />
                            Auto-Sync via AeroDataBox
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={handleRefresh}
                            disabled={isFetching}
                            className="p-2 text-ios-gray-500 hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800
                                     rounded-full transition-all active:scale-95 disabled:opacity-50"
                            title="Aktualisieren"
                        >
                            <RefreshCw className={`w-5 h-5 ${isFetching ? 'animate-spin' : ''}`} />
                        </button>
                        <button
                            onClick={() => {
                                hapticLight();
                                setIsFormOpen(true);
                            }}
                            className="p-2 bg-ios-blue text-white rounded-full shadow-ios transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Flight List */}
                {flights.length === 0 ? (
                    <div className="text-center py-12">
                        <Plane className="w-12 h-12 mx-auto text-ios-gray-300 dark:text-ios-gray-700 mb-4" />
                        <p className="text-ios-gray-500">Noch keine Flüge</p>
                        <p className="text-ios-gray-400 text-sm">Füge deinen ersten Flug hinzu</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {outboundFlights.length > 0 && (
                            <>
                                <div className="flex items-center gap-3 py-1">
                                    <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                                    <span className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <PlaneTakeoff className="w-3.5 h-3.5" />
                                        Hinflug ({outboundFlights.length})
                                    </span>
                                    <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                                </div>
                                {renderFlightGroup(outboundFlights)}
                            </>
                        )}

                        {returnFlights.length > 0 && (
                            <>
                                <div className="flex items-center gap-3 py-1 mt-2">
                                    <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                                    <span className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider flex items-center gap-2">
                                        <PlaneLanding className="w-3.5 h-3.5" />
                                        Rückflug ({returnFlights.length})
                                    </span>
                                    <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                                </div>
                                {renderFlightGroup(returnFlights)}
                            </>
                        )}
                    </div>
                )}

                {/* Add Form Modal — matches ActivitiesList modal style */}
                {isFormOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setIsFormOpen(false)}>
                        <form
                            onSubmit={handleCreate}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-ios-gray-800 rounded-t-ios-2xl w-full max-w-lg p-6 animate-slide-up overflow-hidden"
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-ios-gray-950 dark:text-white">
                                    Flug hinzufügen
                                </h3>
                                <button type="button" onClick={() => setIsFormOpen(false)} className="p-2">
                                    <X className="w-5 h-5 text-ios-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[60vh] overflow-y-auto overflow-x-hidden">
                                <div>
                                    <label className="text-xs text-ios-gray-500 mb-1 block">Flugart</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'outbound' })}
                                            className={`py-2.5 px-3 rounded-ios-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${formData.type === 'outbound'
                                                ? 'bg-ios-blue text-white shadow-ios'
                                                : 'bg-ios-gray-100 dark:bg-ios-gray-700 text-ios-gray-600 dark:text-ios-gray-400'
                                                }`}
                                        >
                                            <PlaneTakeoff className="w-4 h-4" />
                                            Hinflug
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setFormData({ ...formData, type: 'return' })}
                                            className={`py-2.5 px-3 rounded-ios-lg text-sm font-medium flex items-center justify-center gap-2 transition-all ${formData.type === 'return'
                                                ? 'bg-ios-blue text-white shadow-ios'
                                                : 'bg-ios-gray-100 dark:bg-ios-gray-700 text-ios-gray-600 dark:text-ios-gray-400'
                                                }`}
                                        >
                                            <PlaneLanding className="w-4 h-4" />
                                            Rückflug
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-ios-gray-500 mb-1 block">Flugnummer</label>
                                    <input
                                        type="text"
                                        required
                                        placeholder="z.B. LH 714"
                                        value={formData.flight_number}
                                        onChange={(e) => setFormData({ ...formData, flight_number: e.target.value.toUpperCase() })}
                                        className="input-ios"
                                    />
                                    <p className="text-[10px] text-ios-gray-400 pl-1 mt-1">Airline Code + Nummer wie auf dem Ticket</p>
                                </div>

                                <div>
                                    <label className="text-xs text-ios-gray-500 mb-1 block">Abflugdatum</label>
                                    <input
                                        type="date"
                                        required
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="input-ios py-3 text-sm"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full py-4 bg-ios-blue text-white rounded-ios-lg font-semibold
                                             transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {createMutation.isPending ? 'Wird gesucht...' : 'Flug speichern & tracken'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={deleteConfirm.open}
                    onClose={() => setDeleteConfirm({ open: false, flight: null })}
                    onConfirm={() => {
                        if (deleteConfirm.flight) {
                            deleteMutation.mutate({
                                id: deleteConfirm.flight.id,
                                flightNumber: deleteConfirm.flight.flight_number,
                            });
                        }
                    }}
                    title="Flug löschen?"
                    message={`Möchtest du "${deleteConfirm.flight?.flight_number || ''}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
                    confirmText="Löschen"
                    cancelText="Abbrechen"
                    type="danger"
                />
            </div>
        </PullToRefresh>
    );
}
