/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    serverExternalPackages: ['better-sqlite3'],
    async headers() {
        return [
            {
                source: '/(.*)',
                headers: [
                    {
                        key: 'X-Content-Type-Options',
                        value: 'nosniff',
                    },
                    {
                        key: 'X-Frame-Options',
                        value: 'DENY',
                    },
                    {
                        key: 'X-XSS-Protection',
                        value: '1; mode=block',
                    },
                    {
                        key: 'Referrer-Policy',
                        value: 'strict-origin-when-cross-origin',
                    },
                    {
                        key: 'Content-Security-Policy',
                        // Note: 'unsafe-inline' needed for dark mode flash fix (layout.jsx inline script) and Next.js hydration
                        // 'unsafe-eval' removed in production; only allowed in dev for Next.js hot reload
                        value: process.env.NODE_ENV === 'production'
                            ? "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.de https://*.tile.openstreetmap.de https://*.openstreetmap.org https://openweathermap.org; connect-src 'self' wss://your-domain.com https://api.frankfurter.app https://*.tile.openstreetmap.org https://tile.openstreetmap.de https://*.tile.openstreetmap.de https://*.openstreetmap.org https://unpkg.com https://nominatim.openstreetmap.org https://openweathermap.org; font-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';"
                            : "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://unpkg.com; img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.de https://*.tile.openstreetmap.de https://*.openstreetmap.org https://openweathermap.org; connect-src 'self' ws://localhost:3000 wss://localhost:3000 https://api.frankfurter.app https://*.tile.openstreetmap.org https://tile.openstreetmap.de https://*.tile.openstreetmap.de https://*.openstreetmap.org https://unpkg.com https://nominatim.openstreetmap.org https://openweathermap.org; font-src 'self' data:; frame-ancestors 'none'; object-src 'none'; base-uri 'self';",
                    },
                ],
            },
            {
                source: '/sw.js',
                headers: [
                    {
                        key: 'Cache-Control',
                        value: 'no-cache, no-store, must-revalidate',
                    },
                    {
                        key: 'Service-Worker-Allowed',
                        value: '/',
                    },
                ],
            },
        ];
    },
};

module.exports = nextConfig;
