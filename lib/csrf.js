/**
 * CSRF Protection — Stateless HMAC-based Double Submit Cookie
 *
 * Instead of storing tokens in-memory (lost on server restart), we use
 * HMAC(sessionToken, secret) as the CSRF token.  The token can be
 * re-derived on every request, so no server-side state is needed.
 *
 * The secret is per-process; if the process restarts a new secret is
 * generated, so we also accept a "re-issue" flow: if validation fails
 * the middleware can re-issue a fresh token.
 */

const crypto = require('crypto');

// Persistent secret — survives hot-reload via global, but NOT container restarts.
// That's fine: on restart we simply re-issue tokens on the next successful auth check.
if (!global.__csrfSecret) {
    global.__csrfSecret = crypto.randomBytes(32).toString('hex');
}
const SECRET = global.__csrfSecret;

/**
 * Generate a CSRF token derived from the session token.
 * @param {string} sessionToken
 * @returns {string} hex CSRF token
 */
function generateCSRFToken(sessionToken) {
    if (!sessionToken) return crypto.randomBytes(32).toString('hex');
    return crypto
        .createHmac('sha256', SECRET)
        .update(sessionToken)
        .digest('hex');
}

/**
 * Validate a CSRF token against the session token.
 * @param {string} sessionToken
 * @param {string} csrfToken
 * @returns {boolean}
 */
function validateCSRFToken(sessionToken, csrfToken) {
    if (!sessionToken || !csrfToken) return false;

    const expected = generateCSRFToken(sessionToken);

    try {
        return crypto.timingSafeEqual(
            Buffer.from(expected, 'hex'),
            Buffer.from(csrfToken, 'hex')
        );
    } catch {
        return false;
    }
}

// Kept for backward compat — now no-ops since we're stateless
function storeCSRFToken(/* sessionToken, csrfToken */) { }
function removeCSRFToken(/* sessionToken */) { }

module.exports = {
    generateCSRFToken,
    storeCSRFToken,
    validateCSRFToken,
    removeCSRFToken,
};
