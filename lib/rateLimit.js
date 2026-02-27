/**
 * Rate Limiter - Token Bucket Algorithm
 * Protects against brute-force attacks on auth endpoints
 */

// In-memory store for rate limiting (per IP)
const rateLimitStore = new Map();

// Configuration
const RATE_LIMIT_CONFIG = {
    windowMs: 15 * 60 * 1000,     // 15 minutes window
    maxAttempts: 10,              // Max attempts per window for auth
    maxAttemptsGeneral: 100,      // Max attempts for general endpoints
    maxAttemptsGeocode: 60,       // Max attempts for geocode proxy
    blockDurationMs: 30 * 60 * 1000, // 30 minutes block after exceeding
};

/**
 * Clean up expired entries periodically
 */
function cleanupExpiredEntries() {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now > data.resetTime && !data.blocked) {
            rateLimitStore.delete(key);
        }
        // Unblock after block duration
        if (data.blocked && now > data.blockedUntil) {
            rateLimitStore.delete(key);
        }
    }
}

// Run cleanup every 5 minutes
setInterval(cleanupExpiredEntries, 5 * 60 * 1000);

/**
 * Get client IP from request.
 * SECURITY: Only trust proxy headers (X-Forwarded-For, X-Real-IP) when
 * TRUST_PROXY env var is set, to prevent rate-limit bypass via header
 * spoofing (CWE-346). In production behind Traefik/nginx, set TRUST_PROXY=true.
 */
function getClientIP(request) {
    if (process.env.TRUST_PROXY === 'true') {
        const forwarded = request.headers.get?.('x-forwarded-for') ||
            request.headers?.['x-forwarded-for'];
        if (forwarded) {
            return forwarded.split(',')[0].trim();
        }

        const realIP = request.headers.get?.('x-real-ip') ||
            request.headers?.['x-real-ip'];
        if (realIP) {
            return realIP;
        }
    }

    // Fallback to connection remote address
    return request.ip || request.socket?.remoteAddress || 'unknown';
}

/**
 * Check if request is rate limited
 * @param {Request} request - The incoming request
 * @param {string} endpoint - The endpoint identifier (e.g., 'auth', 'api')
 * @returns {{ allowed: boolean, remaining: number, resetTime: number, blocked?: boolean }}
 */
function checkRateLimit(request, endpoint = 'general') {
    const clientIP = getClientIP(request);
    const key = `${clientIP}:${endpoint}`;
    const now = Date.now();

    const maxAttempts = endpoint === 'auth'
        ? RATE_LIMIT_CONFIG.maxAttempts
        : endpoint === 'geocode'
            ? RATE_LIMIT_CONFIG.maxAttemptsGeocode
            : RATE_LIMIT_CONFIG.maxAttemptsGeneral;

    let data = rateLimitStore.get(key);

    // If blocked, check if still within block period
    if (data?.blocked) {
        if (now < data.blockedUntil) {
            return {
                allowed: false,
                remaining: 0,
                resetTime: data.blockedUntil,
                blocked: true,
                retryAfter: Math.ceil((data.blockedUntil - now) / 1000),
            };
        } else {
            // Unblock
            rateLimitStore.delete(key);
            data = null;
        }
    }

    // Initialize or reset window
    if (!data || now > data.resetTime) {
        data = {
            attempts: 0,
            resetTime: now + RATE_LIMIT_CONFIG.windowMs,
            blocked: false,
        };
    }

    // Increment attempts
    data.attempts++;

    // Check if exceeded
    if (data.attempts > maxAttempts) {
        data.blocked = true;
        data.blockedUntil = now + RATE_LIMIT_CONFIG.blockDurationMs;
        rateLimitStore.set(key, data);

        return {
            allowed: false,
            remaining: 0,
            resetTime: data.blockedUntil,
            blocked: true,
            retryAfter: Math.ceil(RATE_LIMIT_CONFIG.blockDurationMs / 1000),
        };
    }

    rateLimitStore.set(key, data);

    return {
        allowed: true,
        remaining: maxAttempts - data.attempts,
        resetTime: data.resetTime,
        blocked: false,
    };
}

/**
 * Reset rate limit for a key (e.g., after successful login)
 */
function resetRateLimit(request, endpoint = 'general') {
    const clientIP = getClientIP(request);
    const key = `${clientIP}:${endpoint}`;
    rateLimitStore.delete(key);
}

module.exports = {
    checkRateLimit,
    resetRateLimit,
    getClientIP,
    RATE_LIMIT_CONFIG,
};
