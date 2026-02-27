/**
 * Changelog Data for NipponGo
 * Client-Side ES Module
 */

export const APP_VERSION = '2.0.0';

export const changelog = [
    {
        version: '2.0.0',
        date: '2026-02-25',
        changes: {
            neu: [
                'Gamification & Utilities: Japan-Quiz mit 30 Fragen und Tages-Budget-Tracker (Phase 5) integriert.',
                'Visuelles Design: Skeleton-Loading, Sakura-Hero-Animation, Konfetti-Feier und neues Schnellzugriff-Design im Dashboard (Phase 4 & 5).',
                'Proaktive Erinnerungen: Automatisierter Push-Scheduler für Abflüge, Check-ins, Aktivitäten und Wetter (Phase 3).',
                'Wetter-Vorhersage: 5-Tage-Vorhersage API mit Dashboard-Widget (Phase 2).',
                'Entdecken-Erweiterung: 8 neue/erweiterte Kategorien (Kanji, Info, Notfall, Phrasen-Favoriten, erweiterter Knigge etc.) (Phase 1).',
                'Zentrale Architektur: Dashboard als Startseite, 5-Tab-Struktur, Google-Maps Short-URL Auflösung.',
            ],
            verbessert: [
                'Geocoding: POI-Suche als erste Strategie für gebäudegenaue Marker.',
                'Währungsrechner: In den neuen Entdecken-Hub integriert.',
                'Onboarding: Aktualisiert für neue Tab-Struktur mit Dashboard.',
            ],
            entfernt: [
                'Echtzeit-Standortfreigabe und User-Marker komplett entfernt.',
                'Offline-Karten-Download und Tile-Caching entfernt.',
            ],
        },
    },
    {
        version: '1.5.0',
        date: '2026-02-24',
        changes: {
            neu: [
                'PWABuilder-Optimierungen: Manifest erweitert mit Shortcuts, Share Target, Background Sync, File Handlers, Protocol Handlers',
                'Flüge-Integration: AeroDataBox Auto-Sync für Flugdaten mit Echtzeit-Status',
                'Screenshots: PWA-Manifest-Screenshots für bessere App-Store-Kompatibilität',
                'Periodic Background Sync: Automatische Datenaktualisierung im Hintergrund',
            ],
            verbessert: [
                'Geocoding: Bessere Erkennung japanischer Adressen durch Land-Filter',
            ],
            fehlerbehebungen: [
                'Korrekte Anzeige von Flug-Uhrzeiten in der Timeline',
            ],
        },
    },
    {
        version: '1.0.0',
        date: '2026-01-10',
        changes: {
            neu: [
                'Initiales Release: Hotels- und Aktivitätenverwaltung',
                'Interaktive Karte: Leaflet-basierte Karte mit OpenStreetMap',
                'Freunde-System: Teilen von Reiseplänen',
            ],
        },
    },
];
