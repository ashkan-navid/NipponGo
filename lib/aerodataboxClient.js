import NodeCache from 'node-cache';

// Cache with 4 hours TTL (14400 seconds)
export const cache = new NodeCache({ stdTTL: 14400, checkperiod: 600 });
const BASE_URL = 'https://prod.api.market/api/v1/aedbx/aerodatabox';

// Queue setup
export let lastRequestTime = 0;
export const MIN_INTERVAL = 1100; // 1.1 request per second to ensure safety
export let queuePromise = Promise.resolve();

export function resetQueueForTest() {
    lastRequestTime = 0;
    queuePromise = Promise.resolve();
}

async function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Wrapper to ensure max 1 req/sec
async function enqueueRequest(url, options) {
    queuePromise = queuePromise.then(async () => {
        const now = Date.now();
        const timeSinceLastReq = now - lastRequestTime;
        if (timeSinceLastReq < MIN_INTERVAL) {
            await delay(MIN_INTERVAL - timeSinceLastReq);
        }
        lastRequestTime = Date.now();

        try {
            return await fetch(url, options);
        } catch (error) {
            throw error;
        }
    });
    return queuePromise;
}

/**
 * Fetches flight status from AeroDataBox API.
 * @param {string} flightNumber - E.g., 'LH714'
 * @param {string} date - E.g., '2026-02-23'
 * @returns {object|null} - The flight data or null if not found
 */
export async function getFlightStatus(flightNumber, date) {
    const API_KEY = process.env.AERODATABOX_API_MARKET_KEY;
    if (!API_KEY) {
        console.warn('AERODATABOX_API_MARKET_KEY is not configured');
        throw new Error('AeroDataBox API credentials not configured');
    }

    const cleanFlightNumber = flightNumber.replace(/\s+/g, '').toUpperCase();
    const cacheKey = `${cleanFlightNumber}_${date}`;

    const cachedData = cache.get(cacheKey);
    if (cachedData !== undefined) {
        console.log(`[AeroDataBox] Cache HIT for ${cacheKey}`);
        return cachedData;
    }

    console.log(`[AeroDataBox] Cache MISS for ${cacheKey}. Queuing request...`);

    const url = `${BASE_URL}/flights/number/${cleanFlightNumber}/${date}`;

    try {
        const response = await enqueueRequest(url, {
            method: 'GET',
            headers: {
                'x-api-market-key': API_KEY,
                'Accept': 'application/json'
            }
        });

        if (response.status === 404 || response.status === 204) {
            // Flight not found in schedule
            cache.set(cacheKey, null);
            return null;
        }

        if (!response.ok) {
            const errBody = await response.text().catch(() => 'No Body');
            console.error(`[AeroDataBox] API Error: ${response.status}. MASKED Error Body.`);
            throw new Error(`AeroDataBox API Error: ${response.status}`);
        }

        const data = await response.json();

        // Data usually comes as an array of flights for that day
        if (Array.isArray(data) && data.length > 0) {
            cache.set(cacheKey, data[0]);
            return data[0];
        } else if (!Array.isArray(data)) {
            cache.set(cacheKey, data);
            return data;
        }

        cache.set(cacheKey, null);
        return null;
    } catch (error) {
        console.error('[AeroDataBox] Error fetching flight status (MASKED)');
        throw error;
    }
}
