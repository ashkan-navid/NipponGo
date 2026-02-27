'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, Trash2, X, PiggyBank, TrendingDown, Calendar } from 'lucide-react';

const STORAGE_KEY = 'nippon-budget-tracker';
const CATEGORIES = [
    { value: 'food', label: 'Essen', icon: '🍜' },
    { value: 'transport', label: 'Transport', icon: '🚄' },
    { value: 'shopping', label: 'Shopping', icon: '🛍️' },
    { value: 'sightseeing', label: 'Sightseeing', icon: '⛩️' },
    { value: 'hotel', label: 'Unterkunft', icon: '🏨' },
    { value: 'other', label: 'Sonstiges', icon: '📦' },
];

function loadBudget() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : { dailyBudget: 10000, entries: [] };
    } catch {
        return { dailyBudget: 10000, entries: [] };
    }
}

function saveBudget(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { /* quota */ }
}

export default function BudgetTracker() {
    const [data, setData] = useState({ dailyBudget: 10000, entries: [] });
    const [showForm, setShowForm] = useState(false);
    const [editDailyBudget, setEditDailyBudget] = useState(false);
    const [newBudget, setNewBudget] = useState('');
    const [formData, setFormData] = useState({
        amount: '',
        category: 'food',
        note: '',
        date: new Date().toISOString().split('T')[0],
    });

    useEffect(() => {
        setData(loadBudget());
    }, []);

    const save = useCallback((newData) => {
        setData(newData);
        saveBudget(newData);
    }, []);

    const addEntry = useCallback(() => {
        if (!formData.amount || isNaN(parseFloat(formData.amount))) return;
        const entry = {
            id: Date.now(),
            amount: parseFloat(formData.amount),
            category: formData.category,
            note: formData.note.trim(),
            date: formData.date,
        };
        const newData = { ...data, entries: [entry, ...data.entries] };
        save(newData);
        setFormData({ amount: '', category: 'food', note: '', date: new Date().toISOString().split('T')[0] });
        setShowForm(false);
    }, [formData, data, save]);

    const deleteEntry = useCallback((id) => {
        save({ ...data, entries: data.entries.filter(e => e.id !== id) });
    }, [data, save]);

    const updateDailyBudget = useCallback(() => {
        const val = parseFloat(newBudget);
        if (isNaN(val) || val <= 0) return;
        save({ ...data, dailyBudget: val });
        setEditDailyBudget(false);
    }, [newBudget, data, save]);

    // Today's stats
    const today = new Date().toISOString().split('T')[0];
    const todayEntries = useMemo(() => data.entries.filter(e => e.date === today), [data.entries, today]);
    const todayTotal = useMemo(() => todayEntries.reduce((sum, e) => sum + e.amount, 0), [todayEntries]);
    const remaining = data.dailyBudget - todayTotal;
    const percentUsed = Math.min(100, Math.round((todayTotal / data.dailyBudget) * 100));

    // Category breakdown for today
    const categoryBreakdown = useMemo(() => {
        const map = {};
        todayEntries.forEach(e => {
            map[e.category] = (map[e.category] || 0) + e.amount;
        });
        return CATEGORIES.map(c => ({
            ...c,
            amount: map[c.value] || 0,
        })).filter(c => c.amount > 0).sort((a, b) => b.amount - a.amount);
    }, [todayEntries]);

    // All-time stats
    const totalSpent = useMemo(() => data.entries.reduce((sum, e) => sum + e.amount, 0), [data.entries]);
    const uniqueDays = useMemo(() => new Set(data.entries.map(e => e.date)).size, [data.entries]);

    return (
        <div className="p-4 pb-8 space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white">💴 Budget</h2>
                    <p className="text-sm text-ios-gray-500">Tagesbudget: ¥{data.dailyBudget.toLocaleString()}</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { setEditDailyBudget(true); setNewBudget(String(data.dailyBudget)); }}
                        className="p-2 text-ios-gray-500 hover:bg-ios-gray-100 dark:hover:bg-ios-gray-800
                                 rounded-full transition-all"
                        title="Tagesbudget ändern"
                    >
                        <PiggyBank className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setShowForm(true)}
                        className="p-2 bg-ios-blue text-white rounded-full shadow-ios transition-all active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Budget Progress Card */}
            <div className={`rounded-ios-xl shadow-ios p-5 ${remaining >= 0
                ? 'bg-gradient-to-br from-emerald-50 to-cyan-50 dark:from-ios-gray-900 dark:to-ios-gray-900 border border-emerald-100/50 dark:border-ios-gray-800'
                : 'bg-gradient-to-br from-red-50 to-orange-50 dark:from-ios-gray-900 dark:to-ios-gray-900 border border-red-100/50 dark:border-ios-gray-800'
                }`}>
                <div className="flex items-baseline justify-between mb-3">
                    <div>
                        <p className="text-3xl font-extrabold text-ios-gray-950 dark:text-white tabular-nums">
                            ¥{todayTotal.toLocaleString()}
                        </p>
                        <p className="text-sm text-ios-gray-500 mt-0.5">
                            heute ausgegeben
                        </p>
                    </div>
                    <div className="text-right">
                        <p className={`text-xl font-bold tabular-nums ${remaining >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                            {remaining >= 0 ? `¥${remaining.toLocaleString()}` : `-¥${Math.abs(remaining).toLocaleString()}`}
                        </p>
                        <p className="text-xs text-ios-gray-500">{remaining >= 0 ? 'übrig' : 'über Budget'}</p>
                    </div>
                </div>

                <div className="h-2.5 bg-white/60 dark:bg-ios-gray-700 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${percentUsed > 100 ? 'bg-red-500' : percentUsed > 80 ? 'bg-orange-400' : 'bg-emerald-500'
                            }`}
                        style={{ width: `${Math.min(percentUsed, 100)}%` }}
                    />
                </div>
                <p className="text-xs text-ios-gray-500 mt-1.5 text-right">{percentUsed}%</p>
            </div>

            {/* Category Breakdown */}
            {categoryBreakdown.length > 0 && (
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4">
                    <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-3">
                        Aufschlüsselung
                    </h3>
                    <div className="space-y-2">
                        {categoryBreakdown.map(c => (
                            <div key={c.value} className="flex items-center gap-3">
                                <span className="text-lg">{c.icon}</span>
                                <span className="flex-1 text-sm font-medium text-ios-gray-700 dark:text-ios-gray-300">{c.label}</span>
                                <span className="text-sm font-bold text-ios-gray-950 dark:text-white tabular-nums">
                                    ¥{c.amount.toLocaleString()}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Stats */}
            {data.entries.length > 0 && (
                <div className="bg-white dark:bg-ios-gray-900 rounded-ios-xl shadow-ios p-4">
                    <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-3">
                        📊 Gesamt-Statistik
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-center">
                        <div>
                            <p className="text-lg font-bold text-ios-gray-950 dark:text-white tabular-nums">
                                ¥{totalSpent.toLocaleString()}
                            </p>
                            <p className="text-xs text-ios-gray-500">Gesamt</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-ios-gray-950 dark:text-white tabular-nums">
                                {uniqueDays}
                            </p>
                            <p className="text-xs text-ios-gray-500">Tage</p>
                        </div>
                        <div>
                            <p className="text-lg font-bold text-ios-gray-950 dark:text-white tabular-nums">
                                ¥{uniqueDays > 0 ? Math.round(totalSpent / uniqueDays).toLocaleString() : 0}
                            </p>
                            <p className="text-xs text-ios-gray-500">Ø/Tag</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Today's entries */}
            <div>
                <h3 className="text-xs font-semibold text-ios-gray-500 uppercase tracking-wider mb-2 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Heute ({todayEntries.length})
                </h3>
                {todayEntries.length === 0 ? (
                    <div className="text-center py-8 text-ios-gray-400">
                        <TrendingDown className="w-10 h-10 mx-auto mb-2 opacity-30" />
                        <p className="text-sm">Noch keine Ausgaben heute</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {todayEntries.map(entry => {
                            const cat = CATEGORIES.find(c => c.value === entry.category);
                            return (
                                <div key={entry.id} className="flex items-center gap-3 p-3 bg-white dark:bg-ios-gray-800
                                                              rounded-ios-lg border border-ios-gray-100 dark:border-ios-gray-700">
                                    <span className="text-lg">{cat?.icon || '📦'}</span>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-ios-gray-950 dark:text-white truncate">
                                            {entry.note || cat?.label || 'Ausgabe'}
                                        </p>
                                        <p className="text-xs text-ios-gray-500">{cat?.label}</p>
                                    </div>
                                    <span className="text-sm font-bold text-ios-gray-950 dark:text-white tabular-nums shrink-0">
                                        ¥{entry.amount.toLocaleString()}
                                    </span>
                                    <button
                                        onClick={() => deleteEntry(entry.id)}
                                        className="p-1.5 text-ios-gray-400 hover:text-ios-red transition-colors shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Add Entry Modal */}
            {showForm && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center" onClick={() => setShowForm(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-ios-gray-800 rounded-t-ios-2xl w-full max-w-lg p-6 animate-slide-up">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold text-lg text-ios-gray-950 dark:text-white">Ausgabe hinzufügen</h3>
                            <button onClick={() => setShowForm(false)} className="p-2"><X className="w-5 h-5 text-ios-gray-500" /></button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-ios-gray-500 mb-1 block">Betrag (¥) *</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    placeholder="z.B. 1500"
                                    value={formData.amount}
                                    onChange={e => setFormData({ ...formData, amount: e.target.value })}
                                    className="input-ios text-xl font-bold"
                                    autoFocus
                                />
                            </div>

                            <div>
                                <label className="text-xs text-ios-gray-500 mb-1 block">Kategorie</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {CATEGORIES.map(c => (
                                        <button
                                            key={c.value}
                                            type="button"
                                            onClick={() => setFormData({ ...formData, category: c.value })}
                                            className={`p-2.5 rounded-ios-lg text-center transition-all text-sm font-medium
                                                      ${formData.category === c.value
                                                    ? 'bg-ios-blue text-white shadow-ios'
                                                    : 'bg-ios-gray-100 dark:bg-ios-gray-700 text-ios-gray-700 dark:text-ios-gray-300'}`}
                                        >
                                            <span className="text-lg block mb-0.5">{c.icon}</span>
                                            {c.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div>
                                <label className="text-xs text-ios-gray-500 mb-1 block">Notiz (optional)</label>
                                <input
                                    type="text"
                                    placeholder="z.B. Ramen bei Ichiran"
                                    value={formData.note}
                                    onChange={e => setFormData({ ...formData, note: e.target.value })}
                                    className="input-ios"
                                />
                            </div>

                            <div>
                                <label className="text-xs text-ios-gray-500 mb-1 block">Datum</label>
                                <input
                                    type="date"
                                    value={formData.date}
                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                    className="input-ios"
                                />
                            </div>

                            <button
                                onClick={addEntry}
                                disabled={!formData.amount}
                                className="w-full py-4 bg-ios-blue text-white rounded-ios-lg font-semibold
                                         transition-all active:scale-[0.98] disabled:opacity-50"
                            >
                                Ausgabe speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Daily Budget Modal */}
            {editDailyBudget && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-6" onClick={() => setEditDailyBudget(false)}>
                    <div onClick={e => e.stopPropagation()}
                        className="bg-white dark:bg-ios-gray-800 rounded-ios-xl w-full max-w-sm p-6 animate-scale-in">
                        <h3 className="font-semibold text-lg text-ios-gray-950 dark:text-white mb-4">Tagesbudget ändern</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs text-ios-gray-500 mb-1 block">Tagesbudget (¥)</label>
                                <input
                                    type="number"
                                    inputMode="numeric"
                                    value={newBudget}
                                    onChange={e => setNewBudget(e.target.value)}
                                    className="input-ios text-xl font-bold"
                                    autoFocus
                                />
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setEditDailyBudget(false)} className="flex-1 py-3 bg-ios-gray-100 dark:bg-ios-gray-700 rounded-ios-lg font-medium text-ios-gray-700 dark:text-ios-gray-300">
                                    Abbrechen
                                </button>
                                <button onClick={updateDailyBudget} className="flex-1 py-3 bg-ios-blue text-white rounded-ios-lg font-semibold">
                                    Speichern
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
