import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');
const { sanitizeActivityInput } = require('../../../lib/sanitize.js');
import { z } from 'zod';

const ActivitySchema = z.object({
    title: z.string().min(1, "Title is required").max(100, "Title too long"),
    description: z.string().max(2000).optional().nullable(),
    type: z.string().max(50).optional().nullable(),
    latitude: z.union([z.number(), z.string()]).optional().nullable(),
    lat: z.union([z.number(), z.string()]).optional().nullable(),
    longitude: z.union([z.number(), z.string()]).optional().nullable(),
    lon: z.union([z.number(), z.string()]).optional().nullable(),
    planned_date: z.string().max(100).optional().nullable(),
    planned_time: z.string().max(10).optional().nullable(),
});

const ActivityUpdateSchema = ActivitySchema.extend({
    id: z.number().int().positive("Activity ID is required"),
    completed: z.boolean().optional().nullable(),
});

// Calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;

    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// GET - Get all activities (shared between all users, optionally sorted by proximity)
export async function GET(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const userLat = parseFloat(searchParams.get('lat'));
        const userLon = parseFloat(searchParams.get('lon'));

        // Get scoped activities
        let activities = db.getActivities(user.id);

        // If user location is provided, calculate distance and sort by proximity
        if (!isNaN(userLat) && !isNaN(userLon)) {
            activities = activities.map(activity => ({
                ...activity,
                distance: calculateDistance(
                    userLat,
                    userLon,
                    activity.latitude || activity.lat,
                    activity.longitude || activity.lon
                ),
            })).sort((a, b) => {
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
        }

        return NextResponse.json({ activities });
    } catch (error) {
        console.error('Get activities error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create activity
export async function POST(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // CSRF check for state-changing request
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const bodyContent = await request.json();
        const parsed = ActivitySchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const data = parsed.data;

        const activity = db.createActivity(user.id, {
            title: data.title,
            description: data.description || '',
            type: data.type || 'other',
            latitude: data.latitude || data.lat || null,
            longitude: data.longitude || data.lon || null,
            planned_date: data.planned_date || null,
            planned_time: data.planned_time || null,
        }, user.username);

        return NextResponse.json({ activity });
    } catch (error) {
        console.error('Create activity error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update activity (only owner or shared users can update)
export async function PUT(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // CSRF check for state-changing request
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const bodyContent = await request.json();
        const parsed = ActivityUpdateSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const data = parsed.data;

        try {
            const activity = db.updateActivity(data.id, {
                title: data.title,
                description: data.description,
                type: data.type,
                latitude: data.latitude || data.lat,
                longitude: data.longitude || data.lon,
                planned_date: data.planned_date,
                planned_time: data.planned_time,
                completed: data.completed,
            }, user.id);

            if (!activity) {
                return NextResponse.json({ error: 'Activity not found' }, { status: 404 });
            }

            return NextResponse.json({ activity });
        } catch (authError) {
            return NextResponse.json({ error: authError.message }, { status: 403 });
        }
    } catch (error) {
        console.error('Update activity error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete activity (only owner or shared users can delete)
export async function DELETE(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // CSRF check for state-changing request
        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 });
        }

        try {
            db.deleteActivity(parseInt(id), user.id);
            return NextResponse.json({ success: true });
        } catch (authError) {
            return NextResponse.json({ error: authError.message }, { status: 403 });
        }
    } catch (error) {
        console.error('Delete activity error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
