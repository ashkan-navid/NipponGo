import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
const { checkAuth, checkCSRF } = require('../../../../lib/withAuth.js');
const db = require('../../../../lib/db.js');
const { sendPasswordChangedNotification } = require('../../../../lib/mailer.js');

// PUT - Change password (while logged in)
export async function PUT(request) {
  const csrfResult = await checkCSRF(request);
  if (!csrfResult.valid) {
    return NextResponse.json({ error: csrfResult.error }, { status: 403 });
  }

  const user = await checkAuth();
  if (!user) {
    return NextResponse.json({ error: 'Nicht authentifiziert' }, { status: 401 });
  }

  try {
    const { currentPassword, newPassword } = await request.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Aktuelles und neues Passwort erforderlich' }, { status: 400 });
    }

    // Verify current password
    if (!db.verifyPassword(currentPassword, user.password_hash)) {
      return NextResponse.json({ error: 'Aktuelles Passwort ist falsch' }, { status: 400 });
    }

    // Validate new password complexity
    if (newPassword.length < 8 || !/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/[0-9]/.test(newPassword)) {
      return NextResponse.json({
        error: 'Neues Passwort erfüllt nicht die Anforderungen',
        details: [
          newPassword.length < 8 && 'Mindestens 8 Zeichen',
          !/[a-z]/.test(newPassword) && 'Mindestens ein Kleinbuchstabe',
          !/[A-Z]/.test(newPassword) && 'Mindestens ein Großbuchstabe',
          !/[0-9]/.test(newPassword) && 'Mindestens eine Zahl',
        ].filter(Boolean),
      }, { status: 400 });
    }

    // Check that new password is different from current
    if (db.verifyPassword(newPassword, user.password_hash)) {
      return NextResponse.json({ error: 'Neues Passwort muss sich vom aktuellen unterscheiden' }, { status: 400 });
    }

    // Update password
    db.updateUserPassword(user.id, newPassword);

    // Invalidate all other sessions (keep current session)
    const currentSessionToken = cookies().get('session_token')?.value;
    if (currentSessionToken) {
      db.deleteOtherUserSessions(user.id, currentSessionToken);
    }

    // Send notification email if user has email
    if (user.email) {
      sendPasswordChangedNotification(user.email, user.username).catch(err => {
        console.error('Failed to send password changed email:', err);
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Password change error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
