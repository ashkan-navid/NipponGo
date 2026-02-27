import { NextResponse } from 'next/server';

const { checkAuth } = require('../../../lib/withAuth.js');
const { checkRateLimit } = require('../../../lib/rateLimit.js');

// Nominatim (OpenStreetMap) geocoding - free, no API key required
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';

// Normalize Google Maps address formats for Nominatim compatibility
// Google Maps uses "X Chome-Y-Z" prefix for Japanese block addresses which Nominatim can't parse
function normalizeGoogleMapsAddress(address) {
    if (!address) return address;

    let normalized = address;

    // Convert "X Chome-Y-Z StreetName" to "StreetName X-Y-Z" (compact Japanese address format)
    // e.g. "1 Chome-9-7 Sennichimae" → "Sennichimae 1-9-7"
    // e.g. "1 Chome-1-7, Kasugacho" → "Kasugacho 1-1-7"
    const chomeMatch = normalized.match(/^(\d+)\s*Chome[-\s](\d+)[-\s](\d+)[,\s]+([^,]+)/i);
    if (chomeMatch) {
        const [, block, section, number, streetName] = chomeMatch;
        const compactAddr = `${streetName.trim()} ${block}-${section}-${number}`;
        // Replace the Chome prefix + street with the compact form
        normalized = normalized.replace(/^\d+\s*Chome[-\s]\d+[-\s]\d+[,\s]+[^,]+[,\s]*/i, compactAddr + ', ');
    }

    // Remove "Ward" suffix from district names (e.g. "Chuo Ward" → "Chuo")
    normalized = normalized.replace(/\bWard\b/gi, '').replace(/\s{2,}/g, ' ');

    // Remove "City" suffix (e.g. "Nerima City" → "Nerima")
    normalized = normalized.replace(/\bCity\b/gi, '').replace(/\s{2,}/g, ' ');

    // Remove "Prefecture" suffix
    normalized = normalized.replace(/\bPrefecture\b/gi, '').replace(/\s{2,}/g, ' ');

    // Clean up: remove leading/trailing commas and whitespace, collapse multiple commas
    normalized = normalized.replace(/^[\s,]+|[\s,]+$/g, '').replace(/,\s*,+/g, ',').replace(/\s{2,}/g, ' ');

    return normalized;
}

// Extract postal code from address if present (e.g. "542-0074")
function extractPostalCode(address) {
    const match = address.match(/\b(\d{3}-?\d{4})\b/);
    return match ? match[1] : null;
}

// Helper: query Nominatim search
async function nominatimSearch(query, options = {}) {
    const params = {
        q: query,
        format: 'json',
        addressdetails: '1',
        limit: String(options.limit || 1),
        ...(options.countrycodes ? { countrycodes: options.countrycodes } : {}),
        ...(options.country ? { country: options.country } : {}),
    };
    const response = await fetch(
        `${NOMINATIM_URL}/search?` + new URLSearchParams(params),
        {
            headers: {
                'User-Agent': 'JapanTravelCompanion/1.0',
                'Accept-Language': 'ja,de,en',
            },
        }
    );
    if (!response.ok) return [];
    return response.json();
}

// Geocode: Convert address to coordinates
export async function GET(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Rate limit geocode requests
        const rateLimit = checkRateLimit(request, 'geocode');
        if (!rateLimit.allowed) {
            return NextResponse.json(
                { error: 'Too many requests. Please wait.' },
                { status: 429, headers: { 'Retry-After': String(rateLimit.retryAfter || 60) } }
            );
        }

        const { searchParams } = new URL(request.url);
        const rawAddress = searchParams.get('address');
        const action = searchParams.get('action') || 'geocode';
        const entityName = searchParams.get('name') || '';

        if (action !== 'reverse' && action !== 'resolve-url' && !rawAddress) {
            return NextResponse.json({ error: 'Adresse ist erforderlich' }, { status: 400 });
        }

        // Handle resolve-url action: follow short-URL redirects and return final URL
        if (action === 'resolve-url') {
            const url = searchParams.get('url');
            if (!url) {
                return NextResponse.json({ error: 'URL ist erforderlich' }, { status: 400 });
            }
            try {
                // Follow redirects to get the final URL (with coordinates)
                const res = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'NipponGo/2.0' } });
                return NextResponse.json({ resolvedUrl: res.url });
            } catch (err) {
                return NextResponse.json({ error: 'URL konnte nicht aufgelöst werden', resolvedUrl: url }, { status: 502 });
            }
        }

        // Normalize Google Maps address format for Nominatim
        const address = rawAddress ? normalizeGoogleMapsAddress(rawAddress) : rawAddress;

        if (action === 'autocomplete') {
            // Autocomplete/search suggestions - try original address first
            let results = await nominatimSearch(rawAddress, { countrycodes: 'jp', limit: 5 });

            // Fallback: try normalized address if original yielded no results
            if (results.length === 0 && address !== rawAddress) {
                results = await nominatimSearch(address, { countrycodes: 'jp', limit: 5 });
            }

            // Format results for autocomplete
            const suggestions = results.map(result => ({
                display_name: result.display_name,
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                address: {
                    road: result.address?.road || '',
                    house_number: result.address?.house_number || '',
                    postcode: result.address?.postcode || '',
                    city: result.address?.city || result.address?.town || result.address?.village || '',
                    state: result.address?.state || result.address?.province || '',
                    country: result.address?.country || '',
                },
            }));

            return NextResponse.json({ suggestions });
        } else if (action === 'reverse') {
            const lat = searchParams.get('lat');
            const lon = searchParams.get('lon');

            if (!lat || !lon) {
                return NextResponse.json({ error: 'Koordinaten erforderlich' }, { status: 400 });
            }

            const response = await fetch(
                `${NOMINATIM_URL}/reverse?` + new URLSearchParams({
                    lat,
                    lon,
                    format: 'json',
                    addressdetails: '1',
                }),
                {
                    headers: {
                        'User-Agent': 'JapanTravelCompanion/1.0',
                        'Accept-Language': 'ja,de,en',
                    },
                }
            );

            if (!response.ok) {
                throw new Error('Reverse geocoding service unavailable');
            }

            const result = await response.json();

            return NextResponse.json({
                display_name: result.display_name,
                address: {
                    road: result.address?.road || '',
                    house_number: result.address?.house_number || '',
                    postcode: result.address?.postcode || '',
                    city: result.address?.city || result.address?.town || result.address?.village || '',
                    state: result.address?.state || result.address?.province || '',
                    country: result.address?.country || '',
                },
            });
        } else {
            // Standard geocoding - cascade with POI-first strategy:
            // 1. Try POI search by entity name (highest precision for named places)
            let results = [];
            if (entityName && entityName.length >= 3) {
                results = await nominatimSearch(`${entityName} Japan`, { countrycodes: 'jp' });
            }

            // 2. Try original address as-is
            if (results.length === 0) {
                results = await nominatimSearch(rawAddress, { countrycodes: 'jp' });
            }

            // 3. Try normalized address (fixes Google Maps Chome format etc.)
            if (results.length === 0 && address !== rawAddress) {
                results = await nominatimSearch(address, { countrycodes: 'jp' });
            }

            // 4. Try with postal code (very precise for Japanese addresses)
            if (results.length === 0) {
                const postalCode = extractPostalCode(rawAddress);
                if (postalCode) {
                    results = await nominatimSearch(`${postalCode} Japan`, { countrycodes: 'jp' });
                }
            }

            // 5. Try without countrycodes restriction
            if (results.length === 0) {
                results = await nominatimSearch(rawAddress, { country: 'Japan' });
            }

            if (results.length === 0) {
                return NextResponse.json({
                    error: 'Adresse nicht gefunden. Tipp: Verwende den englischen oder japanischen Ortsnamen, z.B. \'Senso-ji Tokyo\'.',
                    found: false
                }, { status: 404 });
            }

            const result = results[0];
            return NextResponse.json({
                found: true,
                lat: parseFloat(result.lat),
                lon: parseFloat(result.lon),
                display_name: result.display_name,
                address: {
                    road: result.address?.road || '',
                    house_number: result.address?.house_number || '',
                    postcode: result.address?.postcode || '',
                    city: result.address?.city || result.address?.town || result.address?.village || '',
                    state: result.address?.state || result.address?.province || '',
                    country: result.address?.country || '',
                },
            });
        }
    } catch (error) {
        console.error('Geocoding error:', error);
        return NextResponse.json(
            { error: 'Geocoding fehlgeschlagen' },
            { status: 500 }
        );
    }
}
