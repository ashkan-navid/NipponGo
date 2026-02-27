import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');
const { sanitizeHotelInput, sanitizeString } = require('../../../lib/sanitize.js');
const { checkRateLimit } = require('../../../lib/rateLimit.js');
import { z } from 'zod';

const HotelSchema = z.object({
    name: z.string().min(1, "Hotel name is required").max(100, "Hotel name too long"),
    address: z.string().max(255).optional().nullable(),
    check_in_date: z.string().max(100).optional().nullable(),
    check_out_date: z.string().max(100).optional().nullable(),
    check_in_time: z.string().max(10).optional().nullable(),
    check_out_time: z.string().max(10).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    rating: z.number().min(0).max(5).optional().nullable(),
    latitude: z.union([z.number(), z.string()]).optional().nullable(),
    lat: z.union([z.number(), z.string()]).optional().nullable(),
    longitude: z.union([z.number(), z.string()]).optional().nullable(),
    lon: z.union([z.number(), z.string()]).optional().nullable(),
});

const HotelUpdateSchema = HotelSchema.extend({
    id: z.number().int().positive("Hotel ID is required"),
});

// GET - Get hotels (scoped to user + shared)
export async function GET() {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Get scoped hotels
        const hotels = db.getHotels(user.id);

        // Categorize hotels by date
        const now = new Date();
        const today = now.toISOString().split('T')[0];

        const categorized = {
            past: [],
            current: [],
            future: [],
        };

        hotels.forEach(hotel => {
            const checkOut = hotel.check_out_date || hotel.check_out;
            const checkIn = hotel.check_in_date || hotel.check_in;

            if (checkOut < today) {
                categorized.past.push(hotel);
            } else if (checkIn <= today && checkOut >= today) {
                categorized.current.push(hotel);
            } else {
                categorized.future.push(hotel);
            }
        });

        return NextResponse.json({ hotels: categorized, all: hotels });
    } catch (error) {
        console.error('Get hotels error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST - Create hotel
export async function POST(request) {
    try {
        // SECURITY: Rate-limit CRUD mutations (CWE-770)
        const rateResult = checkRateLimit(request, 'general');
        if (!rateResult.allowed) {
            return NextResponse.json({ error: 'Zu viele Anfragen' }, { status: 429 });
        }

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
        const parsed = HotelSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const sanitized = sanitizeHotelInput(parsed.data);

        const hotel = db.createHotel(user.id, sanitized, user.username);

        return NextResponse.json({ hotel });
    } catch (error) {
        console.error('Create hotel error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Update hotel
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
        const parsed = HotelUpdateSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const sanitized = sanitizeHotelInput(parsed.data);

        const hotel = db.updateHotel(parsed.data.id, sanitized, user.id);

        return NextResponse.json({ hotel });
    } catch (error) {
        console.error('Update hotel error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Delete hotel
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
            return NextResponse.json({ error: 'Hotel ID is required' }, { status: 400 });
        }

        try {
            db.deleteHotel(parseInt(id), user.id);
            return NextResponse.json({ success: true });
        } catch (authError) {
            return NextResponse.json({ error: authError.message }, { status: 403 });
        }
    } catch (error) {
        console.error('Delete hotel error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
