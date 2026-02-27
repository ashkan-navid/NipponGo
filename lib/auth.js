import { cookies } from 'next/headers';

const DB_MODULE = './db.js';

// Helper to get database module (server-side only)
async function getDb() {
    return require(DB_MODULE);
}

// Get current user from session token
export async function getCurrentUser() {
    const cookieStore = await cookies();
    const token = cookieStore.get('session_token')?.value;

    if (!token) {
        return null;
    }

    try {
        const db = await getDb();
        const session = db.getSession(token);

        if (!session) {
            return null;
        }

        return db.getUserById(session.user_id);
    } catch (error) {
        console.error('Error getting current user:', error);
        return null;
    }
}

// Validate request authentication
export async function requireAuth() {
    const user = await getCurrentUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    return user;
}

// Create response with session cookie
export function createSessionCookie(token) {
    return {
        name: 'session_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 30 * 24 * 60 * 60, // 30 days
        path: '/',
    };
}

// Clear session cookie
export function clearSessionCookie() {
    return {
        name: 'session_token',
        value: '',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 0,
        path: '/',
    };
}
