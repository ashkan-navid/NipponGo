import { NextResponse } from 'next/server';
const db = require('../../../../lib/db.js');
const { checkRateLimit } = require('../../../../lib/rateLimit.js');
const { sendPasswordResetEmail, sendPasswordChangedNotification } = require('../../../../lib/mailer.js');
const { sanitizeString } = require('../../../../lib/sanitize.js');

// POST - Request password reset (send email)
export async function POST(request) {
  // Rate limit: reuse 'auth' endpoint limiter (10 attempts/15min)
  const rateLimitResult = checkRateLimit(request, 'auth');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: rateLimitResult.blocked
        ? `Zu viele Versuche. Bitte warte ${Math.ceil(rateLimitResult.retryAfter / 60)} Minuten.`
        : 'Rate limit exceeded' },
      { status: 429, headers: { 'Retry-After': String(rateLimitResult.retryAfter) } }
    );
  }

  try {
    const { identifier } = await request.json();
    const sanitized = sanitizeString(identifier, 254).toLowerCase();

    if (!sanitized || sanitized.length < 3) {
      // Still return success to prevent enumeration
      return NextResponse.json({
        success: true,
        message: 'Falls ein Konto mit dieser Angabe existiert und eine E-Mail-Adresse hinterlegt ist, wurde eine E-Mail gesendet.'
      });
    }

    // Look up user by username OR email
    let user = db.getUserByUsername(sanitized);
    if (!user) {
      user = db.getUserByEmail(sanitized);
    }

    if (user && user.email) {
      // Generate token and send email
      const token = db.createPasswordResetToken(user.id);
      const baseUrl = request.headers.get('origin') ||
                      (request.headers.get('x-forwarded-proto') ?
                        `${request.headers.get('x-forwarded-proto')}://${request.headers.get('host')}` :
                        'https://your-domain.com');
      const resetUrl = `${baseUrl}/reset-password?token=${token}`;

      try {
        await sendPasswordResetEmail(user.email, user.username, resetUrl);
      } catch (err) {
        console.error('Failed to send reset email:', err);
        // Don't reveal the error to the user
      }
    } else {
      // Simulate processing delay to prevent timing-based enumeration
      await new Promise(resolve => setTimeout(resolve, 200 + Math.random() * 300));
    }

    // Always return the same response
    return NextResponse.json({
      success: true,
      message: 'Falls ein Konto mit dieser Angabe existiert und eine E-Mail-Adresse hinterlegt ist, wurde eine E-Mail gesendet.',
    });
  } catch (error) {
    console.error('Password reset request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// PUT - Reset password with token
export async function PUT(request) {
  const rateLimitResult = checkRateLimit(request, 'auth');
  if (!rateLimitResult.allowed) {
    return NextResponse.json(
      { error: `Zu viele Versuche. Bitte warte ${Math.ceil(rateLimitResult.retryAfter / 60)} Minuten.` },
      { status: 429 }
    );
  }

  try {
    const { token, password } = await request.json();

    if (!token || !password) {
      return NextResponse.json({ error: 'Token und Passwort erforderlich' }, { status: 400 });
    }

    // Validate password complexity (same as registration)
    if (password.length < 8 || !/[a-z]/.test(password) || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
      return NextResponse.json({
        error: 'Passwort erfüllt nicht die Anforderungen',
        details: [
          password.length < 8 && 'Mindestens 8 Zeichen',
          !/[a-z]/.test(password) && 'Mindestens ein Kleinbuchstabe',
          !/[A-Z]/.test(password) && 'Mindestens ein Großbuchstabe',
          !/[0-9]/.test(password) && 'Mindestens eine Zahl',
        ].filter(Boolean),
      }, { status: 400 });
    }

    // Verify token
    const resetRecord = db.verifyPasswordResetToken(token);
    if (!resetRecord) {
      return NextResponse.json(
        { error: 'Ungültiger oder abgelaufener Link. Bitte fordere einen neuen Link an.' },
        { status: 400 }
      );
    }

    // Update password
    db.updateUserPassword(resetRecord.user_id, password);

    // Delete the used token (single-use)
    db.deletePasswordResetToken(resetRecord.id);

    // Invalidate all existing sessions (force re-login)
    db.deleteUserSessions(resetRecord.user_id);

    // Send notification email if user has email
    const user = db.getUserById(resetRecord.user_id);
    if (user && user.email) {
      try {
        await sendPasswordChangedNotification(user.email, user.username);
      } catch (err) {
        console.error('Failed to send password changed email:', err);
        // Don't block the response
      }
    }

    return NextResponse.json({ success: true, message: 'Passwort wurde erfolgreich geändert.' });
  } catch (error) {
    console.error('Password reset error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
