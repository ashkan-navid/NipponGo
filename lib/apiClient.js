/**
 * API Fetch Helper with CSRF Token Support
 * Automatically includes CSRF token in all state-changing requests
 */

/**
 * Get CSRF token from cookie
 */
function getCSRFToken() {
    if (typeof document === 'undefined') return null;

    const match = document.cookie.match(/csrf_token=([^;]+)/);
    return match ? match[1] : null;
}

/**
 * Fetch wrapper that automatically includes CSRF token
 * @param {string} url - The URL to fetch
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<Response>}
 */
export async function apiFetch(url, options = {}) {
    const csrfToken = getCSRFToken();

    const headers = {
        'Content-Type': 'application/json',
        ...options.headers,
    };

    // Add CSRF token for state-changing methods
    if (csrfToken && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
        headers['X-CSRF-Token'] = csrfToken;
    }

    try {
        const response = await fetch(url, {
            ...options,
            headers,
            credentials: 'same-origin', // Ensure cookies are sent
        });

        return response;
    } catch (error) {
        // Queue for background sync if offline and mutation request
        if (!navigator.onLine && ['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase())) {
            try {
                const cache = await caches.open('pending-mutations-v1');
                const request = new Request(url, {
                    method: options.method,
                    headers,
                    body: options.body,
                });
                // Store request body as a Response for later replay
                await cache.put(request, new Response(options.body, {
                    headers,
                }));
                // Request background sync
                if ('serviceWorker' in navigator) {
                    const registration = await navigator.serviceWorker.ready;
                    if ('sync' in registration) {
                        await registration.sync.register('sync-pending-mutations');
                        console.log('Mutation queued for background sync');
                    }
                }
            } catch (syncErr) {
                console.error('Failed to queue for background sync:', syncErr);
            }
        }
        // Re-throw the original error
        throw error;
    }
}

/**
 * Helper for JSON API calls
 */
export async function apiPost(url, data) {
    return apiFetch(url, {
        method: 'POST',
        body: JSON.stringify(data),
    });
}

export async function apiPut(url, data) {
    return apiFetch(url, {
        method: 'PUT',
        body: JSON.stringify(data),
    });
}

export async function apiDelete(url) {
    return apiFetch(url, {
        method: 'DELETE',
    });
}

export async function apiGet(url) {
    return apiFetch(url, {
        method: 'GET',
    });
}
