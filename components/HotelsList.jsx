'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2, MapPin, Calendar, Plus, Trash2, X, Edit2, User, Navigation, RefreshCw, LocateFixed } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import AddressInput from './AddressInput';
import ConfirmDialog from './ConfirmDialog';
import PullToRefresh from './PullToRefresh';
import { capitalizeUsername } from '../lib/utils';
import { hapticSuccess, hapticError } from '../lib/haptics';

export default function HotelsList({ emitDataChanged, highlightId, onHighlightDone }) {
    const queryClient = useQueryClient();
    const { user } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const highlightRef = useRef(null);
    const [pastExpanded, setPastExpanded] = useState(false);
    const [showSwipeHint, setShowSwipeHint] = useState(() => {
        try { return localStorage.getItem('hotels-swipe-hint-seen') !== 'true'; } catch { return true; }
    });
    const [showForm, setShowForm] = useState(false);
    const [editingHotel, setEditingHotel] = useState(null);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, hotel: null });
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        check_in_date: '',
        check_out_date: '',
        check_in_time: '',
        check_out_time: '',
        latitude: '',
        longitude: '',
        notes: '',
    });

    // Fetch hotels
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['hotels'],
        queryFn: async () => {
            const response = await fetch('/api/hotels');
            if (!response.ok) throw new Error('Laden fehlgeschlagen');
            return response.json();
        },
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        refetchInterval: false,
        placeholderData: (prev) => prev,
        structuralSharing: true,
    });

    const handleRefresh = async () => {
        await refetch();
    };

    // Create hotel mutation (optimistic)
    const createMutation = useMutation({
        mutationFn: async (hotel) => {
            const response = await apiFetch('/api/hotels', {
                method: 'POST',
                body: JSON.stringify(hotel),
            });
            if (!response.ok) throw new Error('Erstellen fehlgeschlagen');
            return response.json();
        },
        onSuccess: (_data, hotel) => {
            hapticSuccess();
            addToast('Hotel hinzugefügt', 'success');
            emitDataChanged?.('hotels', 'add', hotel.name);
            closeForm();
        },
        onError: (err) => {
            hapticError();
            addToast(err.message || 'Fehler beim Erstellen', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['hotels'] });
        },
    });

    // Update hotel mutation (optimistic)
    const updateMutation = useMutation({
        mutationFn: async (hotel) => {
            const response = await apiFetch('/api/hotels', {
                method: 'PUT',
                body: JSON.stringify(hotel),
            });
            if (!response.ok) throw new Error('Aktualisieren fehlgeschlagen');
            return response.json();
        },
        onMutate: async (hotel) => {
            await queryClient.cancelQueries({ queryKey: ['hotels'] });
            const prev = queryClient.getQueryData(['hotels']);
            queryClient.setQueryData(['hotels'], (old) => {
                if (!old?.hotels) return old;
                const update = (list) => list.map(h => h.id === hotel.id ? { ...h, ...hotel } : h);
                return {
                    ...old,
                    all: update(old.all || []),
                    hotels: {
                        past: update(old.hotels.past || []),
                        current: update(old.hotels.current || []),
                        future: update(old.hotels.future || []),
                    },
                };
            });
            return { prev };
        },
        onSuccess: (_data, hotel) => {
            hapticSuccess();
            addToast('Hotel aktualisiert', 'success');
            emitDataChanged?.('hotels', 'edit', hotel.name);
            closeForm();
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['hotels'], ctx.prev);
            hapticError();
            addToast(err.message || 'Fehler beim Aktualisieren', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['hotels'] });
        },
    });

    // Delete hotel mutation (optimistic)
    const deleteMutation = useMutation({
        mutationFn: async ({ id, name }) => {
            const response = await apiFetch(`/api/hotels?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Löschen fehlgeschlagen');
            return response.json();
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['hotels'] });
            const prev = queryClient.getQueryData(['hotels']);
            queryClient.setQueryData(['hotels'], (old) => {
                if (!old?.hotels) return old;
                const remove = (list) => list.filter(h => h.id !== id);
                return {
                    ...old,
                    all: remove(old.all || []),
                    hotels: {
                        past: remove(old.hotels.past || []),
                        current: remove(old.hotels.current || []),
                        future: remove(old.hotels.future || []),
                    },
                };
            });
            return { prev };
        },
        onSuccess: (_data, { name }) => {
            hapticSuccess();
            addToast('Hotel gelöscht', 'success');
            emitDataChanged?.('hotels', 'delete', name);
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['hotels'], ctx.prev);
            hapticError();
            addToast(err.message || 'Fehler beim Löschen', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['hotels'] });
        },
    });

    const openAddForm = () => {
        setEditingHotel(null);
        setFormData({ name: '', address: '', check_in_date: '', check_out_date: '', check_in_time: '', check_out_time: '', latitude: '', longitude: '', notes: '' });
        setShowForm(true);
    };

    const openEditForm = (hotel) => {
        setEditingHotel(hotel);
        setFormData({
            name: hotel.name || '',
            address: hotel.address || '',
            check_in_date: hotel.check_in_date || '',
            check_out_date: hotel.check_out_date || '',
            check_in_time: hotel.check_in_time || '',
            check_out_time: hotel.check_out_time || '',
            latitude: hotel.latitude || '',
            longitude: hotel.longitude || '',
            notes: hotel.notes || '',
        });
        setShowForm(true);
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingHotel(null);
        setFormData({ name: '', address: '', check_in_date: '', check_out_date: '', check_in_time: '', check_out_time: '', latitude: '', longitude: '', notes: '' });
    };

    const handleAddressChange = (address) => {
        setFormData(prev => ({ ...prev, address }));
    };

    const handleCoordinatesChange = (lat, lon) => {
        setFormData(prev => ({
            ...prev,
            latitude: lat || '',
            longitude: lon || ''
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const submitData = {
            ...formData,
            latitude: formData.latitude ? parseFloat(formData.latitude) : null,
            longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        };

        if (editingHotel) {
            updateMutation.mutate({ ...submitData, id: editingHotel.id });
        } else {
            createMutation.mutate(submitData);
        }
    };

    const togglePastSection = () => {
        setPastExpanded(prev => !prev);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const openGoogleMaps = (hotel) => {
        const lat = hotel.latitude || hotel.lat;
        const lon = hotel.longitude || hotel.lon;
        if (lat && lon) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
        } else if (hotel.address) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(hotel.address)}`, '_blank');
        }
    };

    // Scroll to highlighted hotel from search
    useEffect(() => {
        if (highlightId && highlightRef.current && data?.hotels) {
            // Only expand past section if hotel is in past
            if (data.hotels.past?.some(h => h.id === highlightId)) {
                setPastExpanded(true);
            }
            // current and future are always expanded, so no need to set state for them
            const sections = ['current', 'future', 'past'];
            for (const section of sections) {
                if (data.hotels[section]?.some(h => h.id === highlightId)) {
                    // section found - continue to scroll
                    break;
                }
            }

            setTimeout(() => {
                highlightRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                highlightRef.current?.classList.add('ring-2', 'ring-ios-blue', 'ring-offset-2');
                setTimeout(() => {
                    highlightRef.current?.classList.remove('ring-2', 'ring-ios-blue', 'ring-offset-2');
                    onHighlightDone?.();
                }, 2000);
            }, 200);
        }
    }, [highlightId, onHighlightDone]);

    const HotelCard = ({ hotel }) => {
        const swipeRef = useRef(null);
        const touchStartX = useRef(0);

        const handleSwipe = () => {
            if (showSwipeHint) {
                setShowSwipeHint(false);
                try { localStorage.setItem('hotels-swipe-hint-seen', 'true'); } catch { }
            }
        };

        const handleTouchStart = useCallback((e) => {
            touchStartX.current = e.touches[0].clientX;
        }, []);

        const handleTouchMove = useCallback((e) => {
            const el = swipeRef.current;
            if (!el) return;
            if (el.scrollLeft <= 0 && e.touches[0].clientX > touchStartX.current) {
                e.preventDefault();
            }
        }, []);

        return (
            <div ref={highlightId === hotel.id ? highlightRef : null} className="relative overflow-hidden rounded-ios-xl shadow-ios bg-white dark:bg-ios-gray-800">
                {showSwipeHint && (
                    <div className="md:hidden absolute top-2 right-2 z-10 px-2 py-1 bg-ios-blue text-white text-xs rounded-full shadow-lg animate-pulse pointer-events-none">
                        ← Wischen
                    </div>
                )}
                <div ref={swipeRef} className="overflow-x-auto snap-x snap-mandatory scrollbar-hide flex w-full" onScroll={handleSwipe} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove}>

                    {/* Main Card Content */}
                    <div className="w-full shrink-0 snap-center bg-white dark:bg-ios-gray-800 p-4">
                        <div className="flex items-start gap-3">
                            {/* Icon */}
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-ios-orange/10 flex items-center justify-center mt-0.5">
                                <Building2 className="w-3.5 h-3.5 text-ios-orange" />
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <h3 className="font-semibold text-ios-gray-950 dark:text-white truncate">{hotel.name}</h3>
                                </div>

                                {hotel.address && (
                                    <div className="flex items-center gap-1 text-sm text-ios-gray-500 mb-1">
                                        <MapPin className="w-3 h-3 shrink-0" />
                                        <span className="truncate">{hotel.address}</span>
                                    </div>
                                )}

                                <div className="flex items-center gap-1 text-sm text-ios-gray-500 mb-1">
                                    <Calendar className="w-3 h-3" />
                                    {formatDate(hotel.check_in_date)}{hotel.check_in_time ? ` ${hotel.check_in_time}` : ''} → {formatDate(hotel.check_out_date)}{hotel.check_out_time ? ` ${hotel.check_out_time}` : ''}
                                </div>

                                {hotel.created_by && hotel.created_by !== user?.username && (
                                    <div className="flex items-center gap-1 text-xs text-ios-gray-500 mb-1">
                                        <User className="w-3 h-3" />
                                        Erstellt von {capitalizeUsername(hotel.created_by)}
                                    </div>
                                )}

                                {hotel.notes && (
                                    <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 line-clamp-2">
                                        {hotel.notes}
                                    </p>
                                )}
                            </div>

                            {/* Desktop action buttons */}
                            <div className="hidden md:flex flex-col gap-1 shrink-0">
                                <button
                                    onClick={() => openEditForm(hotel)}
                                    className="p-2 text-ios-blue hover:bg-ios-blue/10 rounded-full transition-colors"
                                >
                                    <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => setDeleteConfirm({ open: true, hotel })}
                                    className="p-2 text-ios-red hover:bg-ios-red/10 rounded-full transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Action Bar */}
                        {((hotel.latitude || hotel.lat) && (hotel.longitude || hotel.lon)) || hotel.address ? (
                            <div className="mt-3">
                                <button
                                    onClick={() => openGoogleMaps(hotel)}
                                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-ios-blue/10 text-ios-blue
                                         rounded-ios-lg font-medium transition-all active:scale-[0.98]"
                                >
                                    <Navigation className="w-4 h-4" />
                                    Route starten
                                </button>
                            </div>
                        ) : null}
                    </div>

                    {/* Swipe Actions Area (mobile) */}
                    <div className="md:hidden w-[140px] shrink-0 snap-end flex items-stretch">
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditForm(hotel); }}
                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-ios-blue text-white transition-colors active:bg-ios-blue/80 border-l border-ios-gray-100 dark:border-ios-gray-700"
                        >
                            <Edit2 className="w-5 h-5" />
                            <span className="text-[10px] font-bold uppercase">Bearbeiten</span>
                        </button>
                        <button
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ open: true, hotel }); }}
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

    const Section = ({ title, hotels, sectionKey, emptyMessage }) => {
        const isCollapsible = sectionKey === 'past';
        const isExpanded = isCollapsible ? pastExpanded : true; // current/future always expanded

        return (
            <div className="mb-2">
                {isCollapsible ? (
                    <button
                        onClick={togglePastSection}
                        className="w-full flex items-center gap-3 py-3"
                    >
                        <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                        <span className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider flex items-center gap-2">
                            {title} ({hotels.length})
                            <span className={`transition-transform ${pastExpanded ? 'rotate-180' : ''}`}>▼</span>
                        </span>
                        <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                    </button>
                ) : (
                    <div className="w-full flex items-center gap-3 py-3">
                        <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                        <span className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider">
                            {title} ({hotels.length})
                        </span>
                        <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                    </div>
                )}

                {isExpanded && (
                    <div className="space-y-3 animate-fade-in">
                        {hotels.length === 0 ? (
                            <p className="text-center text-ios-gray-400 py-6 text-sm">{emptyMessage}</p>
                        ) : (
                            hotels.map(hotel => <HotelCard key={hotel.id} hotel={hotel} />)
                        )}
                    </div>
                )}
            </div>
        );
    };

    if (isLoading) {
        return (
            <div className="p-4 pb-8 space-y-4">
                <div className="flex items-center justify-between mb-6">
                    <div className="h-8 w-32 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-lg animate-pulse" />
                    <div className="flex gap-2">
                        <div className="w-9 h-9 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full animate-pulse" />
                        <div className="w-9 h-9 bg-ios-gray-200 dark:bg-ios-gray-700 rounded-full animate-pulse" />
                    </div>
                </div>
                <div className="h-14 w-full bg-ios-gray-200 dark:bg-ios-gray-800 rounded-ios-xl animate-pulse" />
                <div className="space-y-3">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="bg-white p-4 dark:bg-ios-gray-800 rounded-ios-xl shadow-ios opacity-60">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-ios-lg bg-ios-gray-200 dark:bg-ios-gray-700 animate-pulse" />
                                <div className="flex-1 space-y-2">
                                    <div className="h-4 w-1/2 bg-ios-gray-200 dark:bg-ios-gray-700 rounded animate-pulse" />
                                    <div className="h-3 w-3/4 bg-ios-gray-100 dark:bg-ios-gray-900 rounded animate-pulse" />
                                </div>
                            </div>
                            <div className="h-3 w-1/3 bg-ios-gray-200 dark:bg-ios-gray-700 rounded mb-4 animate-pulse" />
                            <div className="h-10 w-full bg-ios-blue/5 dark:bg-ios-blue/10 rounded-ios-lg animate-pulse" />
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
                    Hotels konnten nicht geladen werden.
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

    const { hotels } = data || { hotels: { past: [], current: [], future: [] } };

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <div className="p-4 pb-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">Hotels</h2>
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
                            onClick={openAddForm}
                            className="p-2 bg-ios-blue text-white rounded-full shadow-ios transition-all active:scale-95"
                        >
                            <Plus className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeForm}>
                        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ios-gray-800 rounded-t-ios-2xl w-full max-w-lg p-6 animate-slide-up overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-ios-gray-950 dark:text-white">
                                    {editingHotel ? 'Hotel bearbeiten' : 'Neues Hotel'}
                                </h3>
                                <button type="button" onClick={closeForm} className="p-2">
                                    <X className="w-5 h-5 text-ios-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[85vh] overflow-y-auto overflow-x-hidden overscroll-contain px-1">
                                <input
                                    type="text"
                                    placeholder="Hotelname *"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    required
                                    className="input-ios"
                                />



                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs text-ios-gray-500 mb-1 block">Check-in *</label>
                                        <input
                                            type="date"
                                            value={formData.check_in_date}
                                            onChange={(e) => {
                                                const newCheckIn = e.target.value;
                                                const updates = { check_in_date: newCheckIn };
                                                if (formData.check_out_date && formData.check_out_date <= newCheckIn) {
                                                    updates.check_out_date = '';
                                                }
                                                setFormData(prev => ({ ...prev, ...updates }));
                                            }}
                                            required
                                            className="input-ios py-3 text-sm max-w-full"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs text-ios-gray-500 mb-1 block">Check-out *</label>
                                        <input
                                            type="date"
                                            value={formData.check_out_date}
                                            onChange={(e) => setFormData({ ...formData, check_out_date: e.target.value })}
                                            required
                                            disabled={!formData.check_in_date}
                                            min={formData.check_in_date ? (() => {
                                                const d = new Date(formData.check_in_date);
                                                d.setDate(d.getDate() + 1);
                                                return d.toISOString().split('T')[0];
                                            })() : undefined}
                                            className="input-ios py-3 text-sm max-w-full disabled:opacity-40 disabled:cursor-not-allowed"
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs text-ios-gray-500 mb-1 block">Check-in Uhrzeit</label>
                                        <input
                                            type="time"
                                            value={formData.check_in_time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, check_in_time: e.target.value }))}
                                            placeholder="15:00"
                                            className="input-ios py-3 text-sm max-w-full"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs text-ios-gray-500 mb-1 block">Check-out Uhrzeit</label>
                                        <input
                                            type="time"
                                            value={formData.check_out_time}
                                            onChange={(e) => setFormData(prev => ({ ...prev, check_out_time: e.target.value }))}
                                            placeholder="11:00"
                                            className="input-ios py-3 text-sm max-w-full"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="text-xs text-ios-gray-500 mb-1 block">Adresse (für Kartenanzeige)</label>
                                    <AddressInput
                                        value={formData.address}
                                        onChange={handleAddressChange}
                                        onCoordinatesChange={handleCoordinatesChange}
                                        placeholder="Hoteladresse eingeben..."
                                        entityName={formData.name}
                                    />
                                </div>

                                <textarea
                                    placeholder="Notizen"
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    rows={3}
                                    className="input-ios min-h-[100px] resize-y"
                                />

                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="w-full py-4 bg-ios-blue text-white rounded-ios-lg font-semibold
                         transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Speichern...'
                                        : editingHotel ? 'Speichern' : 'Hotel hinzufügen'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Hotels Sections */}
                <Section
                    title="🏨 Aktueller Aufenthalt"
                    hotels={hotels.current || []}
                    sectionKey="current"
                    emptyMessage="Kein aktueller Hotelaufenthalt"
                />
                <Section
                    title="📅 Bevorstehend"
                    hotels={hotels.future || []}
                    sectionKey="future"
                    emptyMessage="Keine anstehenden Hotels"
                />
                <Section
                    title="📚 Vergangene Aufenthalte"
                    hotels={hotels.past || []}
                    sectionKey="past"
                    emptyMessage="Keine vergangenen Hotels"
                />

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={deleteConfirm.open}
                    onClose={() => setDeleteConfirm({ open: false, hotel: null })}
                    onConfirm={() => {
                        if (deleteConfirm.hotel) {
                            deleteMutation.mutate({ id: deleteConfirm.hotel.id, name: deleteConfirm.hotel.name });
                        }
                    }}
                    title="Hotel löschen?"
                    message={`Möchtest du "${deleteConfirm.hotel?.name}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
                    confirmText="Löschen"
                    cancelText="Abbrechen"
                    type="danger"
                />
            </div>
        </PullToRefresh>
    );
}
