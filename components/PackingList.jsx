'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Plus, Trash2, RotateCcw, Package, Users } from 'lucide-react';
import PACKING_CATEGORIES from '../lib/packingList';
import { apiPost, apiDelete } from '../lib/apiClient';
import { hapticLight, hapticSuccess, hapticMedium, hapticError } from '../lib/haptics';
import useToastStore from '../store/toastStore';
import PullToRefresh from './PullToRefresh';
import ConfirmDialog from './ConfirmDialog';
import { capitalizeUsername } from '../lib/utils';

const SYNC_KEY = 'packing-sync-enabled';

export default function PackingList({ highlightCategory, highlightItemText, onHighlightDone, hasFriends = false }) {
    const [activeCategory, setActiveCategory] = useState('documents');
    const [highlightedItem, setHighlightedItem] = useState(null);
    const itemRefs = useRef({});

    // Switch to highlighted category from search
    useEffect(() => {
        if (highlightCategory && PACKING_CATEGORIES[highlightCategory]) {
            setActiveCategory(highlightCategory);

            if (highlightItemText) {
                setHighlightedItem(highlightItemText);
                setTimeout(() => {
                    itemRefs.current[highlightItemText]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    itemRefs.current[highlightItemText]?.classList.add('ring-2', 'ring-ios-blue', 'ring-offset-2');
                    setTimeout(() => {
                        itemRefs.current[highlightItemText]?.classList.remove('ring-2', 'ring-ios-blue', 'ring-offset-2');
                        setHighlightedItem(null);
                        onHighlightDone?.();
                    }, 2000);
                }, 200);
            } else {
                onHighlightDone?.();
            }
        }
    }, [highlightCategory, highlightItemText, onHighlightDone]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newItemText, setNewItemText] = useState('');
    const [showResetConfirm, setShowResetConfirm] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [syncEnabled, setSyncEnabled] = useState(() => {
        try { return localStorage.getItem(SYNC_KEY) === 'true'; } catch { return false; }
    });
    const queryClient = useQueryClient();
    const { addToast } = useToastStore();

    // Auto-disable sync when no friends
    useEffect(() => {
        if (syncEnabled && !hasFriends) {
            setSyncEnabled(false);
            try { localStorage.setItem(SYNC_KEY, 'false'); } catch { }
            addToast('Synchronisierung deaktiviert — keine Freunde vorhanden', 'info');
        }
    }, [hasFriends, syncEnabled, addToast]);

    // Fetch user's packing items (checked state + custom items)
    const { data, refetch } = useQuery({
        queryKey: ['packing', syncEnabled],
        queryFn: async () => {
            const url = syncEnabled ? '/api/packing?sync=true' : '/api/packing';
            const res = await fetch(url, { credentials: 'same-origin' });
            if (!res.ok) return { items: [], friendItems: [] };
            return res.json();
        },
        staleTime: 5000,
    });

    const userItems = data?.items || [];
    const friendItems = data?.friendItems || [];

    const toggleSync = () => {
        const next = !syncEnabled;
        setSyncEnabled(next);
        try { localStorage.setItem(SYNC_KEY, String(next)); } catch { }
        hapticLight();
        if (next) {
            addToast('Packliste wird mit Freunden synchronisiert', 'success');
        } else {
            addToast('Synchronisierung deaktiviert', 'info');
        }
    };

    // Toggle check mutation
    const toggleMutation = useMutation({
        mutationFn: async ({ category, itemText }) => {
            const res = await apiPost('/api/packing', { action: 'toggle', category, itemText });
            if (!res.ok) throw new Error('Toggle fehlgeschlagen');
            return res.json();
        },
        onMutate: async ({ category, itemText }) => {
            await queryClient.cancelQueries({ queryKey: ['packing'] });
            const prev = queryClient.getQueryData(['packing', syncEnabled]);
            queryClient.setQueryData(['packing', syncEnabled], (old) => {
                if (!old) return old;
                const items = [...old.items];
                const idx = items.findIndex(i => i.category === category && i.item_text === itemText);
                if (idx >= 0) {
                    items[idx] = { ...items[idx], is_checked: items[idx].is_checked ? 0 : 1 };
                } else {
                    items.push({ id: Date.now(), user_id: 0, category, item_text: itemText, is_custom: 0, is_checked: 1 });
                }
                return { ...old, items };
            });
            hapticLight();
            return { prev };
        },
        onError: (_err, _vars, ctx) => {
            if (ctx?.prev) queryClient.setQueryData(['packing', syncEnabled], ctx.prev);
            hapticError();
        },
        onSettled: () => queryClient.invalidateQueries({ queryKey: ['packing'] }),
    });

    // Add custom item mutation
    const addMutation = useMutation({
        mutationFn: async ({ category, itemText }) => {
            const res = await apiPost('/api/packing', { action: 'add', category, itemText });
            if (!res.ok) throw new Error('Hinzufügen fehlgeschlagen');
            return res.json();
        },
        onSuccess: () => {
            hapticSuccess();
            addToast('Eigener Punkt hinzugefügt', 'success');
            setNewItemText('');
            setShowAddForm(false);
            queryClient.invalidateQueries({ queryKey: ['packing'] });
        },
        onError: () => {
            hapticError();
            addToast('Fehler beim Hinzufügen', 'error');
        },
    });

    // Delete custom item mutation
    const deleteMutation = useMutation({
        mutationFn: async (id) => {
            const res = await apiDelete(`/api/packing?id=${id}`);
            if (!res.ok) throw new Error('Löschen fehlgeschlagen');
            return res.json();
        },
        onSuccess: () => {
            hapticMedium();
            addToast('Punkt gelöscht', 'info');
            queryClient.invalidateQueries({ queryKey: ['packing'] });
        },
        onError: () => {
            hapticError();
            addToast('Fehler beim Löschen', 'error');
        },
    });

    // Reset all checks
    const resetMutation = useMutation({
        mutationFn: async () => {
            const res = await apiPost('/api/packing', { action: 'reset' });
            if (!res.ok) throw new Error('Reset fehlgeschlagen');
            return res.json();
        },
        onSuccess: () => {
            hapticSuccess();
            addToast('Alle Häkchen entfernt', 'success');
            // If sync was enabled, disable it on reset
            if (syncEnabled) {
                setSyncEnabled(false);
                try { localStorage.setItem(SYNC_KEY, 'false'); } catch { }
                addToast('Synchronisierung mit Freunden beendet', 'info');
            }
            queryClient.invalidateQueries({ queryKey: ['packing'] });
        },
    });

    // Build a set of friend-checked items for quick lookup
    const friendCheckedMap = useMemo(() => {
        const map = {}; // key: `${category}::${item_text}` -> [username1, username2, ...]
        friendItems.forEach(fi => {
            const key = `${fi.category}::${fi.item_text}`;
            if (!map[key]) map[key] = [];
            if (!map[key].includes(fi.username)) {
                map[key].push(fi.username);
            }
        });
        return map;
    }, [friendItems]);

    // Merge default items with user-specific check state, custom items, and friend data
    const mergedItems = useMemo(() => {
        const result = {};

        Object.entries(PACKING_CATEGORIES).forEach(([key, cat]) => {
            const defaultItems = cat.items.map((text) => {
                const userItem = userItems.find(
                    ui => ui.category === key && ui.item_text === text && !ui.is_custom
                );
                const friendKey = `${key}::${text}`;
                const checkedByFriends = syncEnabled ? (friendCheckedMap[friendKey] || []) : [];
                return {
                    id: userItem?.id || `default-${key}-${text}`,
                    text,
                    isChecked: !!userItem?.is_checked || checkedByFriends.length > 0,
                    isCheckedBySelf: !!userItem?.is_checked,
                    checkedByFriends,
                    isCustom: false,
                };
            });

            // Custom items for this category
            const customItems = userItems
                .filter(ui => ui.category === key && ui.is_custom)
                .map(ci => ({
                    id: ci.id,
                    text: ci.item_text,
                    isChecked: !!ci.is_checked,
                    isCheckedBySelf: !!ci.is_checked,
                    checkedByFriends: [],
                    isCustom: true,
                }));

            // Add friend custom items that are not in user's list (when synced)
            if (syncEnabled) {
                const friendCustoms = friendItems
                    .filter(fi => fi.category === key && fi.is_custom)
                    .filter(fi => !customItems.find(ci => ci.text === fi.item_text) &&
                        !cat.items.includes(fi.item_text));

                const uniqueFriendCustoms = [];
                const seenTexts = new Set(customItems.map(ci => ci.text));
                friendCustoms.forEach(fi => {
                    if (!seenTexts.has(fi.item_text)) {
                        seenTexts.add(fi.item_text);
                        uniqueFriendCustoms.push({
                            id: `friend-${fi.id}`,
                            text: fi.item_text,
                            isChecked: true,
                            isCheckedBySelf: false,
                            checkedByFriends: [fi.username],
                            isCustom: false, // Don't show delete for friend items
                            isFriendItem: true,
                        });
                    }
                });

                customItems.push(...uniqueFriendCustoms);
            }

            result[key] = {
                ...cat,
                items: [...defaultItems, ...customItems],
            };
        });

        return result;
    }, [userItems, friendItems, syncEnabled, friendCheckedMap]);

    // Stats
    const activeCat = mergedItems[activeCategory];
    const checkedCount = activeCat?.items.filter(i => i.isChecked).length || 0;
    const totalCount = activeCat?.items.length || 0;

    // Total stats across all categories
    const totalStats = useMemo(() => {
        let checked = 0, total = 0;
        Object.values(mergedItems).forEach(cat => {
            cat.items.forEach(item => {
                total++;
                if (item.isChecked) checked++;
            });
        });
        return { checked, total };
    }, [mergedItems]);

    const resetMessage = syncEnabled
        ? 'Möchtest du alle deine Häkchen entfernen? Deine Synchronisierung mit Freunden wird ebenfalls beendet. Die Häkchen deiner Freunde bleiben unberührt.'
        : 'Möchtest du alle Häkchen entfernen? Diese Aktion kann nicht rückgängig gemacht werden.';

    return (
        <PullToRefresh onRefresh={refetch}>
            <div className="p-4 space-y-4 pb-8">
                {/* Header */}
                <div className="space-y-3">
                    <div className="flex items-start justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white flex items-center gap-2">
                                <Package className="w-7 h-7 text-ios-blue" />
                                Packliste
                            </h2>
                            <p className="text-ios-gray-500 dark:text-ios-gray-400 text-sm mt-0.5">
                                Deine Japan-Reise-Checkliste
                            </p>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Sync toggle */}
                            <button
                                onClick={toggleSync}
                                disabled={!hasFriends && !syncEnabled}
                                className={`p-2.5 rounded-ios transition-all active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed ${syncEnabled
                                    ? 'bg-ios-green/15 text-ios-green'
                                    : 'bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-500 dark:text-ios-gray-400'
                                    }`}
                                title={!hasFriends ? 'Füge Freunde hinzu, um die Packliste zu synchronisieren' : syncEnabled ? 'Synchronisierung aktiv' : 'Mit Freunden synchronisieren'}
                            >
                                <Users className="w-5 h-5" />
                            </button>
                            {/* Reset button */}
                            <button
                                onClick={() => setShowResetConfirm(true)}
                                className="p-2.5 rounded-ios bg-ios-gray-100 dark:bg-ios-gray-800
                                         text-ios-gray-500 dark:text-ios-gray-400 hover:bg-ios-gray-200
                                         dark:hover:bg-ios-gray-700 transition-all active:scale-95"
                                title="Alle Häkchen entfernen"
                            >
                                <RotateCcw className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Sync indicator */}
                    {syncEnabled && (
                        <div className="flex items-center gap-2 px-3 py-2 bg-ios-green/10 border border-ios-green/20 rounded-ios text-sm text-ios-green animate-fade-in">
                            <Users className="w-4 h-4 flex-shrink-0" />
                            <span>Synchronisiert mit Freunden</span>
                        </div>
                    )}

                    {/* Overall progress */}
                    <div className="space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-ios-gray-500 dark:text-ios-gray-400">Gesamt-Fortschritt</span>
                            <span className="font-semibold text-ios-blue">
                                {totalStats.checked} / {totalStats.total}
                            </span>
                        </div>
                        <div className="h-2 bg-ios-gray-200 dark:bg-ios-gray-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-ios-blue to-ios-green rounded-full transition-all duration-500"
                                style={{ width: `${totalStats.total > 0 ? (totalStats.checked / totalStats.total) * 100 : 0}%` }}
                            />
                        </div>
                    </div>
                </div>

                {/* Category pills */}
                <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
                    {Object.entries(PACKING_CATEGORIES).map(([key, cat]) => {
                        const catItems = mergedItems[key]?.items || [];
                        const catChecked = catItems.filter(i => i.isChecked).length;
                        const allDone = catItems.length > 0 && catChecked === catItems.length;
                        return (
                            <button
                                key={key}
                                onClick={() => {
                                    hapticLight();
                                    setActiveCategory(key);
                                    setShowAddForm(false);
                                }}
                                className={`flex-shrink-0 px-3.5 py-2 rounded-full text-sm font-medium
                                           transition-all active:scale-95 ${activeCategory === key
                                        ? 'bg-ios-blue text-white shadow-ios'
                                        : allDone
                                            ? 'bg-ios-green/15 text-ios-green dark:bg-ios-green/20'
                                            : 'bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-700 dark:text-ios-gray-300'
                                    }`}
                            >
                                <span className="mr-1.5">{cat.icon}</span>
                                {cat.label}
                                <span className="ml-1.5 text-xs opacity-75">{catChecked}/{catItems.length}</span>
                            </button>
                        );
                    })}
                </div>

                {/* Category progress */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-ios-gray-200 dark:bg-ios-gray-800 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-ios-blue rounded-full transition-all duration-300"
                            style={{ width: `${totalCount > 0 ? (checkedCount / totalCount) * 100 : 0}%` }}
                        />
                    </div>
                    <span className="text-xs font-medium text-ios-gray-500 dark:text-ios-gray-400 whitespace-nowrap">
                        {checkedCount}/{totalCount}
                    </span>
                </div>

                {/* Items list */}
                <div className="space-y-2">
                    {activeCat?.items.map((item) => (
                        <div
                            key={item.id}
                            ref={el => itemRefs.current[item.text] = el}
                            onClick={() => toggleMutation.mutate({ category: activeCategory, itemText: item.text })}
                            className={`flex items-center gap-3 p-3.5 rounded-ios-xl transition-all cursor-pointer
                                       active:scale-[0.98] select-none ${item.isChecked
                                    ? 'bg-ios-green/8 border border-ios-green/20'
                                    : 'bg-white dark:bg-ios-gray-800 border border-ios-gray-200 dark:border-ios-gray-700'
                                } ${highlightedItem === item.text ? 'ring-2 ring-ios-blue ring-offset-2 ring-offset-white dark:ring-offset-ios-gray-950' : ''}`}
                        >
                            <div
                                className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center
                                           transition-all ${item.isChecked
                                        ? 'bg-ios-green border-ios-green'
                                        : 'border-ios-gray-300 dark:border-ios-gray-600'
                                    }`}
                            >
                                {item.isChecked && <Check className="w-4 h-4 text-white" strokeWidth={3} />}
                            </div>

                            <div className="flex-1 min-w-0">
                                <span
                                    className={`text-sm ${item.isChecked
                                        ? 'line-through text-ios-gray-400 dark:text-ios-gray-500'
                                        : 'text-ios-gray-900 dark:text-white'
                                        }`}
                                >
                                    {item.text}
                                </span>
                                {syncEnabled && item.checkedByFriends.length > 0 && (
                                    <p className="text-[11px] text-ios-green mt-0.5">
                                        {item.checkedByFriends.map(u => capitalizeUsername(u)).join(', ')}
                                    </p>
                                )}
                            </div>

                            {item.isCustom && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); setItemToDelete(item); }}
                                    className="flex-shrink-0 p-1.5 rounded-full text-ios-red/60 hover:text-ios-red
                                             hover:bg-ios-red/10 transition-all active:scale-90"
                                    aria-label="Item löschen"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}

                    {/* Add custom item */}
                    {showAddForm ? (
                        <div className="p-4 bg-ios-blue/5 border border-ios-blue/20 rounded-ios-xl space-y-3">
                            <input
                                type="text"
                                placeholder="Eigenen Punkt hinzufügen..."
                                value={newItemText}
                                onChange={(e) => setNewItemText(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newItemText.trim()) {
                                        addMutation.mutate({ category: activeCategory, itemText: newItemText.trim() });
                                    }
                                }}
                                className="w-full px-4 py-2.5 bg-white dark:bg-ios-gray-800 border border-ios-gray-200
                                         dark:border-ios-gray-700 rounded-ios text-sm text-ios-gray-900 dark:text-white
                                         placeholder:text-ios-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/30
                                         focus:border-ios-blue"
                                maxLength={200}
                                autoFocus
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (newItemText.trim()) {
                                            addMutation.mutate({ category: activeCategory, itemText: newItemText.trim() });
                                        }
                                    }}
                                    disabled={!newItemText.trim() || addMutation.isPending}
                                    className="flex-1 py-2.5 bg-ios-blue text-white rounded-ios font-medium text-sm
                                             disabled:opacity-50 transition-all active:scale-95"
                                >
                                    Hinzufügen
                                </button>
                                <button
                                    onClick={() => { setShowAddForm(false); setNewItemText(''); }}
                                    className="px-4 py-2.5 bg-ios-gray-200 dark:bg-ios-gray-700 text-ios-gray-700
                                             dark:text-ios-gray-300 rounded-ios font-medium text-sm transition-all active:scale-95"
                                >
                                    Abbrechen
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="w-full flex items-center justify-center gap-2 p-3.5 border-2 border-dashed
                                     border-ios-gray-300 dark:border-ios-gray-700 rounded-ios-xl
                                     text-ios-gray-500 dark:text-ios-gray-400 hover:border-ios-blue
                                     hover:text-ios-blue transition-all active:scale-[0.98] text-sm"
                        >
                            <Plus className="w-4 h-4" />
                            Eigenen Punkt hinzufügen
                        </button>
                    )}
                </div>

                {/* Delete Item Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={!!itemToDelete}
                    onClose={() => setItemToDelete(null)}
                    onConfirm={() => {
                        deleteMutation.mutate(itemToDelete.id);
                        setItemToDelete(null);
                    }}
                    title="Item löschen?"
                    message={`Möchtest du "${itemToDelete?.text}" wirklich aus deiner Packliste entfernen?`}
                    confirmText="Löschen"
                    cancelText="Abbrechen"
                    type="danger"
                />

                {/* Reset Confirmation Dialog */}
                <ConfirmDialog
                    isOpen={showResetConfirm}
                    onClose={() => setShowResetConfirm(false)}
                    onConfirm={() => resetMutation.mutate()}
                    title="Packliste zurücksetzen?"
                    message={resetMessage}
                    confirmText="Zurücksetzen"
                    cancelText="Abbrechen"
                    type="warning"
                />
            </div>
        </PullToRefresh>
    );
}
