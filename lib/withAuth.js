'use strict';

/**
 * Central Auth + CSRF middleware for API routes
 * Consolidates duplicated checkAuth() logic and adds CSRF protection.
 *
 * On every successful auth check, a fresh CSRF cookie is (re-)issued so
 * that mutating requests always have a valid token — even after a
 * server restart which regenerates the HMAC secret.
 */

const { cookies } = require('next/headers');

let db;
try {
    db = require('./db.js');
} catch (e) {
    console.error('Database not available:', e.message);
}

const { validateCSRFToken, generateCSRFToken } = require('./csrf.js');

/**
 * Check authentication from session cookie.
 * On success, also refreshes the csrf_token cookie so that the next
 * mutating request has a valid CSRF token.
 *
 * @returns {Object|null} User object or null if not authenticated
 */
async function checkAuth() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token || !db) return null;

    const session = db.getSession(token);
    if (!session) return null;

    const user = db.getUserById(session.user_id);
    if (!user) return null;

    // Always refresh the CSRF cookie so it stays in sync with the current
    // HMAC secret.  This is cheap (one HMAC computation) and ensures the
    // client always has a usable token for the next POST/PUT/DELETE.
    try {
        const freshCsrf = generateCSRFToken(token);
        cookieStore.set('csrf_token', freshCsrf, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60, // 30 days — match session
            path: '/',
        });
    } catch {
        // cookies().set can throw in certain Next.js contexts (after
        // headers are already sent); silently ignore — the token will
        // be refreshed on the next request.
    }

    return user;
}

/**
 * Check CSRF token for state-changing requests (POST, PUT, DELETE).
 *
 * @param {Request} request - The incoming request
 * @returns {{ valid: boolean, error?: string }}
 */
async function checkCSRF(request) {
    const method = request.method?.toUpperCase();

    // Skip CSRF check for safe methods
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
        return { valid: true };
    }

    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('session_token')?.value;
    const csrfFromHeader = request.headers.get?.('x-csrf-token') ||
        request.headers?.['x-csrf-token'];

    if (!csrfFromHeader) {
        return { valid: false, error: 'CSRF token missing' };
    }

    if (!sessionToken) {
        return { valid: false, error: 'Session token missing' };
    }

    const isValid = validateCSRFToken(sessionToken, csrfFromHeader);

    if (!isValid) {
        return { valid: false, error: 'Invalid CSRF token' };
    }

    return { valid: true };
}

module.exports = {
    checkAuth,
    checkCSRF,
};
