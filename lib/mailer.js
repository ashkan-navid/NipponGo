const nodemailer = require('nodemailer');

let transporter;

// Only initialize if SMTP credentials are configured
if (process.env.SMTP_USER && process.env.SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

/**
 * Send a password reset email
 * @param {string} toEmail - Recipient email
 * @param {string} username - Username for personalization
 * @param {string} resetUrl - Full reset URL with token
 */
async function sendPasswordResetEmail(toEmail, username, resetUrl) {
  if (!transporter) {
    console.warn('SMTP not configured, cannot send password reset email');
    return;
  }

  const text = `Hallo ${username},

du hast eine Passwort-Zurücksetzung für dein NipponGo-Konto angefordert.

Klicke auf den folgenden Link, um ein neues Passwort festzulegen:

${resetUrl}

Dieser Link ist 24 Stunden gültig und kann nur einmal verwendet werden.

Falls du diese Anfrage nicht gestellt hast, ignoriere diese E-Mail einfach. Dein Passwort wird nicht geändert.

Viele Grüße
Dein NipponGo-Team`;

  await transporter.sendMail({
    from: `"NipponGo" <${process.env.SMTP_USER || 'noreply@your-domain.com'}>`,
    to: toEmail,
    subject: 'NipponGo — Passwort zurücksetzen',
    text,
  });
}

/**
 * Send email changed notification to new address
 * @param {string} newEmail - New email address
 * @param {string} username - Username for personalization
 */
async function sendEmailChangedNotification(newEmail, username) {
  if (!transporter) {
    console.warn('SMTP not configured, cannot send email changed notification');
    return;
  }

  const text = `Hallo ${username},

diese E-Mail-Adresse wurde soeben mit deinem NipponGo-Konto verknüpft.

Du kannst sie ab jetzt zur Passwort-Zurücksetzung verwenden.

Falls du diese Änderung nicht selbst vorgenommen hast, wurde dein Konto möglicherweise kompromittiert. Ändere bitte umgehend dein Passwort.

Viele Grüße
Dein NipponGo-Team`;

  await transporter.sendMail({
    from: `"NipponGo" <${process.env.SMTP_USER || 'noreply@your-domain.com'}>`,
    to: newEmail,
    subject: 'NipponGo — E-Mail-Adresse hinterlegt',
    text,
  });
}

/**
 * Send email removed notification to old address
 * @param {string} oldEmail - Old email address
 * @param {string} username - Username for personalization
 */
async function sendEmailRemovedNotification(oldEmail, username) {
  if (!transporter) {
    console.warn('SMTP not configured, cannot send email removed notification');
    return;
  }

  const text = `Hallo ${username},

diese E-Mail-Adresse wurde soeben von deinem NipponGo-Konto getrennt.

Eine neue E-Mail-Adresse wurde hinterlegt. Du erhältst an diese Adresse keine weiteren Benachrichtigungen mehr.

Falls du diese Änderung nicht selbst vorgenommen hast, wurde dein Konto möglicherweise kompromittiert. Versuche dich anzumelden und dein Passwort zu ändern, oder nutze die Passwort-Zurücksetzung.

Viele Grüße
Dein NipponGo-Team`;

  await transporter.sendMail({
    from: `"NipponGo" <${process.env.SMTP_USER || 'noreply@your-domain.com'}>`,
    to: oldEmail,
    subject: 'NipponGo — E-Mail-Adresse geändert',
    text,
  });
}

/**
 * Send a welcome email
 * @param {string} toEmail - Recipient email
 * @param {string} username - Username for personalization
 */
async function sendWelcomeEmail(toEmail, username) {
  if (!transporter) {
    console.warn('SMTP not configured, cannot send welcome email');
    return;
  }

  const text = `Hallo ${username},

willkommen bei NipponGo!

Wir freuen uns, dass du dabei bist. Nutze unsere Funktionen wie die Reiseplanung, interaktive Karte, Packliste und vieles mehr, um deine Japan-Reise perfekt vorzubereiten.

Bitte beachte: Diese E-Mail-Adresse wird zukünftig für die Passwort-Zurücksetzung verwendet.

Viele Grüße
Dein NipponGo-Team`;

  await transporter.sendMail({
    from: `"NipponGo" <${process.env.SMTP_USER || 'noreply@your-domain.com'}>`,
    to: toEmail,
    subject: 'NipponGo — Willkommen!',
    text,
  });
}

/**
 * Send password changed notification
 * @param {string} toEmail - Recipient email
 * @param {string} username - Username for personalization
 */
async function sendPasswordChangedNotification(toEmail, username) {
  if (!transporter) {
    console.warn('SMTP not configured, cannot send password changed notification');
    return;
  }

  const text = `Hallo ${username},

dein Passwort für dein NipponGo-Konto wurde soeben geändert.

Falls du diese Änderung nicht selbst vorgenommen hast, wurde dein Konto möglicherweise kompromittiert. Nutze bitte umgehend die Passwort-Zurücksetzung, um wieder Zugriff zu erhalten.

Viele Grüße
Dein NipponGo-Team`;

  await transporter.sendMail({
    from: `"NipponGo" <${process.env.SMTP_USER || 'noreply@your-domain.com'}>`,
    to: toEmail,
    subject: 'NipponGo — Passwort geändert',
    text,
  });
}

module.exports = {
  sendPasswordResetEmail,
  sendEmailChangedNotification,
  sendEmailRemovedNotification,
  sendPasswordChangedNotification,
  sendWelcomeEmail,
};
