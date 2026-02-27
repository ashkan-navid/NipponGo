import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import db from '../../../lib/db';
import { getFlightStatus } from '../../../lib/aerodataboxClient';
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');
const { checkRateLimit } = require('../../../lib/rateLimit.js');

function parseFlightNumber(input) {
    const match = input.toUpperCase().replace(/\s+/g, '').match(/^([A-Z0-9]{2})(\d{1,4})$/);
    if (match) {
        return { carrierCode: match[1], flightNumber: match[2] };
    }
    return null;
}

// Maps AeroDataBox flight data to our DB schema
// userDate: the known correct departure date (YYYY-MM-DD) — used to fix
// AeroDataBox date offsets that can occur for far-future flights
function mapAeroDataBoxToFlightData(flightData, inputType = 'outbound', userDate = null) {
    if (!flightData || !flightData.departure || !flightData.arrival) return null;

    let durationStr = '';
    const depUtcStr = flightData.departure.scheduledTime?.utc || flightData.departure.revisedTime?.utc;
    const arrUtcStr = flightData.arrival.scheduledTime?.utc || flightData.arrival.revisedTime?.utc || flightData.arrival.predictedTime?.utc;
    if (depUtcStr && arrUtcStr) {
        const depUtc = new Date(depUtcStr.replace(' ', 'T'));
        const arrUtc = new Date(arrUtcStr.replace(' ', 'T'));
        if (!isNaN(depUtc) && !isNaN(arrUtc)) {
            const diffMs = arrUtc.getTime() - depUtc.getTime();
            if (diffMs > 0) {
                const diffMins = Math.floor(diffMs / 60000);
                const h = Math.floor(diffMins / 60);
                const m = diffMins % 60;
                durationStr = `PT${h}H${m}M`;
            }
        }
    }

    let departureTime = flightData.departure.scheduledTime?.local || flightData.departure.scheduledTime?.utc || '';
    let arrivalTime = flightData.arrival.scheduledTime?.local || flightData.arrival.scheduledTime?.utc || '';

    // Fix date portions using the authoritative user-provided date
    // AeroDataBox can return dates offset by 1 day for future flights
    if (userDate && departureTime && arrivalTime) {
        // Extract the date parts from AeroDataBox's local times
        const apiDepDate = departureTime.replace(' ', 'T').split('T')[0];
        const apiArrDate = arrivalTime.replace(' ', 'T').split('T')[0];

        if (apiDepDate && apiArrDate) {
            // Compute day offset between departure and arrival (e.g., 0 = same day, 1 = next day)
            // This offset is consistent even if both API dates are wrong by the same amount
            const depD = new Date(apiDepDate + 'T12:00:00Z');
            const arrD = new Date(apiArrDate + 'T12:00:00Z');
            const dayOffset = Math.round((arrD.getTime() - depD.getTime()) / 86400000);

            // Fix departure: replace API date with user-provided date
            departureTime = departureTime.replace(/^\d{4}-\d{2}-\d{2}/, userDate);

            // Fix arrival: user date + day offset
            const userD = new Date(userDate + 'T12:00:00Z');
            userD.setUTCDate(userD.getUTCDate() + dayOffset);
            const correctedArrDate = userD.toISOString().split('T')[0];
            arrivalTime = arrivalTime.replace(/^\d{4}-\d{2}-\d{2}/, correctedArrDate);
        }
    }

    return {
        flight_number: flightData.number?.replace(/\s+/g, '') || '',
        departure_iata: flightData.departure.airport?.iata || '',
        arrival_iata: flightData.arrival.airport?.iata || '',
        departure_time: departureTime,
        arrival_time: arrivalTime,
        airline: flightData.airline?.name || flightData.airline?.iata || '',
        aircraft: flightData.aircraft?.model || '',
        terminal_out: flightData.departure.terminal || '',
        gate_out: flightData.departure.gate || '',
        terminal_in: flightData.arrival.terminal || '',
        gate_in: flightData.arrival.gate || '',
        duration: durationStr,
        scheduled_status: flightData.status || 'Scheduled',
        type: inputType,
        last_synced_at: Math.floor(Date.now() / 1000)
    };
}

// Determine if a flight needs syncing based on intervals
function needsSync(flight) {
    if (!flight.departure_time) return false;

    const now = Date.now();
    const departureMs = new Date(flight.departure_time).getTime();
    const lastSyncMs = (flight.last_synced_at || 0) * 1000;

    const msUntilDeparture = departureMs - now;
    const msSinceSync = now - lastSyncMs;

    const ONE_HOUR = 60 * 60 * 1000;
    const ONE_DAY = 24 * ONE_HOUR;
    const ONE_WEEK = 7 * ONE_DAY;
    const ONE_MONTH = 30 * ONE_DAY;

    if (msUntilDeparture < 0) {
        // Flight has departed. No need to sync anymore unless it's within the last 24h just to track arrival delays
        return msUntilDeparture > -ONE_DAY && msSinceSync > ONE_HOUR;
    }

    if (msUntilDeparture <= ONE_DAY) {
        // departure day -> hourly sync
        return msSinceSync > ONE_HOUR;
    } else if (msUntilDeparture <= ONE_WEEK) {
        // 1 week to 1 day -> daily sync
        return msSinceSync > ONE_DAY;
    } else if (msUntilDeparture <= ONE_MONTH) {
        // 1 month to 1 week -> weekly sync
        return msSinceSync > ONE_WEEK;
    }

    // over a month -> monthly or manual sync (for now we cap at 30 days)
    return msSinceSync > ONE_MONTH;
}

export async function GET(request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
        const session = db.getSession(token);
        if (!session) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

        let flights = db.getFlights(session.user_id);

        let didSync = false;

        // Lazy Sync Loop
        for (const flight of flights) {
            if (needsSync(flight)) {
                const parsed = parseFlightNumber(flight.flight_number);
                if (parsed) {
                    try {
                        const dateOnly = flight.departure_time.replace(' ', 'T').split('T')[0];
                        const aerodataboxData = await getFlightStatus(flight.flight_number, dateOnly);

                        if (aerodataboxData) {
                            const updatedData = mapAeroDataBoxToFlightData(aerodataboxData, flight.type, dateOnly);
                            // Preserve manual fields if needed, but here we overwrite the API ones
                            if (updatedData) {
                                db.updateFlight(flight.id, updatedData, session.user_id);
                                didSync = true;
                            }
                        } else {
                            // Update last_synced_at so we don't spam 404s
                            db.updateFlight(flight.id, { last_synced_at: Math.floor(Date.now() / 1000) }, session.user_id);
                        }
                    } catch (err) {
                        console.error(`Sync failed for flight ${flight.flight_number}:`, err);
                    }
                }
            }
        }

        // Refetch if we synced
        if (didSync) {
            flights = db.getFlights(session.user_id);
        }

        return NextResponse.json({ flights });
    } catch (error) {
        console.error('Fetch Flights Error:', error);
        return NextResponse.json({ error: 'Fehler beim Laden' }, { status: 500 });
    }
}

export async function POST(request) {
    try {
        // Rate limiting
        const rateResult = checkRateLimit(request, 'flights');
        if (!rateResult.allowed) {
            return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 });
        }

        // CSRF protection
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
        const session = db.getSession(token);
        if (!session) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
        const user = db.getUserById(session.user_id);

        const body = await request.json();
        const { flight_number, date, type } = body;

        if (!flight_number || !date) {
            return NextResponse.json({ error: 'Flugnummer und Datum erforderlich' }, { status: 400 });
        }

        const parsed = parseFlightNumber(flight_number);
        if (!parsed) {
            return NextResponse.json({ error: 'Ungültiges Flugnummernformat. Bsp: LH714' }, { status: 400 });
        }

        // Call AeroDataBox
        const aerodataboxData = await getFlightStatus(flight_number, date);
        if (!aerodataboxData) {
            return NextResponse.json({ error: 'Flug im AeroDataBox Flugplan für dieses Datum nicht gefunden' }, { status: 404 });
        }

        const flightData = mapAeroDataBoxToFlightData(aerodataboxData, type, date);
        if (!flightData) {
            return NextResponse.json({ error: 'Konvertierungsfehler von AeroDataBox Daten' }, { status: 500 });
        }

        const newFlight = db.createFlight(session.user_id, flightData, user.username);
        return NextResponse.json(newFlight, { status: 201 });
    } catch (error) {
        console.error('Create Flight Error:', error);
        return NextResponse.json({ error: 'Fehler beim Anlegen' }, { status: 500 });
    }
}

export async function DELETE(request) {
    try {
        // Rate limiting
        const rateResult = checkRateLimit(request, 'flights');
        if (!rateResult.allowed) {
            return NextResponse.json({ error: 'Zu viele Anfragen. Bitte warte einen Moment.' }, { status: 429 });
        }

        // CSRF protection
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (!token) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
        const session = db.getSession(token);
        if (!session) return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });

        const url = new URL(request.url);
        const id = url.searchParams.get('id');

        if (!id) return NextResponse.json({ error: 'ID is required' }, { status: 400 });

        db.deleteFlight(parseInt(id), session.user_id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete Flight Error:', error);
        return NextResponse.json({ error: 'Fehler beim Löschen' }, { status: 500 });
    }
}
