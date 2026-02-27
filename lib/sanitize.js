'use strict';

/**
 * Central input sanitization utilities
 * Prevents XSS, injection, and data integrity issues
 */

/**
 * Sanitize a string: trim, enforce max length
 * @param {*} value - Input to sanitize
 * @param {number} maxLength - Maximum allowed length (default 500)
 * @returns {string} Sanitized string
 */
function sanitizeString(value, maxLength = 500) {
    if (value === null || value === undefined) return '';
    if (typeof value !== 'string') return String(value).trim().slice(0, maxLength);
    return value.trim().slice(0, maxLength);
}

/**
 * Sanitize a string, returning null if empty (for optional fields)
 * @param {*} value - Input to sanitize
 * @param {number} maxLength - Maximum allowed length
 * @returns {string|null}
 */
function sanitizeStringOrNull(value, maxLength = 500) {
    if (value === null || value === undefined) return null;
    const sanitized = sanitizeString(value, maxLength);
    return sanitized.length > 0 ? sanitized : null;
}

/**
 * Validate a value is one of the allowed options
 * @param {*} value - Value to check
 * @param {Array} allowed - Array of allowed values
 * @param {*} fallback - Fallback value if not in allowed list
 * @returns {*}
 */
function validateEnum(value, allowed, fallback) {
    return allowed.includes(value) ? value : fallback;
}

/**
 * Sanitize a numeric value within range
 * @param {*} value - Input value
 * @param {number} min - Minimum
 * @param {number} max - Maximum
 * @returns {number|null}
 */
function sanitizeNumber(value, min = -Infinity, max = Infinity) {
    if (value === null || value === undefined || value === '') return null;
    const num = Number(value);
    if (isNaN(num)) return null;
    return Math.min(Math.max(num, min), max);
}

/**
 * Sanitize hotel input data
 * @param {Object} data - Raw hotel data
 * @returns {Object} Sanitized hotel data
 */
function sanitizeHotelInput(data) {
    return {
        name: sanitizeString(data.name, 200),
        address: sanitizeStringOrNull(data.address, 500),
        price_per_night: sanitizeNumber(data.price_per_night, 0, 999999),
        currency: validateEnum(data.currency, ['JPY', 'EUR', 'USD', 'GBP', 'CHF'], 'JPY'),
        check_in_date: sanitizeStringOrNull(data.check_in_date, 10),
        check_out_date: sanitizeStringOrNull(data.check_out_date, 10),
        check_in_time: sanitizeStringOrNull(data.check_in_time, 10),
        check_out_time: sanitizeStringOrNull(data.check_out_time, 10),
        booking_url: sanitizeStringOrNull(data.booking_url, 2000),
        notes: sanitizeStringOrNull(data.notes, 2000),
        rating: sanitizeNumber(data.rating, 0, 5),
        latitude: sanitizeNumber(data.latitude || data.lat, -90, 90),
        longitude: sanitizeNumber(data.longitude || data.lon, -180, 180),
    };
}

/**
 * Sanitize activity input data
 * @param {Object} data - Raw activity data
 * @returns {Object} Sanitized activity data
 */
function sanitizeActivityInput(data) {
    return {
        title: sanitizeString(data.title, 200),
        description: sanitizeStringOrNull(data.description, 2000),
        category: sanitizeStringOrNull(data.category, 50),
        address: sanitizeStringOrNull(data.address, 500),
        latitude: sanitizeNumber(data.latitude || data.lat, -90, 90),
        longitude: sanitizeNumber(data.longitude || data.lon, -180, 180),
        planned_date: sanitizeStringOrNull(data.planned_date, 10),
        price: sanitizeNumber(data.price, 0, 999999),
        currency: validateEnum(data.currency, ['JPY', 'EUR', 'USD', 'GBP', 'CHF'], 'JPY'),
        url: sanitizeStringOrNull(data.url, 2000),
        notes: sanitizeStringOrNull(data.notes, 2000),
        planned_time: sanitizeStringOrNull(data.planned_time, 10),
        completed: data.completed ? 1 : 0,
    };
}

module.exports = {
    sanitizeString,
    sanitizeStringOrNull,
    validateEnum,
    sanitizeNumber,
    sanitizeHotelInput,
    sanitizeActivityInput,
};
