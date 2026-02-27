import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');
const { sanitizeString } = require('../../../lib/sanitize.js');
const { checkRateLimit } = require('../../../lib/rateLimit.js');

// GET - Get all packing items for user (optionally synced with friends)
export async function GET(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const sync = searchParams.get('sync') === 'true';

        const items = db.getPackingItems(user.id);

        if (sync) {
            const friendIds = db.getSharedUserIds(user.id);
            const friendItems = friendIds.length > 0 ? db.getPackingItemsForUsers(friendIds) : [];
            return NextResponse.json({ items, friendItems });
        }

        return NextResponse.json({ items });
    } catch (error) {
        console.error('Get packing items error:', error);
        return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
}

// POST - Toggle item, add custom item, or reset all checks
export async function POST(request) {
    try {
        // SECURITY: Rate-limit packing mutations (CWE-770)
        const rateResult = checkRateLimit(request, 'general');
        if (!rateResult.allowed) {
            return NextResponse.json({ error: 'Zu viele Anfragen' }, { status: 429 });
        }

        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const body = await request.json();
        const { action } = body;

        if (action === 'toggle') {
            const { category, itemText } = body;
            if (!category || !itemText) {
                return NextResponse.json({ error: 'Kategorie und Text erforderlich' }, { status: 400 });
            }
            // Validate category (prevent DB pollution)
            const validCategories = ['documents', 'clothing', 'electronics', 'hygiene', 'medical', 'misc'];
            if (!validCategories.includes(category)) {
                return NextResponse.json({ error: 'Ungültige Kategorie' }, { status: 400 });
            }
            const item = db.togglePackingItem(user.id, category, itemText);
            return NextResponse.json({ item });
        }

        if (action === 'add') {
            const { category, itemText } = body;
            if (!category || !itemText) {
                return NextResponse.json({ error: 'Kategorie und Text erforderlich' }, { status: 400 });
            }
            // Validate category
            const validCategories = ['documents', 'clothing', 'electronics', 'hygiene', 'medical', 'misc'];
            if (!validCategories.includes(category)) {
                return NextResponse.json({ error: 'Ungültige Kategorie' }, { status: 400 });
            }
            const sanitized = sanitizeString(itemText, 200);
            const item = db.addCustomPackingItem(user.id, category, sanitized);
            return NextResponse.json({ item });
        }

        if (action === 'reset') {
            db.resetPackingChecks(user.id);
            return NextResponse.json({ success: true });
        }

        return NextResponse.json({ error: 'Ungültige Aktion' }, { status: 400 });
    } catch (error) {
        console.error('Packing item action error:', error);
        return NextResponse.json({ error: error.message || 'Interner Serverfehler' }, { status: 500 });
    }
}

// DELETE - Delete custom item
export async function DELETE(request) {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const csrfResult = await checkCSRF(request);
        if (!csrfResult.valid) {
            return NextResponse.json({ error: csrfResult.error }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const id = searchParams.get('id');

        if (!id) {
            return NextResponse.json({ error: 'Item-ID erforderlich' }, { status: 400 });
        }

        db.deletePackingItem(parseInt(id), user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete packing item error:', error);
        return NextResponse.json({ error: error.message || 'Interner Serverfehler' }, { status: 500 });
    }
}
