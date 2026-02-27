import { NextResponse } from 'next/server';
const { checkRateLimit } = require('../../../lib/rateLimit.js');

// In-memory cache: grid-cell → { data, fetchedAt }
const weatherCache = new Map();
const forecastCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes
const FORECAST_CACHE_TTL = 30 * 60 * 1000; // 30 minutes

const API_KEY = process.env.OPENWEATHERMAP_API_KEY || '';

// Round coordinates to 2 decimals (~1km grid) for cache deduplication
function cacheKey(lat, lon) {
    return `${Math.round(lat * 100) / 100},${Math.round(lon * 100) / 100}`;
}

// Group 3-hour forecast data into daily summaries
function groupForecastByDay(list) {
    const days = {};

    for (const entry of list) {
        const date = entry.dt_txt.split(' ')[0]; // 'YYYY-MM-DD'
        if (!days[date]) {
            days[date] = { temps: [], icons: [], descriptions: [], pops: [] };
        }
        days[date].temps.push(entry.main.temp);
        days[date].icons.push(entry.weather?.[0]?.icon || '01d');
        days[date].descriptions.push(entry.weather?.[0]?.description || '');
        days[date].pops.push(entry.pop || 0);
    }

    // Convert to daily summaries (skip today, take next 5 days)
    const today = new Date().toISOString().split('T')[0];
    return Object.entries(days)
        .filter(([date]) => date !== today)
        .slice(0, 5)
        .map(([date, data]) => {
            // Pick the most frequently occurring icon (prefer daytime icons)
            const dayIcons = data.icons.filter(i => i.endsWith('d'));
            const iconCounts = {};
            (dayIcons.length > 0 ? dayIcons : data.icons).forEach(icon => {
                iconCounts[icon] = (iconCounts[icon] || 0) + 1;
            });
            const dominantIcon = Object.entries(iconCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '01d';

            // Pick the most common description
            const descCounts = {};
            data.descriptions.forEach(d => { descCounts[d] = (descCounts[d] || 0) + 1; });
            const dominantDesc = Object.entries(descCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

            return {
                date,
                min: Math.round(Math.min(...data.temps)),
                max: Math.round(Math.max(...data.temps)),
                icon: dominantIcon,
                description: dominantDesc,
                pop: Math.round(Math.max(...data.pops) * 100), // max rain probability in %
            };
        });
}

export async function GET(request) {
    // Rate limiting
    const rateResult = checkRateLimit(request, 'general');
    if (!rateResult.allowed) {
        return NextResponse.json({ error: 'Rate limit exceeded', temp: null, icon: null }, { status: 429 });
    }

    if (!API_KEY) {
        return NextResponse.json(
            { error: 'Weather API not configured', temp: null, icon: null },
            { status: 200 }
        );
    }

    try {
        const { searchParams } = new URL(request.url);
        const lat = parseFloat(searchParams.get('lat'));
        const lon = parseFloat(searchParams.get('lon'));
        const isForecast = searchParams.get('forecast') === 'true';

        if (isNaN(lat) || isNaN(lon) ||
            lat < -90 || lat > 90 || lon < -180 || lon > 180) {
            return NextResponse.json({ error: 'Invalid coordinates' }, { status: 400 });
        }

        const key = cacheKey(lat, lon);

        // --- Forecast mode ---
        if (isForecast) {
            const fKey = `forecast:${key}`;
            const cached = forecastCache.get(fKey);

            if (cached && Date.now() - cached.fetchedAt < FORECAST_CACHE_TTL) {
                return NextResponse.json(cached.data);
            }

            const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&units=metric&lang=de&appid=${API_KEY}`;
            const res = await fetch(url, { signal: AbortSignal.timeout(8000) });

            if (!res.ok) {
                throw new Error(`OpenWeatherMap forecast responded ${res.status}`);
            }

            const raw = await res.json();
            const forecast = groupForecastByDay(raw.list || []);
            const data = { forecast };

            forecastCache.set(fKey, { data, fetchedAt: Date.now() });

            // Cleanup old forecast cache entries
            if (forecastCache.size > 100) {
                const now = Date.now();
                for (const [k, v] of forecastCache.entries()) {
                    if (now - v.fetchedAt > FORECAST_CACHE_TTL) forecastCache.delete(k);
                }
            }

            return NextResponse.json(data);
        }

        // --- Current weather mode ---
        const cached = weatherCache.get(key);

        if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
            return NextResponse.json(cached.data);
        }

        const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&lang=de&appid=${API_KEY}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(5000) });

        if (!res.ok) {
            throw new Error(`OpenWeatherMap responded ${res.status}`);
        }

        const raw = await res.json();

        const data = {
            temp: Math.round(raw.main.temp),
            icon: raw.weather?.[0]?.icon || '01d',
            description: raw.weather?.[0]?.description || '',
            city: raw.name || '',
        };

        weatherCache.set(key, { data, fetchedAt: Date.now() });

        // Cleanup old entries
        if (weatherCache.size > 200) {
            const now = Date.now();
            for (const [k, v] of weatherCache.entries()) {
                if (now - v.fetchedAt > CACHE_TTL) weatherCache.delete(k);
            }
        }

        return NextResponse.json(data);
    } catch (error) {
        console.error('Weather API error:', error.message);
        return NextResponse.json(
            { error: 'Weather data unavailable', temp: null, icon: null },
            { status: 200 }
        );
    }
}
