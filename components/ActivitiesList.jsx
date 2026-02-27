'use client';

import { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Compass, MapPin, Plus, Trash2, Check, Navigation, Clock, X, Edit2, User, Search, Filter, RefreshCw, LocateFixed } from 'lucide-react';
import { apiFetch } from '../lib/apiClient';
import useAuthStore from '../store/authStore';
import useToastStore from '../store/toastStore';
import useLocationStore from '../store/locationStore';
import AddressInput from './AddressInput';
import ConfirmDialog from './ConfirmDialog';
import { capitalizeUsername } from '../lib/utils';
import { hapticSuccess, hapticError, hapticMedium } from '../lib/haptics';
import PullToRefresh from './PullToRefresh';
import Confetti from './Confetti';

const ACTIVITY_TYPES = [
    { value: 'temple', label: '⛩️ Tempel/Schrein' },
    { value: 'restaurant', label: '🍜 Restaurant' },
    { value: 'shopping', label: '🛍️ Shopping' },
    { value: 'park', label: '🌸 Park/Garten' },
    { value: 'museum', label: '🏛️ Museum' },
    { value: 'entertainment', label: '🎮 Unterhaltung' },
    { value: 'landmark', label: '🗼 Sehenswürdigkeit' },
    { value: 'other', label: '📍 Sonstiges' },
];

export default function ActivitiesList({ emitDataChanged, highlightId, onHighlightDone }) {
    const queryClient = useQueryClient();
    const { user, isAuthenticated } = useAuthStore();
    const addToast = useToastStore((s) => s.addToast);
    const currentLocation = useLocationStore((s) => s.currentLocation);
    const highlightRef = useRef(null);
    const actSwipeRefs = useRef({});
    const actTouchStartX = useRef(0);

    const actHandleTouchStart = useCallback((e) => {
        actTouchStartX.current = e.touches[0].clientX;
    }, []);

    const actHandleTouchMove = useCallback((id) => (e) => {
        const el = actSwipeRefs.current[id];
        if (!el) return;
        if (el.scrollLeft <= 0 && e.touches[0].clientX > actTouchStartX.current) {
            e.preventDefault();
        }
    }, []);
    const [showSwipeHint, setShowSwipeHint] = useState(() => {
        try { return localStorage.getItem('activities-swipe-hint-seen') !== 'true'; } catch { return true; }
    });
    const [showForm, setShowForm] = useState(false);
    const [editingActivity, setEditingActivity] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [statusFilter, setStatusFilter] = useState('all'); // 'all', 'open', 'completed'
    const [showFilters, setShowFilters] = useState(false);
    const [showCompleted, setShowCompleted] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState({ open: false, activity: null });
    const [confettiTrigger, setConfettiTrigger] = useState(0);
    const [formData, setFormData] = useState({
        title: '',
        type: 'other',
        address: '',
        latitude: '',
        longitude: '',
        description: '',
        planned_date: '',
        planned_time: '',
    });

    // Fetch activities - use stable query key to prevent refetch on location change
    const { data, isLoading, error, refetch, isFetching } = useQuery({
        queryKey: ['activities'],
        queryFn: async () => {
            const response = await fetch('/api/activities');
            if (response.status === 401) {
                return { activities: [] };
            }
            if (!response.ok) throw new Error('Laden fehlgeschlagen');
            return response.json();
        },
        enabled: isAuthenticated,
        retry: 1,
        retryDelay: 300,
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        placeholderData: (prev) => prev,
    });

    // Extract activities from query data (must be before any early returns for hooks)
    const activities = data?.activities || [];

    // Filter activities based on search, type, and status
    // IMPORTANT: useMemo must be called before any early returns to maintain hook order
    const filteredActivities = useMemo(() => {
        return activities.filter(activity => {
            // Search filter
            if (searchQuery) {
                const query = searchQuery.toLowerCase();
                const matchesTitle = activity.title?.toLowerCase().includes(query);
                const matchesDesc = activity.description?.toLowerCase().includes(query);
                if (!matchesTitle && !matchesDesc) return false;
            }

            // Type filter
            if (typeFilter !== 'all' && activity.type !== typeFilter) {
                return false;
            }

            // Status filter
            if (statusFilter === 'open' && activity.completed) return false;
            if (statusFilter === 'completed' && !activity.completed) return false;

            return true;
        });
    }, [activities, searchQuery, typeFilter, statusFilter]);

    const activeFilterCount = (typeFilter !== 'all' ? 1 : 0) + (statusFilter !== 'all' ? 1 : 0);

    const handleRefresh = async () => {
        await refetch();
    };

    // Create activity mutation (optimistic)
    const createMutation = useMutation({
        mutationFn: async (activity) => {
            const response = await apiFetch('/api/activities', {
                method: 'POST',
                body: JSON.stringify(activity),
            });
            if (!response.ok) throw new Error('Erstellen fehlgeschlagen');
            return response.json();
        },
        onSuccess: (_data, activity) => {
            hapticSuccess();
            addToast('Aktivität hinzugefügt', 'success');
            emitDataChanged?.('activities', 'add', activity.title);
            closeForm();
        },
        onError: (err) => {
            hapticError();
            addToast(err.message || 'Fehler beim Erstellen', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
    });

    // Update activity mutation (optimistic)
    const updateMutation = useMutation({
        mutationFn: async (activity) => {
            const response = await apiFetch('/api/activities', {
                method: 'PUT',
                body: JSON.stringify(activity),
            });
            if (!response.ok) throw new Error('Aktualisieren fehlgeschlagen');
            return response.json();
        },
        onMutate: async (activity) => {
            await queryClient.cancelQueries({ queryKey: ['activities'] });
            const prev = queryClient.getQueryData(['activities']);
            queryClient.setQueryData(['activities'], (old) => {
                if (!old?.activities) return old;
                return {
                    ...old,
                    activities: old.activities.map(a => a.id === activity.id ? { ...a, ...activity } : a),
                };
            });
            return { prev };
        },
        onSuccess: (_data, activity) => {
            hapticSuccess();
            addToast('Aktivität aktualisiert', 'success');
            emitDataChanged?.('activities', 'edit', activity.title);
            closeForm();
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['activities'], ctx.prev);
            hapticError();
            addToast(err.message || 'Fehler beim Aktualisieren', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
    });

    // Delete activity mutation (optimistic)
    const deleteMutation = useMutation({
        mutationFn: async ({ id, title }) => {
            const response = await apiFetch(`/api/activities?id=${id}`, { method: 'DELETE' });
            if (!response.ok) throw new Error('Löschen fehlgeschlagen');
            return response.json();
        },
        onMutate: async ({ id }) => {
            await queryClient.cancelQueries({ queryKey: ['activities'] });
            const prev = queryClient.getQueryData(['activities']);
            queryClient.setQueryData(['activities'], (old) => {
                if (!old?.activities) return old;
                return { ...old, activities: old.activities.filter(a => a.id !== id) };
            });
            return { prev };
        },
        onSuccess: (_data, { title }) => {
            hapticSuccess();
            addToast('Aktivität gelöscht', 'success');
            emitDataChanged?.('activities', 'delete', title);
        },
        onError: (err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['activities'], ctx.prev);
            hapticError();
            addToast(err.message || 'Fehler beim Löschen', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
    });

    // Toggle complete mutation (optimistic)
    const toggleMutation = useMutation({
        mutationFn: async (activity) => {
            const response = await apiFetch('/api/activities', {
                method: 'PUT',
                body: JSON.stringify({ ...activity, completed: !activity.completed }),
            });
            if (!response.ok) throw new Error('Aktualisieren fehlgeschlagen');
            return response.json();
        },
        onMutate: async (activity) => {
            await queryClient.cancelQueries({ queryKey: ['activities'] });
            const prev = queryClient.getQueryData(['activities']);
            queryClient.setQueryData(['activities'], (old) => {
                if (!old?.activities) return old;
                return {
                    ...old,
                    activities: old.activities.map(a =>
                        a.id === activity.id ? { ...a, completed: !a.completed } : a
                    ),
                };
            });
            return { prev };
        },
        onSuccess: (_data, activity) => {
            hapticMedium();
            if (!activity.completed) {
                // Was incomplete, now completed → celebrate!
                setConfettiTrigger(prev => prev + 1);
            }
            emitDataChanged?.('activities', activity.completed ? 'edit' : 'complete', activity.title);
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['activities'], ctx.prev);
            hapticError();
            addToast('Aktualisieren fehlgeschlagen', 'error');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['activities'] });
        },
    });

    const openAddForm = () => {
        setEditingActivity(null);
        setFormData({ title: '', type: 'other', address: '', latitude: '', longitude: '', description: '', planned_date: '', planned_time: '' });
        setShowForm(true);
    };

    const openEditForm = async (activity) => {
        setEditingActivity(activity);

        // Ensure we catch coordinates regardless of property name
        const lat = activity.latitude || activity.lat || '';
        const lon = activity.longitude || activity.lon || '';

        // Initial form data
        const initialData = {
            title: activity.title || '',
            type: activity.type || 'other',
            address: activity.address || '',
            latitude: lat,
            longitude: lon,
            description: activity.description || '',
            planned_date: activity.planned_date || '',
            planned_time: activity.planned_time || '',
        };

        setFormData(initialData);
        setShowForm(true);

        // If address is missing but we have coordinates, try to reverse geocode
        if (!initialData.address && lat && lon) {
            try {
                // Determine which coordinate set to use (ensure numbers)
                const latVal = parseFloat(lat);
                const lonVal = parseFloat(lon);

                if (isNaN(latVal) || isNaN(lonVal)) return;

                const response = await fetch(`/api/geocode?action=reverse&lat=${latVal}&lon=${lonVal}`);
                const data = await response.json();

                if (data.display_name) {
                    setFormData(prev => ({
                        ...prev,
                        address: data.display_name
                    }));
                }
            } catch (error) {
                console.error('Failed to reverse geocode:', error);
            }
        }
    };

    const closeForm = () => {
        setShowForm(false);
        setEditingActivity(null);
        setFormData({ title: '', type: 'other', address: '', latitude: '', longitude: '', description: '', planned_date: '', planned_time: '' });
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

        if (editingActivity) {
            updateMutation.mutate({ ...submitData, id: editingActivity.id });
        } else {
            createMutation.mutate(submitData);
        }
    };

    // Scroll to highlighted activity from search
    useEffect(() => {
        if (highlightId && highlightRef.current) {
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

    const formatDistance = (distance) => {
        if (distance === undefined || distance === null) return null;
        if (distance < 1) {
            return `${Math.round(distance * 1000)}m`;
        }
        return `${distance.toFixed(1)}km`;
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        return date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const getTypeEmoji = (type) => {
        const found = ACTIVITY_TYPES.find(t => t.value === type);
        return found ? found.label.split(' ')[0] : '📍';
    };

    const openGoogleMaps = (activity) => {
        const lat = activity.latitude || activity.lat;
        const lon = activity.longitude || activity.lon;
        if (lat && lon) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`, '_blank');
        } else if (activity.address) {
            window.open(`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(activity.address)}`, '_blank');
        }
    };

    // Show loading when query is loading OR when waiting for auth
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

                {/* Skeleton Search Input */}
                <div className="h-12 w-full bg-ios-gray-200 dark:bg-ios-gray-800 rounded-ios-xl animate-pulse mb-4" />

                <div className="space-y-3 mt-4">
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
                    Aktivitäten konnten nicht geladen werden.
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

    return (
        <PullToRefresh onRefresh={handleRefresh}>
            <Confetti trigger={confettiTrigger} />
            <div className="p-4 pb-8">
                <div className="flex items-start justify-between mb-6">
                    <div>
                        <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">Aktivitäten</h2>
                        {currentLocation && (
                            <p className="text-sm text-ios-gray-500 flex items-center gap-1 mt-1">
                                <Navigation className="w-3 h-3" />
                                Nach Entfernung sortiert
                            </p>
                        )}
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

                {/* Search and Filter */}
                <div className="space-y-3 mb-4">
                    {/* Search Input */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ios-gray-400" />
                        <input
                            type="text"
                            placeholder="Aktivitäten durchsuchen..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="input-ios pl-10 pr-4 py-3 bg-ios-gray-100 dark:bg-ios-gray-800"
                        />
                    </div>

                    {/* Filter Row */}
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                        {/* Status Filter */}
                        <div className="flex gap-1 bg-ios-gray-100 dark:bg-ios-gray-800 rounded-full p-1">
                            {[{ value: 'all', label: 'Alle' }, { value: 'open', label: 'Offen' }, { value: 'completed', label: '✓' }].map(status => (
                                <button
                                    key={status.value}
                                    onClick={() => setStatusFilter(status.value)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-full transition-all
                                          ${statusFilter === status.value
                                            ? 'bg-white dark:bg-ios-gray-700 text-ios-indigo shadow-sm'
                                            : 'text-ios-gray-600 dark:text-ios-gray-400'}`}
                                >
                                    {status.label}
                                </button>
                            ))}
                        </div>

                        {/* Type Filters */}
                        {ACTIVITY_TYPES.map(type => (
                            <button
                                key={type.value}
                                onClick={() => setTypeFilter(typeFilter === type.value ? 'all' : type.value)}
                                className={`flex-shrink-0 px-3 py-1.5 text-sm font-medium rounded-full transition-all whitespace-nowrap
                                      ${typeFilter === type.value
                                        ? 'bg-ios-indigo text-white shadow-ios'
                                        : 'bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-600 dark:text-ios-gray-400'}`}
                            >
                                {type.label.split(' ')[0]}
                            </button>
                        ))}
                    </div>

                    {/* Active Filter Indicator */}
                    {(searchQuery || activeFilterCount > 0) && (
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-ios-gray-500">
                                {filteredActivities.length} von {activities.length} Aktivitäten
                            </span>
                            <button
                                onClick={() => { setSearchQuery(''); setTypeFilter('all'); setStatusFilter('all'); }}
                                className="text-ios-indigo font-medium"
                            >
                                Filter zurücksetzen
                            </button>
                        </div>
                    )}
                </div>

                {/* Add/Edit Form Modal */}
                {showForm && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={closeForm}>
                        <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="bg-white dark:bg-ios-gray-800 rounded-t-ios-2xl w-full max-w-lg p-6 animate-slide-up overflow-hidden">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-semibold text-lg text-ios-gray-950 dark:text-white">
                                    {editingActivity ? 'Aktivität bearbeiten' : 'Neue Aktivität'}
                                </h3>
                                <button type="button" onClick={closeForm} className="p-2">
                                    <X className="w-5 h-5 text-ios-gray-500" />
                                </button>
                            </div>

                            <div className="space-y-4 max-h-[85vh] overflow-y-auto overflow-x-hidden overscroll-contain px-1">
                                <input
                                    type="text"
                                    placeholder="Titel *"
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    required
                                    className="input-ios"
                                />

                                <select
                                    value={formData.type}
                                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                    className="input-ios"
                                >
                                    {ACTIVITY_TYPES.map(type => (
                                        <option key={type.value} value={type.value}>{type.label}</option>
                                    ))}
                                </select>

                                <div>
                                    <label className="text-xs text-ios-gray-500 mb-1 block">Adresse (für Kartenanzeige)</label>
                                    <AddressInput
                                        value={formData.address}
                                        onChange={handleAddressChange}
                                        onCoordinatesChange={handleCoordinatesChange}
                                        placeholder="Adresse eingeben..."
                                        entityName={formData.title}
                                    />
                                </div>



                                <div className="grid grid-cols-2 gap-3">
                                    <div className="min-w-0">
                                        <label className="text-xs text-ios-gray-500 mb-1 block">Geplantes Datum</label>
                                        <input
                                            type="date"
                                            value={formData.planned_date}
                                            onChange={(e) => setFormData({ ...formData, planned_date: e.target.value })}
                                            className="input-ios py-3 text-sm max-w-full"
                                        />
                                    </div>
                                    <div className="min-w-0">
                                        <label className="text-xs text-ios-gray-500 mb-1 block">Uhrzeit</label>
                                        <input
                                            type="time"
                                            value={formData.planned_time}
                                            onChange={(e) => setFormData({ ...formData, planned_time: e.target.value })}
                                            className="input-ios py-3 text-sm max-w-full"
                                        />
                                    </div>
                                </div>

                                <textarea
                                    placeholder="Beschreibung"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    rows={3}
                                    className="input-ios min-h-[100px] resize-y"
                                />

                                <button
                                    type="submit"
                                    disabled={createMutation.isPending || updateMutation.isPending}
                                    className="w-full py-4 bg-ios-indigo text-white rounded-ios-lg font-semibold
                         transition-all active:scale-[0.98] disabled:opacity-50"
                                >
                                    {createMutation.isPending || updateMutation.isPending
                                        ? 'Speichern...'
                                        : editingActivity ? 'Speichern' : 'Aktivität hinzufügen'}
                                </button>
                            </div>
                        </form>
                    </div>
                )}

                {/* Main Content Area */}
                <>
                    {/* Activities List */}
                    {(() => {
                        const openActivities = filteredActivities.filter(a => !a.completed);
                        const completedActivities = filteredActivities.filter(a => a.completed);

                        const handleSwipe = () => {
                            if (showSwipeHint) {
                                setShowSwipeHint(false);
                                try { localStorage.setItem('activities-swipe-hint-seen', 'true'); } catch { }
                            }
                        };

                        const renderActivity = (activity) => (
                            <div
                                key={activity.id}
                                ref={highlightId === activity.id ? highlightRef : null}
                                className={`relative overflow-hidden rounded-ios-xl shadow-ios bg-white dark:bg-ios-gray-800 border border-ios-gray-100 dark:border-ios-gray-800 ${activity.completed ? 'opacity-50' : ''}`}
                            >
                                {showSwipeHint && !activity.completed && (
                                    <div className="md:hidden absolute top-2 right-2 z-10 px-2 py-1 bg-ios-indigo text-white text-xs rounded-full shadow-lg animate-pulse pointer-events-none">
                                        ← Wischen
                                    </div>
                                )}
                                <div ref={(el) => { actSwipeRefs.current[activity.id] = el; }} className="overflow-x-auto snap-x snap-mandatory scrollbar-hide flex w-full" onScroll={handleSwipe} onTouchStart={actHandleTouchStart} onTouchMove={actHandleTouchMove(activity.id)}>
                                    {/* Main Card Content */}
                                    <div className="w-full shrink-0 snap-center bg-white dark:bg-ios-gray-800 p-4">
                                        <div className="flex items-start gap-4">
                                            {/* Complete toggle */}
                                            <button
                                                onClick={() => toggleMutation.mutate(activity)}
                                                className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center
                                                 transition-all active:scale-90 ${activity.completed
                                                        ? 'bg-ios-green border-ios-green'
                                                        : 'border-ios-gray-300 dark:border-ios-gray-600'
                                                    }`}
                                            >
                                                {activity.completed && <Check className="w-4 h-4 text-white" />}
                                            </button>

                                            {/* Content */}
                                            <div className="flex-1 min-w-0" onClick={() => openEditForm(activity)}>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-lg">{getTypeEmoji(activity.type)}</span>
                                                    <h3 className={`font-semibold text-ios-gray-950 dark:text-white truncate ${activity.completed ? 'line-through text-ios-gray-400' : ''
                                                        }`}>
                                                        {activity.title}
                                                    </h3>
                                                </div>

                                                {activity.distance !== undefined && activity.distance !== null && (
                                                    <div className="flex items-center gap-1 text-sm text-ios-blue mb-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {formatDistance(activity.distance)} entfernt
                                                    </div>
                                                )}

                                                {activity.planned_date && (
                                                    <div className="flex items-center gap-1 text-sm text-ios-gray-500 mb-1">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(activity.planned_date)}{activity.planned_time ? ` · ${activity.planned_time} Uhr` : ''}
                                                    </div>
                                                )}

                                                {activity.created_by && activity.created_by !== user?.username && (
                                                    <div className="flex items-center gap-1 text-xs text-ios-gray-500 mb-1">
                                                        <User className="w-3 h-3" />
                                                        Erstellt von {capitalizeUsername(activity.created_by)}
                                                    </div>
                                                )}

                                                {activity.description && (
                                                    <p className="text-sm text-ios-gray-600 dark:text-ios-gray-400 line-clamp-2">
                                                        {activity.description}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Desktop Action buttons */}
                                            <div className="hidden md:flex flex-col gap-1 shrink-0">
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); openEditForm(activity); }}
                                                    className="p-2 text-ios-blue hover:bg-ios-blue/10 rounded-full transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ open: true, activity }); }}
                                                    className="p-2 text-ios-red hover:bg-ios-red/10 rounded-full transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        {((activity.latitude || activity.lat) && (activity.longitude || activity.lon)) || activity.address ? (
                                            <div className="mt-4" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => openGoogleMaps(activity)}
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
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openEditForm(activity); }}
                                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-ios-blue text-white transition-colors active:bg-ios-blue/80 border-l border-ios-gray-100 dark:border-ios-gray-700"
                                        >
                                            <Edit2 className="w-5 h-5" />
                                            <span className="text-[10px] font-bold uppercase">Bearbeiten</span>
                                        </button>
                                        <button
                                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setDeleteConfirm({ open: true, activity }); }}
                                            className="flex-1 flex flex-col items-center justify-center gap-1 bg-ios-red text-white transition-colors active:bg-ios-red/80"
                                        >
                                            <Trash2 className="w-5 h-5" />
                                            <span className="text-[10px] font-bold uppercase">Löschen</span>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );

                        if (filteredActivities.length === 0) {
                            return (
                                <div className="text-center py-16 px-4">
                                    <Compass className="w-16 h-16 mx-auto text-ios-gray-300 dark:text-ios-gray-700 mb-4" />
                                    <h3 className="text-lg font-semibold text-ios-gray-900 dark:text-white mb-2">
                                        {activities.length === 0 ? 'Noch keine Aktivitäten' : 'Keine passenden Aktivitäten'}
                                    </h3>
                                    <p className="text-ios-gray-500 dark:text-ios-gray-400 mb-6">
                                        {activities.length === 0
                                            ? 'Plane deine ersten Aktivitäten für deine Japan-Reise.'
                                            : 'Passe die Filter an oder füge neue Aktivitäten hinzu.'}
                                    </p>
                                    {activities.length === 0 && (
                                        <button
                                            onClick={() => setShowForm(true)}
                                            className="px-6 py-3 bg-ios-blue text-white rounded-ios-lg font-medium
                                                     shadow-ios transition-all active:scale-95 inline-flex items-center gap-2"
                                        >
                                            <Plus className="w-5 h-5" />
                                            Erste Aktivität hinzufügen
                                        </button>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <div className="space-y-3">
                                {/* Open Activities */}
                                {openActivities.map(renderActivity)}

                                {/* Completed Section - Collapsible */}
                                {completedActivities.length > 0 && (
                                    <>
                                        <button
                                            onClick={() => setShowCompleted(!showCompleted)}
                                            className="w-full flex items-center gap-3 py-3 mt-4"
                                        >
                                            <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                                            <span className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider flex items-center gap-2">
                                                <Check className="w-3.5 h-3.5" />
                                                Erledigt ({completedActivities.length})
                                                <span className={`transition-transform ${showCompleted ? 'rotate-180' : ''}`}>▼</span>
                                            </span>
                                            <div className="flex-1 h-px bg-ios-gray-200 dark:bg-ios-gray-700" />
                                        </button>
                                        {showCompleted && completedActivities.map(renderActivity)}
                                    </>
                                )}
                            </div>
                        );
                    })()}
                </>

                {/* Delete Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={deleteConfirm.open}
                    onClose={() => setDeleteConfirm({ open: false, activity: null })}
                    onConfirm={() => {
                        if (deleteConfirm.activity) {
                            deleteMutation.mutate({ id: deleteConfirm.activity.id, title: deleteConfirm.activity.title });
                        }
                    }}
                    title="Aktivität löschen?"
                    message={`Möchtest du "${deleteConfirm.activity?.title}" wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`}
                    confirmText="Löschen"
                    cancelText="Abbrechen"
                    type="danger"
                />
            </div>
        </PullToRefresh>
    );
}
