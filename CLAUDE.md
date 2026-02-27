# CLAUDE.md — NipponGo

## Projektübersicht

NipponGo ist eine **Offline-First Progressive Web App (PWA)** für Japan-Reisen, optimiert für iOS Safari. Die App bietet ein Dashboard mit Reiseübersicht und Kartenvorschau, Hotel-/Aktivitäten-/Flugverwaltung, Währungsumrechnung (Multi-Währung), ein Phrasebook, eine interaktive Packliste, einen Etiquette-Guide (Japan Knigge), Push-Benachrichtigungen (Web Push API) und Echtzeit-Daten-Synchronisation zwischen Nutzern.

**Sprache**: Das UI und alle Beschreibungen sind auf **Deutsch**.

---

## 🤖 KI-System / Agent Anweisungen
**WICHTIG für alle autonomen KI-Agenten (z. B. Cursor, Claude Coder, AI-Assistenten):**
Diese Datei (`CLAUDE.md`) dient als zentrale "Ground Truth" für das gesamte Projekt. Die KI-Systeme haben folgende strikte Anweisung:
1. **Regelmäßige Aktualisierung:** Du bist verpflichtet, diese Datei nach signifikanten Refactorings, neuen Architektur-Entscheidungen, hinzugefügten Bibliotheken oder komplettierten Meilensteinen **selbstständig und automatisch zu aktualisieren**.
2. **Read First:** Prüfe vor dem Beginn komplexer Entwicklungs-Tasks immer zuerst diese Datei auf globale Vorgaben und Projektstruktur, um Konsistenz zu gewährleisten.

---

## Tech Stack

| Bereich | Technologie |
|---------|-------------|
| Framework | Next.js 16 (App Router), custom `server.js` |
| Sprache | JavaScript (`.jsx` Komponenten, `.js` Libs), kein TypeScript zur Laufzeit |
| Styling | Tailwind CSS 3.4 mit iOS-Design-Tokens (`darkMode: 'class'`) |
| Datenbank | SQLite über `better-sqlite3` (Server-Side) |
| State Management | Zustand (Client-State) + TanStack Query (Server-State) |
| Echtzeit | Socket.io (eigener HTTP-Server in `server.js`) |
| Karten | Leaflet (direkter Import, kein react-leaflet), OpenStreetMap DE Tiles (Lokalisierung) |
| Icons | Lucide React (`lucide-react`) |
| Wetter | OpenWeatherMap API (Server-Side Proxy mit In-Memory Cache) |
| Flugdaten | AeroDataBox API (Live-Flugstatus, 4h Cache, Rate-Limited 1 req/sec) |
| Push-Benachrichtigungen | Web Push API (`web-push`), VAPID-Keys, Service Worker Push Events |
| PWA | Service Worker (`public/sw.js`), Web App Manifest, Share Target API |
| Deployment | Docker (multi-stage Build), `docker-compose.yml` |

---

## Befehle

```bash
npm install          # Abhängigkeiten installieren
npm run dev          # Entwicklungsserver starten (localhost:3000)
npm run build        # Next.js Produktions-Build
npm run start        # Produktionsserver starten
npm run lint         # Next.js Linting

docker-compose up -d --build   # Docker Container bauen & starten
docker-compose down             # Container stoppen

bash deploy.sh                  # Deployment: rsync zu Server + Docker rebuild
```

---

## Projektstruktur

```
├── app/                        # Next.js App Router
│   ├── layout.jsx              # Root Layout (Metadata, PWA-Tags, Dark-Mode-Flash-Fix)
│   ├── page.jsx                # Haupt-SPA (Tabs: Reiseplanung, Timeline, Dashboard, Packliste, Entdecken)
│   ├── globals.css             # Globale Styles (inkl. Leaflet CSS Import)
│   └── api/                    # API Route Handlers (Next.js App Router Format)
│       ├── auth/route.js       # Login/Register (inkl. Willkommensmail)/Logout/Session (bcryptjs, auto Hash-Upgrade)
│       ├── hotels/route.js     # Hotels CRUD (CSRF-geschützt)
│       ├── activities/route.js # Aktivitäten CRUD (CSRF-geschützt)
│       ├── flights/route.js    # Flüge CRUD mit AeroDataBox Integration (CSRF-geschützt)
│       ├── currency/route.js   # Multi-Währung → JPY (EUR, USD, GBP, CHF; frankfurter.app API)
│       ├── users/route.js      # Standort-Updates
│       ├── users/delete/route.js # Account-Löschung (inkl. Freunde-Benachrichtigung)
│       ├── share/route.js      # Freundesystem (Einladungen/Freundschaftsanfragen, CSRF-geschützt)
│       ├── share-target/route.js # PWA Share Target für OS-Level Content-Sharing (JSON/Text/URL)
│       ├── geocode/route.js    # Geocoding (Nominatim/OpenStreetMap)
│       ├── weather/route.js    # Wetter-Proxy (OpenWeatherMap, 10min In-Memory Cache, ~1km Grid)
│       ├── health/route.js     # Health-Check Endpoint
│       ├── export/route.js     # Daten-Export (JSON/CSV) mit Web Share API — authentifiziert
│       ├── export/calendar/route.js # Kalender-Export (.ics) mit Uhrzeiten-Support
│       ├── import/route.js     # Daten-Import (JSON) mit Duplikat-Erkennung (CSRF-geschützt)
│       ├── packing/route.js    # Packliste CRUD (toggle/add/delete/reset, CSRF-geschützt)
│       └── webpush/route.js    # Web Push Subscriptions CRUD + VAPID Public Key
├── components/                 # React-Komponenten (alle .jsx, Client Components)
│   ├── Dashboard.jsx           # Dashboard-Übersicht: Countdown, Wetter, nächste Aktivitäten/Hotels/Flüge, Quick-Actions
│   ├── Map.jsx                 # Leaflet-Karte mit Markern (Hotels, Aktivitäten, Flüge, User), Wetter-Anzeige, Marker-Filter, Online-Counter
│   ├── HotelsList.jsx          # Hotel-Verwaltung mit CRUD
│   ├── ActivitiesList.jsx      # Aktivitäten mit Sortierung nach Nähe, Uhrzeit-Feld
│   ├── FlightsList.jsx         # Flugverwaltung mit AeroDataBox Integration (Outbound/Return, Echtzeit-Status)
│   ├── TravelPlanning.jsx      # "Reiseplanung"-Tab: Segmented Control (Hotels | Aktivitäten | Flüge)
│   ├── CurrencyConverter.jsx   # Währungsrechner mit Multi-Währungs-Selector
│   ├── Phrasebook.jsx          # Japanische Phrasen-Sammlung
│   ├── Layout.jsx              # App-Shell: Fixed 3-Zonen-Layout (Header | Content | TabBar), Logo-Navigation, Badge-Counts, 5 Tabs
│   ├── LoginForm.jsx           # Anmelde-/Registrierungsformular
│   ├── ProfileModal.jsx        # Benutzerprofil, Einstellungen, Push-Status/Deaktivierung, Export/Import, Onboarding-Reset
│   ├── ShareListModal.jsx      # Freunde-Verwaltung (Freundschaftsanfragen senden/empfangen)
│   ├── AddressInput.jsx        # Adresseingabe mit Geocoding
│   ├── GlobalSearch.jsx        # Globale Suche über Hotels, Aktivitäten, Flüge, Phrasen, Packliste & Knigge mit Suchhistorie (localStorage)
│   ├── Toast.jsx               # Toast-Benachrichtigungen (success/error/info, Swipe-to-Dismiss, Auto-Dismiss)
│   ├── ConfirmDialog.jsx       # Bestätigungsdialog
│   ├── ErrorBoundary.jsx       # React Error Boundary
│   ├── OfflineIndicator.jsx    # Offline-Status-Anzeige
│   ├── PullToRefresh.jsx       # Pull-to-Refresh Geste (Touch-basiert, mit Resistance-Kurve)
│   ├── DiscoverHub.jsx         # "Entdecken"-Tab: Segmented Control (Wörterbuch | Knigge)
│   ├── PackingList.jsx         # Interaktive Japan-Packliste mit Kategorien, Custom Items, Progress-Bar, Freunde-Sync, Auto-Disable ohne Freunde
│   ├── EtiquetteGuide.jsx      # Japan Knigge — Akkordeon mit Do/Don't Regeln (5 Sektionen), Such-Highlight-Support
│   ├── NotificationPrompt.jsx  # Push-Benachrichtigungs-Berechtigung (Banner, 8s Delay, localStorage Dismiss)
│   ├── Onboarding.jsx          # Spotlight-Overlay Onboarding (7 Schritte, Tab-Highlights, localStorage-Flag)
│   ├── WelcomeModal.jsx        # Willkommens-Modal für neue Nutzer nach Registrierung mit Onboarding-Trigger
│   └── TimelineView.jsx        # Chronologische Timeline-Ansicht für Aktivitäten + Hotels + Flüge (nach Datum + Uhrzeit sortiert)
├── lib/                        # Server-Side & Client Utilities
│   ├── db.js                   # Datenbank (SQLite) — Tabellen, Migrationen, CRUD, bcrypt
│   ├── mailer.js               # E-Mail-Versand via nodemailer (Passwort-Reset, Willkommensmail, Account-Änderungen)
│   ├── auth.js                 # Server-Side Auth-Helpers (getCurrentUser, requireAuth, Session-Cookies) — nutzt next/headers cookies()
│   ├── withAuth.js             # Zentrales Auth + CSRF Middleware (checkAuth, checkCSRF)
│   ├── csrf.js                 # CSRF-Token Generierung/Validierung (Double Submit Cookie)
│   ├── apiClient.js            # Client-Side API Fetch Helper — automatische CSRF-Token-Inklusion (apiFetch, apiPost, apiPut, apiDelete, apiGet)
│   ├── sanitize.js             # Input-Sanitization (XSS-Schutz, Strip-Tags)
│   ├── rateLimit.js            # Rate Limiting (Token Bucket, in-memory)
│   ├── haptics.js              # Haptic Feedback (hapticLight, hapticMedium, hapticSuccess, hapticError) — Vibration API mit Fallback
│   ├── phrases.js              # Zentralisierte Phrasebook-Daten (9 Kategorien, ~90 Phrasen: DE/JP/Romaji)
│   ├── packingList.js          # Statische Packlisten-Daten (6 Kategorien, ~70 Items) — Client-Side ES Module
│   ├── etiquette.js            # Statische Etiquette-Daten (5 Sektionen, Do/Don't) — Client-Side ES Module
│   ├── aerodataboxClient.js    # AeroDataBox API Client (Live-Flugstatus, 4h Cache, Rate-Limited 1 req/sec) — ES Module
│   ├── webpush.js              # Web Push Utility (sendPushToUser, sendPushToUsers) — CommonJS, web-push lib
│   └── utils.js                # Kleine Hilfsfunktionen (capitalizeUsername etc.)
├── store/                      # Zustand Stores (Client-Side State)
│   ├── authStore.js            # Auth-Status, Session, Login/Logout
│   ├── locationStore.js        # GPS-Position, Socket.io Verbindung, Online-Counter
│   ├── toastStore.js           # Toast-Benachrichtigungen State (addToast, removeToast)
│   └── themeStore.js           # Dark/Light Mode (persist middleware)
├── public/
│   ├── manifest.json           # PWA Manifest
│   ├── sw.js                   # Service Worker (LRU Tile-Cache, API-Exclusion, Push Events)
│   └── icons/                  # App-Icons (72–512px)
├── data/                       # SQLite-Datenbank-Dateien (gitignored im Betrieb)
├── server.js                   # Custom HTTP-Server: Next.js + Socket.io + Echtzeit-Daten-Sync
├── next.config.js              # Next.js Config (Security-Headers, CSP, better-sqlite3)
├── tailwind.config.js          # Tailwind mit iOS Farben, Radii, Animationen
├── Dockerfile                  # Multi-Stage Docker Build (node:20-alpine)
├── docker-compose.yml          # Docker Compose mit SQLite Volume
└── deploy.sh                   # Deployment-Script: rsync + Docker rebuild auf Server
```

---

## Architektur-Konventionen

### Allgemein
- **SPA-artiges Verhalten**: Die gesamte App läuft auf einer einzigen Seite (`app/page.jsx`) mit Tab-Navigation
- **Fixed 3-Zonen-Layout**: `Layout.jsx` nutzt `fixed inset-0` + Flexbox: Header (flex-shrink-0), Content (flex-1 min-h-0 overflow-auto), TabBar (flex-shrink-0)
- **Logo-Navigation**: Klick auf das NipponGo-Logo im Header navigiert zurück zum Dashboard
- **Client Components**: Alle Komponenten in `components/` verwenden `'use client'` oder werden vom Client importiert
- **Server-Side**: Nur `app/api/` Routes und `lib/` (außer `apiClient.js`, `auth.js`, `packingList.js`, `etiquette.js` und `aerodataboxClient.js`) laufen serverseitig
- **Kein TypeScript**: Reines JavaScript mit JSDoc-Kommentaren; `@types/*` Pakete nur für Editor-Unterstützung

### Datenbank (`lib/db.js`)
- SQLite via `better-sqlite3` — synchrone API, kein ORM
- Tabellen: `users`, `sessions`, `hotels` (inkl. `check_in_time`, `check_out_time`), `activities` (inkl. `planned_time`), `flights` (Outbound/Return mit AeroDataBox-Feldern), `kv_store`, `invitations`, `user_packing_items`, `push_subscriptions`
- Indizes auf: `sessions(expires_at)`, `hotels(user_id)`, `activities(user_id)`, `flights(user_id)`, `invitations(from_user_id, to_user_id)`, `user_packing_items(user_id)`, `push_subscriptions(user_id)`, `push_subscriptions(endpoint)`
- `initDatabase()` erstellt Tabellen und führt Migrationen durch
- `migrateFromJson()` migriert von einer älteren JSON-basierten Datenspeicherung
- Alle DB-Funktionen sind als CommonJS-`module.exports` exportiert
- **Account-Löschung**: `deleteUserAccount(userId)` entfernt alle Nutzerdaten aus der DB via Transaktion und liefert Freundes-IDs zurück, damit diese Echtzeit-Updates erhalten.
- **bcrypt**: `BCRYPT_ROUNDS = 12` — neue Registrierungen nutzen 12 Runden; bestehende Hashes werden beim Login automatisch aufgewertet via `needsHashUpgrade()` / `upgradePasswordHash()`
- **Session-Cleanup**: `cleanupExpiredSessions()` läuft automatisch alle 6 Stunden per `setInterval`

### Auth-Helpers (`lib/auth.js`)
- Server-Side Auth-Modul; nutzt `cookies()` aus `next/headers`
- `getCurrentUser()` — liest `session_token` Cookie, gibt User-Objekt oder `null` zurück
- `requireAuth()` — wirft Error bei fehlendem Login
- `createSessionCookie(token)` / `clearSessionCookie()` — Cookie-Konfigurationsobjekte
- Verwendet ES Modules (`import`/`export`)

### Sicherheit

#### CSRF-Schutz (Double Submit Cookie)
- **Server**: `lib/withAuth.js` exportiert `checkAuth()` und `checkCSRF()` — wird in API-Routes für POST/PUT/DELETE geprüft
- **Client**: `lib/apiClient.js` exportiert `apiFetch()`, `apiPost()`, `apiPut()`, `apiDelete()`, `apiGet()` — fügt automatisch CSRF-Token in state-changing Requests ein
- **Alle Frontend-Mutations** (in `HotelsList.jsx`, `ActivitiesList.jsx`, `ShareListModal.jsx`) senden CSRF-Tokens in den Fetch-Headers
- Der `csrf_token`-Cookie wird beim Login gesetzt (nicht httpOnly, damit der Client ihn lesen kann)

#### Weitere Sicherheitsmechanismen
- **Input-Sanitization**: `lib/sanitize.js` — HTML-Tags entfernen, Länge begrenzen, Number/Coordinate-Validation
- **Rate Limiting**: `lib/rateLimit.js` — Token Bucket auf Auth-Endpunkten
- **Session-Cookies**: `httpOnly: true`, `sameSite: 'lax'`, `secure` in Produktion, 30 Tage Gültigkeit
- **Content Security Policy**: Strenge CSP-Headers in `next.config.js`
- **Socket.io**: Authentifizierung via Session-Token (aus Handshake-Cookies), Rate Limiting auf Location-Updates
- **Row-Level Security**: Alle CRUD-Operationen prüfen `userId`-Zugehörigkeit

### API Routes
- Next.js App Router Format: `export async function GET/POST/PUT/DELETE(request)`
- Auth via Session-Cookie (`session_token`, httpOnly)
- CSRF-Schutz für alle state-changing Requests (POST/PUT/DELETE) via `checkCSRF()` aus `lib/withAuth.js`
- Rate Limiting auf Auth-Endpunkten (Token Bucket, in-memory)
- **Weather-Route** (`/api/weather`): Proxy für OpenWeatherMap mit 10min In-Memory-Cache, Grid-basierte Cache-Deduplizierung (~1km Auflösung), 5s Timeout
- **Frontend-Mutations müssen immer CSRF-Token in den Headers haben** — bevorzugt über `apiClient.js` (Import von `lib/apiClient.js`)

### Echtzeit (Socket.io) & Daten-Synchronisation
- `server.js` startet einen Custom HTTP-Server mit integriertem Socket.io
- **Standort-Events**: `authenticate`, `location-update`, `user-location`, `user-disconnected`, `users-update`, `stats-update`
- **Daten-Sync-Events** (Real-Time):
  - `data-changed` — Client emittiert nach CRUD-Operationen; Server broadcastet an alle Freunde → TanStack Query Invalidierung (`hotels`, `activities`, `invitations`)
  - `share-removed` — Server emittiert wenn Sharing aufgehoben wird → Cleanup und Query-Invalidierung
- Standort-Sharing nur mit „Freunden" (über Einladungssystem), Fremde sehen maskierte Daten (lat/lon: null)
- **Offline-Freunde**: Server sendet letzte bekannte Position für Freunde, die offline sind (`getLastKnownLocations`)
- **Globale Socket-Referenz**: `global.__io` und `global.__connectedUsers` in `server.js`, damit API-Routes Events emittieren können
- **Singleton-Socket auf Client**: `getSocket()` in `page.jsx` erstellt eine einzige Socket-Instanz (exportiert für Child-Components)
- **`emitDataChanged(type)`**: Callback aus `page.jsx`, übergeben an `HotelsList` und `ActivitiesList` zum Auslösen von Echtzeit-Sync

### TanStack Query
- `QueryClient` in `page.jsx` mit `staleTime: 5000` (verhindert Blink-Effekte)
- Hotels, Activities und Invitations werden als Queries verwaltet
- Fallback-Polling: `refetchInterval: 30000` (Hotels/Activities), `refetchInterval: 15000` (Invitations)
- Socket.io Events triggern sofortige Invalidierung (`qClient.invalidateQueries`)

### GlobalSearch (`GlobalSearch.jsx`)
- Globale Suche über Hotels, Aktivitäten, Phrasebook-Phrasen, Packlisten-Items und Knigge-Sektionen
- Mindestens 2 Zeichen nötig, max 5 Ergebnisse pro Kategorie
- **Suchhistorie**: Letzte 10 Suchanfragen in `localStorage` (`nippon-search-history`), gespeichert beim Klick auf ein Ergebnis
- Historieneinträge einzeln oder komplett löschbar ("Alle löschen")
- Navigation: Klick auf Ergebnis wechselt zum entsprechenden Tab mit Highlight (über `onNavigate` Callback)
- **Entdecken-Integration**: Packlisten-Treffer navigieren zu `discover`-Tab mit `view: 'packing'` + `category`; Knigge-Treffer navigieren mit `view: 'etiquette'` + `section`
- Autofocus + Select bei Öffnen; Backdrop-Blur iOS-Style

### Toast-System (`Toast.jsx` + `store/toastStore.js`)
- Drei Typen: `success` (grün), `error` (rot), `info` (blau)
- Auto-Dismiss nach 3s (konfigurierbar), Swipe-to-Dismiss (80px Schwelle)
- Zustand-Store: `addToast(message, type, duration)`, `removeToast(id)`
- Integration in `HotelsList`, `ActivitiesList` und `Map` für CRUD-Feedback
- Fixed Position über TabBar (bottom: 80px)

### Haptic Feedback (`lib/haptics.js`)
- `hapticLight()` (10ms), `hapticMedium()` (25ms), `hapticSuccess()` (Pattern), `hapticError()` (Pattern)
- Nutzt Vibration API mit `try/catch` Fallback (iOS Safari unterstützt keine Vibration API)
- Integriert in Tab-Wechsel, CRUD-Operationen und Tile-Download

### Map-Komponente (`Map.jsx`)
- **Leaflet direkt** (kein react-leaflet Wrapper) — `L` wird per `require('leaflet')` geladen, nur im Browser
- Leaflet CSS wird global in `globals.css` importiert (Turbopack-kompatibel)
- **Karten-Provider**: OpenStreetMap DE (`tile.openstreetmap.de`) für verlässliche deutsche Lokalisierung weltweit
- **Wetter-Anzeige**: Temperatur + Icon am oberen rechten Rand; Daten von `/api/weather`, 10min Refresh
- **Online-Counter**: Grüner Badge oben rechts zeigt Anzahl online verbundener Nutzer
- **Marker-Filter**: Popup-basierte Filterung nach Kategorie (Hotels, Tempel, Restaurant, Shopping, etc.) mit Zähler-Badges
- **Custom Marker Icons**: `createMarkerIcon()` (Drop-Pin-Form) und `createUserMarkerIcon()` (Pulsierender Kreis mit Initialen)
- **Offline-User-Marker**: Graue Marker für offline Freunde mit "Zuletzt gesehen"-Info
- **Google Maps Navigation**: Popups sowie Listen-Einträge (Aktivitäten/Hotels) enthalten "Route starten"-Links und einen "Auf Karte anzeigen"-Button (sofern Daten verfügbar)
- **Offline-Karten-Download**: Tile-Caching für den sichtbaren Kartenbereich (Zoom 10–16), Fortschrittsanzeige, Abbruch-Funktion, Storage API **Quota-Limit (5GB)** mit UI-Feedback
- **Stabile Marker-Dependencies**: `hotelIds`/`activityIds` als `useMemo`-basierte Dependency-Keys für zuverlässige Marker-Aktualisierung

### Pull-to-Refresh (`PullToRefresh.jsx`)
- Touch-basierter Pull-to-Refresh-Wrapper
- Resistance-Kurve ab 80px Schwellenwert mit maximal 120px Pull-Distanz
- Animiertes Refresh-Icon (Lucide `RefreshCw`)
- Wraps um scrollbare Listen (`HotelsList`, `ActivitiesList`)

### Styling
- Tailwind CSS mit iOS-spezifischem Design-System:
  - Farben: `ios-blue`, `ios-green`, `ios-red`, `ios-orange`, `ios-indigo`, `ios-purple` + `ios-gray-50` bis `ios-gray-950`
  - Border-Radii: `rounded-ios`, `rounded-ios-lg`, `rounded-ios-xl`
  - Schatten: `shadow-ios`, `shadow-ios-lg`
  - Animationen: `animate-fade-in`, `animate-slide-up`, `animate-scale-in`
- Dark Mode via `class`-Strategie (Toggle in `themeStore.js`)
- **Dark-Mode-Flash-Fix**: Blocking Inline-Script in `layout.jsx` liest `theme-storage` aus localStorage und setzt `dark`-Klasse vor React-Hydration
- System-Schrift-Stack: `-apple-system, BlinkMacSystemFont, SF Pro Text, ...`
- **Backdrop-Blur**: `backdrop-blur-ios` für glasmorphe Header/TabBar

### Tab-Struktur (5 Tabs)
| Tab | Icon | Inhalt | Auth |
|-----|------|--------|------|
| Reiseplanung | ClipboardList | Segmented: Hotels \| Aktivitäten \| Flüge (`TravelPlanning.jsx`) | ja |
| Timeline | CalendarDays | Chronologische Ansicht (`TimelineView.jsx`) | ja |
| Dashboard | Home | Reiseübersicht mit Countdown, Wetter, Kartenvorschau, nächsten Events (`Dashboard.jsx`) | teilweise* |
| Packliste | Package | Interaktive Packliste (`PackingList.jsx`) | ja |
| Entdecken | BookOpen | Segmented: Wörterbuch \| Knigge \| Währung (`DiscoverHub.jsx`) | nein |

*Dashboard ist für alle sichtbar, zeigt aber mehr Inhalte für authentifizierte Nutzer

**Hinweis**: Die Karte (`Map.jsx`) ist als Vorschau im Dashboard eingebettet, hat aber keinen eigenen Tab. Der Währungsrechner (`CurrencyConverter.jsx`) ist im Entdecken-Tab unter dem Segment "Währung" auffindbar.

### Dashboard-Tab (`Dashboard.jsx`)
- **Reise-Countdown**: Tage bis zum nächsten Flug/Hotel/Aktivität
- **Wetter-Widget**: Aktuelle Wetterlage am Standort oder Reiseziel
- **Nächste Events**: Vorschau auf kommende Hotels, Aktivitäten und Flüge (max. 3 pro Kategorie)
- **Quick-Actions**: Direktlinks zu häufigen Aufgaben (Neuer Eintrag, Export, etc.)
- **Freundschaftsanfragen**: Badge-Indikator für ausstehende Einladungen
- Zeigt Login-Prompt für nicht-authentifizierte Nutzer bei geschützten Bereichen

### Reiseplanung-Tab (`TravelPlanning.jsx`)
- Segmented Control mit Hotels | Aktivitäten | Flüge
- Akzeptiert `initialView` für Such-Navigation (z.B. `view: 'hotels'`, `view: 'activities'` oder `view: 'flights'`)
- Props werden an `HotelsList`, `ActivitiesList` und `FlightsList` durchgereicht

### Entdecken-Tab (`DiscoverHub.jsx`)
- Tab "Entdecken" (BookOpen-Icon) mit Segmented Control für zwei Unter-Bereiche: **Wörterbuch** und **Knigge**
- Akzeptiert `initialView`, `highlightTarget`, `onHighlightDone` Props für Such-Navigation

### Packliste (`PackingList.jsx`) — Eigenständiger Tab
- Interaktive Japan-Reise-Checkliste (zuvor im Entdecken-Tab)
  - Statische Default-Items aus `lib/packingList.js` (6 Kategorien: Dokumente, Kleidung, Elektronik, Hygiene, Reiseapotheke, Sonstiges, ~70 Items)
  - User-spezifischer Check-Status wird in DB-Tabelle `user_packing_items` gespeichert (erst bei erstem Toggle)
  - Custom Items können pro Kategorie hinzugefügt/gelöscht werden (`is_custom = 1`)
  - Gesamt-Fortschrittsbalken + Kategorie-Fortschritt
  - **Gesamte Zeile klickbar** zum Abhaken (nicht nur Checkbox)
  - **Freunde-Sync**: Toggle-Button synchronisiert Check-Status mit Freunden; Freunde-Namen werden unter Items angezeigt; Preference in `localStorage` (`packing-sync-enabled`) persistiert; API: `/api/packing?sync=true` liefert `friendItems` via `getPackingItemsForUsers()`
  - **Reset-Bestätigung**: ConfirmDialog vor dem Zurücksetzen; bei aktivem Sync enthält die Nachricht den Hinweis, dass nur eigene Häkchen entfernt und die Synchronisierung beendet wird
  - Optimistic Updates via TanStack Query
  - PullToRefresh-Support
  - Akzeptiert `highlightCategory` + `onHighlightDone` Props für Such-Navigation
  - API: `/api/packing` (GET/POST/DELETE, CSRF-geschützt)
- **Knigge** (`EtiquetteGuide.jsx`): Statischer Japan-Etiquette-Guide
  - Daten in `lib/etiquette.js` (5 Sektionen: Onsen, U-Bahn, Restaurant, Tempel, Allgemein)
  - Jede Regel als Do/Don't Paar mit visuellen Markern (grün/rot)
  - Akkordeon-UI mit japanischen Untertiteln und Intro-Text
  - Akzeptiert `highlightSection` + `onHighlightDone` Props — auto-expand + scroll-to mit Ring-Animation
  - Komplett offline-fähig (keine API nötig)

### Push-Benachrichtigungen (Web Push API)
- **VAPID-Keys**: Umgebungsvariablen `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` (in `.env` und `docker-compose.yml`)
- **Server-Side**: `lib/webpush.js` (CommonJS) — `sendPushToUser(userId, payload)`, `sendPushToUsers(userIds, payload)`, automatische Bereinigung ungültiger Subscriptions (410 Gone)
- **API**: `/api/webpush` (GET: VAPID Public Key + Status; POST: Subscription speichern; DELETE: Subscription löschen)
- **DB-Tabelle**: `push_subscriptions` mit `endpoint` (UNIQUE), `auth_key`, `p256dh_key` pro User
- **Service Worker**: `push` Event → `showNotification()`, `notificationclick` Event → Focus/Open App
- **UI**: `NotificationPrompt.jsx` — Banner über TabBar, erscheint 8s nach Login für Nutzer die noch nicht entschieden haben, Dismiss in `localStorage`
- **Einstellungen**: `ProfileModal.jsx` zeigt Push-Status (granted/denied/default/disabled/unsupported) mit kontextabhängigen Buttons: „Aktivieren", „Prüfen", „Deaktivieren"; bei `denied` Hinweis auf Browser-Einstellungen
- **Push deaktivieren**: Unsubscribe im Browser + DELETE `/api/webpush` auf Server, Status wechselt auf 'disabled'
- **Auslöser**:
  - Neue Einladung → Push an eingeladenen User
  - Einladung angenommen → Push an Einladenden
  - Freundschaft beendet → Push an den anderen User
  - Daten-Änderung (Hotels/Aktivitäten/Packliste) → Push an offline Freunde mit differenziertem Wording (z.B. „User hat eine Aktivität hinzugefügt: Titel")
  - **Eigene Benachrichtigungen werden unterdrückt** (Auslöser erhält keinen Push)
- **iOS-Hinweis**: Web Push wird seit iOS 16.4+ in PWAs unterstützt (Standalone-Modus erforderlich)

### Phrasebook-Daten (`lib/phrases.js`)
- Zentrale Datenquelle für `Phrasebook.jsx` und `GlobalSearch.jsx`
- 9 Kategorien: Begrüßung, Grundlagen, Restaurant, Hotel, Shopping, Transport, Richtungen, Zahlen, Notfall
- ~90 Phrasen mit DE-Übersetzung, JP-Text, Romaji-Umschrift und Kategorie-Icon
- Komplett offline-fähig (keine externe API)

### Flugverwaltung (`FlightsList.jsx` + `lib/aerodataboxClient.js`)
- **CRUD-Operationen**: Hinzufügen, Bearbeiten, Löschen von Flügen (Outbound/Return)
- **AeroDataBox API Integration**:
  - Live-Flugstatus-Abfrage (Abflug-/Ankunftszeiten, Verspätungen, Gates, Terminals)
  - Automatische Extraktion von Flugdetails aus Flugnummer + Datum
  - 4-Stunden-Cache (NodeCache) für API-Responses
  - Rate-Limiting: max. 1 Request/Sekunde (Queue-basiert)
  - Fehlerbehandlung bei ungültigen Flugnummern oder fehlenden Daten
- **Datums-Korrektur**: Behebt AeroDataBox-Datumsabweichungen für Zukunfts-Flüge via User-Datum
- **Formular**: Flugnummer (Format: XX1234), Datum (date-picker), Typ (Outbound/Return)
- **Timeline-Integration**: Flüge erscheinen chronologisch in der Timeline mit Uhrzeiten
- **Echtzeit-Sync**: Änderungen werden via Socket.io an Freunde gebroadcastet
- **Map-Integration**: Flughafen-Marker (falls Koordinaten verfügbar)
- **API**: `/api/flights` (GET/POST/DELETE, CSRF-geschützt)

### WelcomeModal (`WelcomeModal.jsx`)
- Erscheint automatisch nach erfolgreicher Registrierung (`justRegistered`-Flag in `authStore`)
- **Gradient-Border-Design**: iOS-Style mit Verlauf (blue → purple → pink)
- **App-Logo**: 192px Icon mit Sparkles-Badge
- **CTA-Buttons**:
  - „Einführung starten" → Startet Onboarding (via `resetOnboarding()`)
  - „Überspringen" → Schließt Modal ohne Onboarding
- **Auto-Cleanup**: `justRegistered`-Flag wird beim Unmount gelöscht
- **z-index: 150** (über allen anderen Overlays)

### PWA
- Service Worker in `public/sw.js`:
  - **LRU-Eviction** für Tile-Cache (max 5000 Tiles)
  - **Bulk-Tile-Download**: `cache-tiles` Message für Offline-Karten (Batch-Download mittels `.de` Tiles), inkludiert **5GB Storage Quota Limit** Logik (bricht ab bei QuotaExceeded)
  - **Externe URLs ausgenommen**: Nicht-same-origin Requests (außer Tiles) werden vom SW nicht abgefangen
  - **Sensitive Endpoints ausgeschlossen** (`/api/auth`, `/api/share`)
  - **Push Events**: `push` → `showNotification()`, `notificationclick` → Focus/Open App
  - Update-Benachrichtigungs-Banner in `page.jsx`
  - Cache-Clearing bei Logout
- Web App Manifest mit Portrait-Orientierung, Standalone-Modus
- **Share Target API**: Empfängt geteilte Inhalte vom OS (`/api/share-target`)
  - JSON-Dateien → Redirect zu Import-Flow (`/?import=shared`)
  - Text/URL-Shares → Redirect mit Query-Parametern (`?shared_title=...&shared_text=...`)
  - Multipart/form-data Support für File-Uploads
- iOS-spezifische Meta-Tags in `app/layout.jsx` (apple-mobile-web-app-capable, Splash Screens)

---

## Umgebungsvariablen

| Variable | Standard | Beschreibung |
|----------|----------|-------------|
| `DATABASE_PATH` | `./data/japan-travel-v2.db` | Pfad zur SQLite-Datenbank |
| `PORT` | `3000` | Server-Port |
| `NODE_ENV` | `development` | `development` oder `production` |
| `AERODATABOX_API_MARKET_KEY` | — | API-Schlüssel für AeroDataBox (prod.api.market) |
| `VAPID_PUBLIC_KEY` | — | Web Push VAPID Public Key (generiert via `npx web-push generate-vapid-keys`) |
| `VAPID_PRIVATE_KEY` | — | Web Push VAPID Private Key |
| `VAPID_SUBJECT` | `mailto:noreply@nippon-go.app` | VAPID Subject (mailto: oder URL) |

---

## Wichtige Hinweise

- **Custom Server**: `npm run dev` und `npm run start` verwenden `node server.js` (nicht `next dev`), da Socket.io einen Custom HTTP-Server benötigt
- **SSR-Probleme**: Die Map-Komponente wird per `dynamic(() => import(...), { ssr: false })` geladen, da Leaflet kein SSR unterstützt. Leaflet wird intern per `require('leaflet')` nur im Browser geladen.
- **Mixed Module System**: `lib/` verwendet überwiegend CommonJS (`require`/`module.exports`). Ausnahmen: `lib/apiClient.js`, `lib/auth.js`, `lib/packingList.js`, `lib/etiquette.js` und `lib/aerodataboxClient.js` nutzen ES Modules (werden Client-seitig bzw. in App Router importiert). Komponenten und `app/` verwenden ES Modules (`import`/`export`).
- **Datenbank-Sicherheit**: Alle CRUD-Operationen prüfen `userId`-Zugehörigkeit (Row-Level Security in der Anwendungsschicht)
- **Path Alias**: `@/*` → Projekt-Root (konfiguriert in `jsconfig.json`)
- **CSRF bei neuen API-Mutations**: Jede neue Frontend-Komponente die POST/PUT/DELETE nutzt sollte `import { apiPost, apiPut, apiDelete } from '../lib/apiClient'` verwenden.
- **Layout-System**: Das Layout ist ein festes 3-Zonen-System. Child-Komponenten sollten **kein** `pb-20` oder ähnliches Bottom-Padding nutzen (max `pb-8`), da die TabBar nicht überlappt. Die Map nutzt `h-full` um die Content-Zone auszufüllen.
- **Echtzeit-Sync**: Bei CRUD-Operationen in Listen-Komponenten muss `emitDataChanged(type, action, title)` aufgerufen werden (Prop von `page.jsx`), damit andere verbundene Nutzer die Änderung sofort sehen. `action` ist 'add'|'edit'|'delete'|'complete', `title` der Anzeigename für Push-Benachrichtigungen.
- **Leaflet CSS**: Wird global in `globals.css` importiert (nicht per Leaflet-Paket-Import), für Turbopack-Kompatibilität.
- **Freunde-Wording**: Das ehemalige „Listen teilen"-Feature heißt jetzt „Freunde" (ShareListModal, ProfileModal, NotificationPrompt, share API). „Einladungen" → „Freundschaftsanfragen".
- **Aktivitäten-Uhrzeit**: `activities`-Tabelle hat `planned_time` Spalte (Migration via `PRAGMA table_info` + `ALTER TABLE`). Im Formular als `<input type="time">`, in TimelineView chronologisch sortiert (Datum + Uhrzeit).
- **Swipe-Navigation**: Deaktiviert — keine Touch-Handler für Tab-Wechsel mehr (alle entfernt).
- **PWA-Neulade**: `ProfileModal.jsx` enthält Button zum Cache-Clearing + App-Neustart (Service Worker deregistrieren, Caches löschen, `window.location.reload()`).
- **App-Reset nach Logout**: `authStore.js` → `logout()` deregistriert Service Worker, löscht Caches und lädt die App neu (gleiche Logik wie „App neu laden").
- **Hotel-Uhrzeiten**: `hotels`-Tabelle hat `check_in_time` und `check_out_time` Spalten (Migration via `PRAGMA table_info` + `ALTER TABLE`). Im Formular als `<input type="time">`, in TimelineView und Kalender-Export mit Uhrzeiten.
- **Daten-Import**: `POST /api/import` akzeptiert JSON-Export-Format, fügt Hotels und Aktivitäten HINZU (Duplikat-Erkennung: gleicher Name/Titel + gleiche Check-in-Datum/Planned-Date → Überspringen). UI in `ProfileModal.jsx` mit File-Input.
- **Daten-Export**: Nutzt Web Share API (`navigator.share({ files })`) auf iOS/Android, Fallback auf `<a download>` für Desktop.
- **Kalender-Export**: `.ics`-Datei unterstützt `planned_time` für Aktivitäten (DTSTART/DTEND mit Uhrzeit statt nur DATE). Wird via Share API oder als Download angeboten.
- **Onboarding**: `Onboarding.jsx` — Spotlight-Overlay mit 5 Schritten (ein Schritt pro Tab), SVG-Mask für Spotlight-Cutout, `data-onboarding` Attribute an Tab-Buttons, `localStorage`-Flag `nippon-onboarding-completed`. „Einführung wiederholen"-Button in `ProfileModal.jsx`.
- **WelcomeModal**: Erscheint automatisch nach Registrierung (`justRegistered`-Flag in authStore), bietet Onboarding-Start an. Nutzt `resetOnboarding()` aus `Onboarding.jsx`.
- **Packlisten-Sync Auto-Disable**: Sync wird automatisch deaktiviert wenn keine Freunde vorhanden. Sync-Button ist ausgegraut ohne Freunde mit Tooltip-Hinweis.
- **GlobalSearch Navigation**: Hotel-Treffer → `planning` Tab, Aktivitäten → `planning` Tab, Flüge → `planning` Tab (view: 'flights'), Packliste → `packing` Tab, Phrasen → `discover` Tab, Knigge → `discover` Tab.
- **Flights AeroDataBox**: API-Calls sind rate-limited (1 req/sec Queue), gecacht (4h), und können fehlschlagen (ungültige Flugnummer, keine Daten). UI zeigt Fallback-Daten (nur User-Input) bei API-Fehler.
- **Share Target**: Manifest muss `share_target` Entry haben für OS-Integration. Route `/api/share-target` empfängt geteilte Inhalte und redirected zur App mit Query-Parametern.
