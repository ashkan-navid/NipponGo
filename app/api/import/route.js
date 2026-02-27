import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');
const { sanitizeHotelInput, sanitizeActivityInput } = require('../../../lib/sanitize.js');

export async function POST(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const data = await request.json();

        if (!data || typeof data !== 'object') {
            return NextResponse.json({ error: 'Ungültiges Import-Format' }, { status: 400 });
        }

        const importHotels = Array.isArray(data.hotels) ? data.hotels : [];
        const importActivities = Array.isArray(data.activities) ? data.activities : [];

        if (importHotels.length === 0 && importActivities.length === 0) {
            return NextResponse.json({ error: 'Keine Daten zum Importieren gefunden' }, { status: 400 });
        }

        // Prevent DoS via large arrays
        const MAX_IMPORT_ITEMS = 500;
        if (importHotels.length > MAX_IMPORT_ITEMS || importActivities.length > MAX_IMPORT_ITEMS) {
            return NextResponse.json({ error: `Maximal ${MAX_IMPORT_ITEMS} Items pro Typ erlaubt` }, { status: 413 });
        }

        // Get existing data for duplicate detection
        const existingHotels = db.getHotels(user.id) || [];
        const existingActivities = db.getActivities(user.id) || [];

        let hotelsImported = 0;
        let hotelsSkipped = 0;
        let activitiesImported = 0;
        let activitiesSkipped = 0;

        // Import hotels
        for (const hotel of importHotels) {
            if (!hotel.name || typeof hotel.name !== 'string') continue;

            // Duplicate detection: same name + (same check-in date OR same address OR same coordinates)
            const isDuplicate = existingHotels.some(h => {
                if (h.name !== hotel.name) return false;
                // Check date match
                if (h.check_in_date && hotel.check_in_date && h.check_in_date === hotel.check_in_date) return true;
                // Check address match (if both have address)
                if (h.address && hotel.address && h.address.toLowerCase() === hotel.address.toLowerCase()) return true;
                // Check coordinate match (within ~0.001 degrees = ~100m)
                const lat1 = h.latitude || h.lat;
                const lon1 = h.longitude || h.lon;
                const lat2 = hotel.latitude || hotel.lat;
                const lon2 = hotel.longitude || hotel.lon;
                if (lat1 && lon1 && lat2 && lon2) {
                    const latMatch = Math.abs(lat1 - lat2) < 0.001;
                    const lonMatch = Math.abs(lon1 - lon2) < 0.001;
                    if (latMatch && lonMatch) return true;
                }
                return false;
            });

            if (isDuplicate) {
                hotelsSkipped++;
                continue;
            }

            try {
                const sanitized = sanitizeHotelInput({
                    name: hotel.name,
                    address: hotel.address || null,
                    check_in_date: hotel.check_in_date || null,
                    check_out_date: hotel.check_out_date || null,
                    notes: hotel.notes || null,
                    rating: hotel.rating || null,
                    latitude: hotel.latitude || hotel.lat || null,
                    longitude: hotel.longitude || hotel.lon || null,
                });
                db.createHotel(user.id, sanitized, user.username);
                hotelsImported++;
            } catch (e) {
                console.error('Hotel import error:', e);
            }
        }

        // Import activities
        for (const activity of importActivities) {
            if (!activity.title || typeof activity.title !== 'string') continue;

            // Duplicate detection: same title + (same planned date OR same coordinates)
            const isDuplicate = existingActivities.some(a => {
                if (a.title !== activity.title) return false;
                // Check date match
                if (a.planned_date && activity.planned_date && a.planned_date === activity.planned_date) return true;
                // Check coordinate match (within ~0.001 degrees = ~100m)
                const lat1 = a.latitude || a.lat;
                const lon1 = a.longitude || a.lon;
                const lat2 = activity.latitude || activity.lat;
                const lon2 = activity.longitude || activity.lon;
                if (lat1 && lon1 && lat2 && lon2) {
                    const latMatch = Math.abs(lat1 - lat2) < 0.001;
                    const lonMatch = Math.abs(lon1 - lon2) < 0.001;
                    if (latMatch && lonMatch) return true;
                }
                return false;
            });

            if (isDuplicate) {
                activitiesSkipped++;
                continue;
            }

            try {
                const sanitized = sanitizeActivityInput({
                    title: activity.title,
                    description: activity.description || null,
                    type: activity.type || 'other',
                    planned_date: activity.planned_date || null,
                    planned_time: activity.planned_time || null,
                    completed: activity.completed ? 1 : 0,
                    latitude: activity.latitude || activity.lat || null,
                    longitude: activity.longitude || activity.lon || null,
                });
                db.createActivity(user.id, sanitized, user.username);
                activitiesImported++;
            } catch (e) {
                console.error('Activity import error:', e);
            }
        }

        return NextResponse.json({
            success: true,
            hotelsImported,
            hotelsSkipped,
            activitiesImported,
            activitiesSkipped,
        });
    } catch (error) {
        console.error('Import error:', error);
        return NextResponse.json({ error: 'Import fehlgeschlagen' }, { status: 500 });
    }
}
