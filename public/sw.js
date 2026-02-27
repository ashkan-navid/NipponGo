const CACHE_NAME = 'japan-travel-v3';
const STATIC_CACHE = 'static-v2';

// Assets to cache immediately
const STATIC_ASSETS = [
    '/',
    '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            console.log('Caching static assets');
            return cache.addAll(STATIC_ASSETS);
        })
    );
    // NOTE: Do NOT call skipWaiting() here.
    // The client will send a 'skipWaiting' message when the user confirms the update.
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames
                    .filter((name) => {
                        // Delete old versions of our caches (including legacy tile-cache)
                        return (name.startsWith('japan-travel-') ||
                            name.startsWith('static-') ||
                            name.startsWith('tile-cache')) &&
                            name !== CACHE_NAME &&
                            name !== STATIC_CACHE;
                    })
                    .map((name) => {
                        console.log('Deleting old cache:', name);
                        return caches.delete(name);
                    })
            );
        })
    );
    // Take control of all clients immediately
    self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-http/https requests (e.g. chrome-extension://)
    if (!url.protocol.startsWith('http')) {
        return;
    }

    // Skip WebSocket and HMR requests (development)
    if (url.pathname.includes('webpack-hmr') ||
        url.pathname.includes('_next/webpack') ||
        url.pathname.includes('socket.io')) {
        return;
    }

    // Skip external URLs (non-same-origin) — let the browser handle them natively
    if (url.origin !== self.location.origin) {
        return;
    }

    // Handle API requests - network first, cache fallback
    // Exclude auth and share endpoints from caching (sensitive data)
    if (url.pathname.startsWith('/api/')) {
        const sensitiveEndpoints = ['/api/auth', '/api/share'];
        const isSensitive = sensitiveEndpoints.some(ep => url.pathname.startsWith(ep));

        if (isSensitive) {
            // Always fetch from network, never cache sensitive data
            event.respondWith(fetch(request));
            return;
        }

        event.respondWith(
            fetch(request)
                .then((response) => {
                    // Cache successful GET responses
                    if (response.ok) {
                        const responseClone = response.clone();
                        caches.open(CACHE_NAME).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return response;
                })
                .catch(() => {
                    // Return cached response if offline
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        // Return empty response for offline API calls
                        return new Response('', { status: 503 });
                    });
                })
        );
        return;
    }

    // Handle Next.js static assets - network first with cache fallback
    // This prevents stale JS/CSS issues on reload
    if (url.pathname.startsWith('/_next/')) {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    // Cache successful responses
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Fallback to cache if offline
                    return caches.match(request).then((cachedResponse) => {
                        if (cachedResponse) {
                            return cachedResponse;
                        }
                        return new Response('', { status: 503 });
                    });
                })
        );
        return;
    }

    // Handle navigation requests (HTML pages) - network first
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    // Cache the page
                    if (networkResponse.ok) {
                        const responseClone = networkResponse.clone();
                        caches.open(STATIC_CACHE).then((cache) => {
                            cache.put(request, responseClone);
                        });
                    }
                    return networkResponse;
                })
                .catch(() => {
                    // Return cached page or root if offline
                    return caches.match(request).then((cachedResponse) => {
                        return cachedResponse || caches.match('/');
                    });
                })
        );
        return;
    }

    // Handle other static assets - stale-while-revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                // Update cache with fresh response
                if (networkResponse.ok) {
                    const responseClone = networkResponse.clone();
                    caches.open(STATIC_CACHE).then((cache) => {
                        cache.put(request, responseClone);
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Return 503 if network fails and no cache
                return new Response('', { status: 503 });
            });

            // Return cached response immediately, update cache in background
            return cachedResponse || fetchPromise;
        })
    );
});

// Handle messages from the app
self.addEventListener('message', (event) => {
    if (event.data === 'skipWaiting') {
        self.skipWaiting();
        return;
    }
});

// --- Push Notifications ---

self.addEventListener('push', (event) => {
    let data = {
        title: 'NipponGo',
        body: 'Neue Benachrichtigung',
        icon: '/icons/icon-192x192.png',
        badge: '/icons/icon-96x96.png',
        tag: 'default',
    };

    if (event.data) {
        try {
            data = { ...data, ...event.data.json() };
        } catch (e) {
            data.body = event.data.text();
        }
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            tag: data.tag,
            vibrate: [200, 100, 200],
            data: data.data || {},
        })
    );
});

self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            // Focus existing window if available
            for (const client of clientList) {
                if (client.url.startsWith(self.location.origin) && 'focus' in client) {
                    return client.focus();
                }
            }
            // Open new window
            if (clients.openWindow) {
                return clients.openWindow('/');
            }
        })
    );
});

// --- Background Sync ---
// Retry failed API mutations when connectivity returns

self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-pending-mutations') {
        event.waitUntil(replayPendingMutations());
    }
});

async function replayPendingMutations() {
    try {
        const cache = await caches.open('pending-mutations-v1');
        const requests = await cache.keys();

        for (const request of requests) {
            try {
                const cachedResponse = await cache.match(request);
                if (!cachedResponse) continue;

                const body = await cachedResponse.text();
                const headers = {};
                cachedResponse.headers.forEach((value, key) => {
                    headers[key] = value;
                });

                const response = await fetch(request.url, {
                    method: request.method || 'POST',
                    headers,
                    body: body || undefined,
                    credentials: 'same-origin',
                });

                if (response.ok) {
                    await cache.delete(request);
                    // Notify client of successful sync
                    const clients = await self.clients.matchAll();
                    for (const client of clients) {
                        client.postMessage({
                            type: 'background-sync-complete',
                            url: request.url,
                        });
                    }
                }
            } catch (err) {
                // Request still failing; leave in cache for next sync attempt
                console.error('Background sync retry failed:', err);
            }
        }
    } catch (err) {
        console.error('Background sync error:', err);
    }
}

// --- Periodic Background Sync ---
// Refresh cached data periodically in the background

self.addEventListener('periodicsync', (event) => {
    if (event.tag === 'refresh-data') {
        event.waitUntil(refreshCachedData());
    }
});

async function refreshCachedData() {
    try {
        const cache = await caches.open(CACHE_NAME);

        // Refresh key API endpoints in background
        const urlsToRefresh = [
            '/api/hotels',
            '/api/activities',
            '/api/currency',
            '/api/packing',
        ];

        for (const url of urlsToRefresh) {
            try {
                const response = await fetch(url, { credentials: 'same-origin' });
                if (response.ok) {
                    await cache.put(url, response);
                }
            } catch (err) {
                // Silently ignore; will try again at next periodic sync
            }
        }
    } catch (err) {
        console.error('Periodic sync error:', err);
    }
}
