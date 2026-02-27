import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth, checkCSRF } = require('../../../lib/withAuth.js');

// GET - Get VAPID public key and user's push subscription status
export async function GET() {
    try {
        const user = await checkAuth();
        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
        if (!vapidPublicKey) {
            return NextResponse.json({ error: 'Push nicht konfiguriert' }, { status: 503 });
        }

        const subscriptions = db.getPushSubscriptions(user.id);
        return NextResponse.json({
            vapidPublicKey,
            hasSubscription: subscriptions.length > 0,
        });
    } catch (error) {
        console.error('Get webpush info error:', error);
        return NextResponse.json({ error: 'Interner Serverfehler' }, { status: 500 });
    }
}

// POST - Save a new push subscription
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

        const body = await request.json();
        const { subscription } = body;

        if (!subscription?.endpoint || !subscription?.keys?.auth || !subscription?.keys?.p256dh) {
            return NextResponse.json({ error: 'Ungültiges Abonnement' }, { status: 400 });
        }

        // Validate endpoint is HTTPS URL
        try {
            const url = new URL(subscription.endpoint);
            if (url.protocol !== 'https:') {
                return NextResponse.json({ error: 'Push-Endpoint muss HTTPS nutzen' }, { status: 400 });
            }
        } catch {
            return NextResponse.json({ error: 'Ungültige Endpoint-URL' }, { status: 400 });
        }

        // Validate key lengths (base64-encoded: auth ~22-24 chars, p256dh ~86-90 chars)
        if (subscription.keys.auth.length < 16 || subscription.keys.auth.length > 100) {
            return NextResponse.json({ error: 'Ungültige Auth-Schlüssel-Länge' }, { status: 400 });
        }
        if (subscription.keys.p256dh.length < 80 || subscription.keys.p256dh.length > 200) {
            return NextResponse.json({ error: 'Ungültige P256dh-Schlüssel-Länge' }, { status: 400 });
        }

        db.savePushSubscription(user.id, subscription);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Save push subscription error:', error);
        return NextResponse.json({ error: error.message || 'Interner Serverfehler' }, { status: 500 });
    }
}

// DELETE - Remove a push subscription
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
        const endpoint = searchParams.get('endpoint');

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint erforderlich' }, { status: 400 });
        }

        // SECURITY: Pass user.id to ensure users can only delete their own subscriptions
        db.deletePushSubscription(decodeURIComponent(endpoint), user.id);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Delete push subscription error:', error);
        return NextResponse.json({ error: error.message || 'Interner Serverfehler' }, { status: 500 });
    }
}
