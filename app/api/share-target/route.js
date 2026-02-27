import { NextResponse } from 'next/server';

const db = require('../../../lib/db.js');
const { checkAuth } = require('../../../lib/withAuth.js');

// POST - Receive shared content from OS share target
export async function POST(request) {
    try {
        // Auth is optional - shared content may arrive before login
        let user = null;
        try {
            user = await checkAuth();
        } catch (e) {
            // Not authenticated, that's okay for share target
        }

        const contentType = request.headers.get('content-type') || '';

        // Handle multipart/form-data (file shares)
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file');
            const title = formData.get('title') || '';
            const text = formData.get('text') || '';
            const url = formData.get('url') || '';

            // If a JSON file was shared, redirect to import flow
            if (file && file.name?.endsWith('.json')) {
                const fileText = await file.text();
                try {
                    const data = JSON.parse(fileText);
                    // If user is authenticated, redirect to app with import indicator
                    if (user && (data.hotels || data.activities)) {
                        // Store data temporarily in session or redirect with indicator
                        return NextResponse.redirect(new URL('/?import=shared', request.url));
                    }
                } catch (e) {
                    // Not valid JSON
                    console.error('Share target JSON parse error:', e);
                }
            }

            // For text/URL shares, redirect to app with data
            const params = new URLSearchParams();
            if (title) params.set('shared_title', title);
            if (text) params.set('shared_text', text);
            if (url) params.set('shared_url', url);

            if (params.toString()) {
                return NextResponse.redirect(new URL(`/?${params.toString()}`, request.url));
            }
        }

        // Fallback: redirect to app root
        return NextResponse.redirect(new URL('/', request.url));
    } catch (error) {
        console.error('Share target error:', error);
        return NextResponse.redirect(new URL('/', request.url));
    }
}
