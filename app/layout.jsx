import './globals.css';

export const metadata = {
    title: 'NipponGo',
    description: 'Dein Japan Reisebegleiter mit Karten, Hotels und Aktivitäten',
    manifest: '/manifest.json',
    appleWebApp: {
        capable: true,
        statusBarStyle: 'default',
        title: 'NipponGo',
    },
    formatDetection: {
        telephone: false,
    },
    other: {
        'mobile-web-app-capable': 'yes',
    },
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
    viewportFit: 'cover',
    themeColor: [
        { media: '(prefers-color-scheme: light)', color: '#F9F9F9' },
        { media: '(prefers-color-scheme: dark)', color: '#1C1C1E' },
    ],
};

export default function RootLayout({ children }) {
    return (
        <html lang="de" suppressHydrationWarning>
            <head>
                {/* iOS PWA Meta Tags */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="NipponGo" />

                {/* iOS Icons */}
                <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="152x152" href="/icons/icon-152x152.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/icons/icon-192x192.png" />
                <link rel="apple-touch-icon" sizes="167x167" href="/icons/icon-192x192.png" />

                {/* Favicon */}
                <link rel="icon" type="image/png" sizes="32x32" href="/icons/icon-72x72.png" />
                <link rel="icon" type="image/png" sizes="16x16" href="/icons/icon-72x72.png" />

                {/* Leaflet CSS */}
                <link
                    rel="stylesheet"
                    href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
                    integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY="
                    crossOrigin=""
                />
            </head>
            <body className="bg-ios-gray-50 dark:bg-ios-gray-950 text-ios-gray-950 dark:text-white overscroll-none">
                {/* Prevent dark mode flash: read persisted theme before React hydrates */}
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            try {
                                var stored = localStorage.getItem('theme-storage');
                                if (stored) {
                                    var parsed = JSON.parse(stored);
                                    if (parsed && parsed.state && parsed.state.isDarkMode) {
                                        document.documentElement.classList.add('dark');
                                    }
                                }
                            } catch(e) {}
                            document.addEventListener('contextmenu', function(e) { e.preventDefault(); });
                        `,
                    }}
                />
                {children}
            </body>
        </html>
    );
}
