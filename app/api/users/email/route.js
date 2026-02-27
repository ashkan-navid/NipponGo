import { NextResponse } from 'next/server';
const { checkAuth, checkCSRF } = require('../../../../lib/withAuth.js');
const db = require('../../../../lib/db.js');
const { sanitizeString } = require('../../../../lib/sanitize.js');
const { sendEmailChangedNotification, sendEmailRemovedNotification } = require('../../../../lib/mailer.js');

// PUT - Update email
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
    const { email } = await request.json();
    const sanitizedEmail = sanitizeString(email, 254).toLowerCase().trim();

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
    if (!sanitizedEmail || !emailRegex.test(sanitizedEmail)) {
      return NextResponse.json({ error: 'Ungültige E-Mail-Adresse' }, { status: 400 });
    }

    // Check if email is already used by another user
    const existingUser = db.getUserByEmail(sanitizedEmail);
    if (existingUser && existingUser.id !== user.id) {
      return NextResponse.json({ error: 'Diese E-Mail-Adresse wird bereits verwendet' }, { status: 400 });
    }

    // Remember old email for notification
    const oldEmail = user.email;

    // Update email in database
    db.updateUserEmail(user.id, sanitizedEmail);

    // Send confirmation email to new address (async, don't block)
    sendEmailChangedNotification(sanitizedEmail, user.username).catch(err => {
      console.error('Failed to send email changed notification:', err);
    });

    // If old email exists and is different, send notification there too
    if (oldEmail && oldEmail !== sanitizedEmail) {
      sendEmailRemovedNotification(oldEmail, user.username).catch(err => {
        console.error('Failed to send email removed notification:', err);
      });
    }

    return NextResponse.json({ success: true, email: sanitizedEmail });
  } catch (error) {
    console.error('Email update error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
