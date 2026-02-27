'use client';

import { useState, useEffect } from 'react';
import { ArrowLeftRight, RefreshCw, AlertCircle } from 'lucide-react';

export default function CurrencyConverter() {
    const [amount, setAmount] = useState('100');
    const [baseCurrency, setBaseCurrency] = useState('EUR');
    const [fromCurrency, setFromCurrency] = useState('JPY');
    const [rate, setRate] = useState(null);
    const [cached, setCached] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdatedText, setLastUpdatedText] = useState('Lade...');

    const CURRENCIES = [
        { code: 'EUR', flag: '🇪🇺', symbol: '€' },
        { code: 'USD', flag: '🇺🇸', symbol: '$' },
        { code: 'GBP', flag: '🇬🇧', symbol: '£' },
        { code: 'CHF', flag: '🇨🇭', symbol: 'Fr.' },
    ];

    const fetchRate = async (currency) => {
        const base = currency || baseCurrency;
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`/api/currency?from=${base}`);
            const data = await response.json();

            setRate(data.rate);
            setCached(data.cached);

            // Set the relative time or 'Gerade eben' if freshly fetched
            import('../lib/utils').then(({ getRelativeTimeDe }) => {
                if (!data.cached || data.cachedAt === 'fallback') {
                    setLastUpdatedText('Gerade aktualisiert');
                } else if (data.cachedAt) {
                    setLastUpdatedText(getRelativeTimeDe(data.cachedAt));
                } else {
                    setLastUpdatedText('Bargeld-Budget');
                }
            });

        } catch (err) {
            setError('Wechselkurs konnte nicht abgerufen werden');
            console.error('Currency fetch error:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRate(baseCurrency);
    }, [baseCurrency]);

    const handleBaseCurrencyChange = (newBase) => {
        setBaseCurrency(newBase);
        // fromCurrency bleibt immer 'JPY' — damit immer JPY→X angezeigt wird
    };

    const swapCurrencies = () => {
        setFromCurrency(fromCurrency === baseCurrency ? 'JPY' : baseCurrency);
    };

    const convert = (value) => {
        if (!rate || !value) return '';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '';

        if (fromCurrency === baseCurrency) {
            return (numValue * rate).toFixed(0);
        } else {
            return (numValue / rate).toFixed(2);
        }
    };

    const formatCurrency = (value, currency) => {
        if (!value) return '—';
        const numValue = parseFloat(value);
        if (isNaN(numValue)) return '—';

        return new Intl.NumberFormat('de-DE', {
            style: 'currency',
            currency: currency,
            maximumFractionDigits: currency === 'JPY' ? 0 : 2,
        }).format(numValue);
    };

    return (
        <div className="p-4 pb-8 space-y-6">
            <div className="text-center mb-4">
                <h2 className="text-2xl font-bold text-ios-gray-950 dark:text-white mb-2">
                    Währungsrechner
                </h2>
                <p className="text-ios-gray-600 dark:text-ios-gray-400">
                    Umrechnung nach 🇯🇵 JPY
                </p>
                {/* Currency Selector */}
                <div className="flex justify-center gap-2 mt-3">
                    {CURRENCIES.map(c => (
                        <button
                            key={c.code}
                            onClick={() => handleBaseCurrencyChange(c.code)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all 
                                ${baseCurrency === c.code
                                    ? 'bg-ios-blue text-white shadow-ios'
                                    : 'bg-ios-gray-100 dark:bg-ios-gray-800 text-ios-gray-600 dark:text-ios-gray-400'}`}
                        >
                            {c.flag} {c.code}
                        </button>
                    ))}
                </div>
            </div>

            {/* Rate Display */}
            <div className="bg-gradient-to-br from-ios-blue to-ios-purple p-6 rounded-ios-xl text-white shadow-ios-lg">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-white/80 font-medium">
                        {loading ? 'Aktualisiere...' : lastUpdatedText}
                    </span>
                    <button
                        onClick={() => fetchRate()}
                        disabled={loading}
                        className="p-2 bg-white/20 rounded-full transition-all active:scale-95"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {rate ? (
                    <>
                        <p className="text-3xl font-bold mb-1">
                            1 {baseCurrency} = {rate.toLocaleString('de-DE')} JPY
                        </p>
                        {cached && (
                            <p className="text-white/60 text-xs flex items-center gap-1">
                                <AlertCircle className="w-3 h-3" />
                                Gespeicherter Kurs (offline)
                            </p>
                        )}
                    </>
                ) : (
                    <p className="text-white/60">Lade Kurs...</p>
                )}
            </div>

            {/* Converter */}
            <div className="bg-white dark:bg-ios-gray-800 rounded-ios-xl shadow-ios overflow-hidden">
                {/* Header/Amount Input */}
                <div className="p-6 border-b border-ios-gray-200 dark:border-ios-gray-700">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-ios-gray-600 dark:text-ios-gray-400">
                            Von
                        </span>
                        <span className="text-lg font-semibold text-ios-gray-950 dark:text-white">
                            {fromCurrency === baseCurrency
                                ? `${CURRENCIES.find(c => c.code === baseCurrency)?.flag || ''} ${baseCurrency}`
                                : '🇯🇵 JPY'}
                        </span>
                    </div>
                    <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Betrag eingeben"
                        className="w-full text-3xl font-bold text-ios-gray-950 dark:text-white 
                       bg-transparent outline-none placeholder:text-ios-gray-400"
                    />
                    <p className="text-sm text-ios-gray-500 mt-2">
                        {formatCurrency(amount, fromCurrency)}
                    </p>
                </div>

                {/* Swap Button */}
                <div className="relative h-0">
                    <button
                        onClick={swapCurrencies}
                        className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 z-10
                       w-12 h-12 bg-ios-blue text-white rounded-full shadow-ios-lg
                       flex items-center justify-center transition-all active:scale-95"
                    >
                        <ArrowLeftRight className="w-5 h-5" />
                    </button>
                </div>

                {/* To Currency */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-ios-gray-600 dark:text-ios-gray-400">
                            Nach
                        </span>
                        <span className="text-lg font-semibold text-ios-gray-950 dark:text-white">
                            {fromCurrency === baseCurrency
                                ? '🇯🇵 JPY'
                                : `${CURRENCIES.find(c => c.code === baseCurrency)?.flag || ''} ${baseCurrency}`}
                        </span>
                    </div>
                    <p className="text-3xl font-bold text-ios-gray-950 dark:text-white">
                        {convert(amount) || '—'}
                    </p>
                    <p className="text-sm text-ios-gray-500 mt-2">
                        {formatCurrency(convert(amount), fromCurrency === baseCurrency ? 'JPY' : baseCurrency)}
                    </p>
                </div>
            </div>

            {/* Quick Amounts */}
            <div className="space-y-3">
                <p className="text-sm font-medium text-ios-gray-600 dark:text-ios-gray-400 text-center">
                    Schnellbeträge
                </p>
                <div className="grid grid-cols-4 gap-3">
                    {fromCurrency === baseCurrency
                        ? [10, 50, 100, 500].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val.toString())}
                                className="py-3 bg-ios-gray-100 dark:bg-ios-gray-800 rounded-ios-lg
                             font-medium text-ios-gray-950 dark:text-white
                             transition-all active:scale-95 active:bg-ios-gray-200 dark:active:bg-ios-gray-700"
                            >
                                {CURRENCIES.find(c => c.code === baseCurrency)?.symbol}{val}
                            </button>
                        ))
                        : [1000, 5000, 10000, 50000].map(val => (
                            <button
                                key={val}
                                onClick={() => setAmount(val.toString())}
                                className="py-3 bg-ios-gray-100 dark:bg-ios-gray-800 rounded-ios-lg
                             font-medium text-ios-gray-950 dark:text-white text-sm
                             transition-all active:scale-95 active:bg-ios-gray-200 dark:active:bg-ios-gray-700"
                            >
                                ¥{val.toLocaleString('de-DE')}
                            </button>
                        ))
                    }    </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-4 bg-ios-red/10 rounded-ios-xl flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 text-ios-red flex-shrink-0" />
                    <p className="text-sm text-ios-red">{error}</p>
                </div>
            )}
        </div>
    );
}
