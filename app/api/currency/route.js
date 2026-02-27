import { NextResponse } from 'next/server';

let db;
try {
    db = require('../../../lib/db.js');
} catch (e) {
    console.error('Database not available:', e.message);
}

const CURRENCY_API = 'https://api.frankfurter.app/latest';
const ALLOWED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];
const FALLBACK_RATES = { EUR: 160.0, USD: 145.0, GBP: 185.0, CHF: 165.0 };

// GET - Get exchange rate to JPY
export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const from = ALLOWED_CURRENCIES.includes(searchParams.get('from'))
            ? searchParams.get('from')
            : 'EUR';

        let rate = null;
        let cached = false;
        let cachedAt = null;

        try {
            const response = await fetch(`${CURRENCY_API}?from=${from}&to=JPY`, {
                next: { revalidate: 3600 },
            });

            if (response.ok) {
                const data = await response.json();
                rate = data.rates?.JPY;

                if (rate && db) {
                    db.setCachedRate(rate);
                }

                cachedAt = Math.floor(Date.now() / 1000);
            }
        } catch (fetchError) {
            console.warn('Failed to fetch currency rate:', fetchError.message);
        }

        // If fresh fetch failed, try cached rate (only for EUR, as that's what we cache)
        if (!rate && db && from === 'EUR') {
            const cachedRate = db.getCachedRate();
            if (cachedRate) {
                rate = cachedRate.rate;
                cached = true;
                cachedAt = cachedRate.cached_at;
            }
        }

        if (!rate) {
            rate = FALLBACK_RATES[from] || 160.0;
            cached = true;
            cachedAt = 'fallback';
        }

        return NextResponse.json({
            base: from,
            target: 'JPY',
            rate,
            cached,
            cachedAt,
            timestamp: new Date().toISOString(),
        });
    } catch (error) {
        console.error('Currency error:', error);
        const from = 'EUR';
        return NextResponse.json({
            error: 'Failed to get exchange rate',
            base: from,
            target: 'JPY',
            rate: FALLBACK_RATES[from],
            cached: true,
            cachedAt: 'fallback',
        }, { status: 200 });
    }
}
