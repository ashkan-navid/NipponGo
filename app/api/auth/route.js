import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Import database functions
const db = require('../../../lib/db.js');
const { checkRateLimit, resetRateLimit } = require('../../../lib/rateLimit.js');
const { generateCSRFToken, storeCSRFToken, removeCSRFToken } = require('../../../lib/csrf.js');
const { sendWelcomeEmail } = require('../../../lib/mailer.js');
import { z } from 'zod';

const AuthSchema = z.object({
    username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen lang sein").max(50, "Benutzername zu lang"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein")
});

const RegisterSchema = z.object({
    username: z.string().min(3, "Benutzername muss mindestens 3 Zeichen lang sein").max(50, "Benutzername zu lang"),
    password: z.string().min(8, "Passwort muss mindestens 8 Zeichen lang sein"),
    email: z.string().min(1, "E-Mail-Adresse erforderlich")
});

// Password complexity validation
function validatePasswordComplexity(password) {
    const errors = [];

    if (password.length < 8) {
        errors.push('Passwort muss mindestens 8 Zeichen lang sein');
    }
    if (!/[a-z]/.test(password)) {
        errors.push('Passwort muss mindestens einen Kleinbuchstaben enthalten');
    }
    if (!/[A-Z]/.test(password)) {
        errors.push('Passwort muss mindestens einen Großbuchstaben enthalten');
    }
    if (!/[0-9]/.test(password)) {
        errors.push('Passwort muss mindestens eine Zahl enthalten');
    }

    return {
        valid: errors.length === 0,
        errors,
    };
}

// POST - Login
export async function POST(request) {
    try {
        // Check rate limit
        const rateLimitResult = checkRateLimit(request, 'auth');
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: rateLimitResult.blocked
                        ? `Zu viele Versuche. Bitte warte ${Math.ceil(rateLimitResult.retryAfter / 60)} Minuten.`
                        : 'Rate limit exceeded',
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimitResult.retryAfter),
                        'X-RateLimit-Remaining': '0',
                        'X-RateLimit-Reset': String(rateLimitResult.resetTime),
                    },
                }
            );
        }


        const bodyContent = await request.json();
        const parsed = AuthSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { password } = parsed.data;
        const username = parsed.data.username.trim().toLowerCase();

        const user = db.getUserByUsername(username);

        if (!user) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        const isValid = db.verifyPassword(password, user.password_hash);

        if (!isValid) {
            return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
        }

        // Transparently upgrade bcrypt hash if using fewer rounds than current target
        if (db.needsHashUpgrade(user.password_hash)) {
            try {
                db.upgradePasswordHash(user.id, password);
            } catch (e) {
                console.error('Hash upgrade failed (non-critical):', e);
            }
        }

        // Reset rate limit on successful login
        resetRateLimit(request, 'auth');

        // Invalidate all existing sessions (prevent session fixation)
        db.deleteUserSessions(user.id);

        // Create session - returns { token, expiresAt }
        const session = db.createSession(user.id);

        // Generate CSRF token and store it
        const csrfToken = generateCSRFToken(session.token);
        storeCSRFToken(session.token, csrfToken); // no-op with HMAC approach, kept for compat

        // Set cookies
        const cookieStore = await cookies();
        cookieStore.set('session_token', session.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict', // Changed from 'lax' to 'strict' for better security
            maxAge: 30 * 24 * 60 * 60, // 30 days
            path: '/',
        });

        // Set CSRF token as a non-httpOnly cookie (client needs to read it)
        cookieStore.set('csrf_token', csrfToken, {
            httpOnly: false, // Client needs to read this
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60, // 30 days (match session)
            path: '/',
        });

        return NextResponse.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });
    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// PUT - Register
export async function PUT(request) {
    try {
        // Check rate limit
        const rateLimitResult = checkRateLimit(request, 'auth');
        if (!rateLimitResult.allowed) {
            return NextResponse.json(
                {
                    error: rateLimitResult.blocked
                        ? `Zu viele Versuche. Bitte warte ${Math.ceil(rateLimitResult.retryAfter / 60)} Minuten.`
                        : 'Rate limit exceeded',
                },
                {
                    status: 429,
                    headers: {
                        'Retry-After': String(rateLimitResult.retryAfter),
                    },
                }
            );
        }


        const bodyContent = await request.json();
        const parsed = RegisterSchema.safeParse(bodyContent);

        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
        }

        const { password } = parsed.data;
        const username = parsed.data.username.trim().toLowerCase();
        const email = parsed.data.email.trim().toLowerCase();

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
        if (!emailRegex.test(email)) {
            return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
        }

        // Validate password complexity
        const passwordValidation = validatePasswordComplexity(password);
        if (!passwordValidation.valid) {
            return NextResponse.json({
                error: 'Passwort erfüllt nicht die Anforderungen',
                details: passwordValidation.errors,
            }, { status: 400 });
        }

        // Check if user exists — use constant-time response to prevent enumeration
        const existingUser = db.getUserByUsername(username);
        const existingEmail = db.getUserByEmail(email);

        if (existingUser || existingEmail) {
            // Perform a dummy hash to prevent timing-based enumeration
            const bcrypt = require('bcryptjs');
            await bcrypt.hash('dummy', 10);
            return NextResponse.json({ error: 'Registrierung fehlgeschlagen' }, { status: 400 });
        }

        // Create user - returns { id, username, email }
        const newUser = db.createUser(username, password, email);

        sendWelcomeEmail(email, username).catch(err => console.error('Failed to send welcome email:', err));

        // Reset rate limit on successful registration
        resetRateLimit(request, 'auth');

        // Create session - returns { token, expiresAt }
        const session = db.createSession(newUser.id);

        // SECURITY: Pass session.token to derive CSRF via HMAC (CWE-352 fix)
        const csrfToken = generateCSRFToken(session.token);
        storeCSRFToken(session.token, csrfToken);

        // Set cookies
        const cookieStore = await cookies();
        cookieStore.set('session_token', session.token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 30 * 24 * 60 * 60,
            path: '/',
        });

        cookieStore.set('csrf_token', csrfToken, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60,
            path: '/',
        });

        return NextResponse.json({
            success: true,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email,
            },
        });
    } catch (error) {
        console.error('Register error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// DELETE - Logout
export async function DELETE() {
    try {

        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (token) {
            db.deleteSession(token);
            removeCSRFToken(token);
        }

        cookieStore.set('session_token', '', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        cookieStore.set('csrf_token', '', {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 0,
            path: '/',
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Logout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET - Get current user
export async function GET() {
    try {

        const cookieStore = await cookies();
        const token = cookieStore.get('session_token')?.value;

        if (!token) {
            return NextResponse.json({ user: null });
        }

        const session = db.getSession(token);

        if (!session) {
            return NextResponse.json({ user: null });
        }

        const user = db.getUserById(session.user_id);

        return NextResponse.json({
            user: user ? {
                id: user.id,
                username: user.username,
                email: user.email,
            } : null,
        });
    } catch (error) {
        console.error('Get user error:', error);
        return NextResponse.json({ user: null });
    }
}
