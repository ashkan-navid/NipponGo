# NipponGo — Security Assessment Report

**Datum:** 2026-02-27
**Auditor:** Automatisiertes Security Assessment (Claude)
**Scope:** Gesamtes Repository — alle Phasen (Recon, Vulns, Remediation, Implementierung)
**Methodik:** OWASP Top 10 (2021), OWASP API Top 10 (2023), CWE-basierte Analyse

---

## Phase 1: Reconnaissance & Attack Surface Mapping

### Architektur

| Komponente | Technologie | Beschreibung |
|---|---|---|
| Web-Frontend | React 19, Next.js 16 (App Router) | SPA mit 5 Tabs, Client Components |
| API-Server | Next.js API Routes | RESTful CRUD unter `/app/api/` |
| Custom Server | Node.js HTTP + Socket.io | `server.js` für WebSocket |
| Datenbank | SQLite via `better-sqlite3` | File-basiert, WAL-Modus |
| Echtzeit | Socket.io | Standort/Daten-Sync |
| Push | Web Push API (`web-push`) | VAPID-basiert |
| Externe APIs | OpenWeatherMap, AeroDataBox, Nominatim, Frankfurter.app | Wetter, Flüge, Geo, Währung |
| E-Mail | Nodemailer | Willkommensmails, Passwort-Reset |
| PWA | Service Worker | Offline-Tile-Cache, Share Target |

### Entry Points

| Endpoint | Methoden | Auth | CSRF | Rate-Limit |
|---|---|---|---|---|
| `/api/auth` | POST/PUT/DELETE/GET | Nein/Ja | Nein | Ja (10/15min) |
| `/api/hotels` | CRUD | Ja | Ja | **Nein** |
| `/api/activities` | CRUD | Ja | Ja | **Nein** |
| `/api/flights` | GET/POST/DELETE | Ja | Ja | Ja |
| `/api/share` | CRUD | Ja | Ja | Ja (invite) |
| `/api/packing` | GET/POST/DELETE | Ja | Ja | **Nein** |
| `/api/geocode` | GET | Ja | Nein | Ja |
| `/api/weather` | GET | **Nein** | Nein | Ja |
| `/api/currency` | GET | **Nein** | Nein | **Nein** |
| `/api/export` | GET | Ja | Nein | **Nein** |
| `/api/import` | POST | Ja | Ja | **Nein** |
| `/api/users/delete` | POST | Ja | Ja | **Nein** |
| `/api/webpush` | GET/POST/DELETE | Ja | Ja | **Nein** |
| `/api/share-target` | POST | Optional | **Nein** | **Nein** |
| `/api/health` | GET | Nein | Nein | **Nein** |
| Socket.io | Events | Ja (Cookie) | N/A | Ja (per-event) |

---

## Phase 2: Vulnerability Findings

### VULN-001 — SSRF via Geocode `resolve-url` Endpoint

| Feld | Wert |
|---|---|
| **Schweregrad** | **Critical** |
| **Datei** | `app/api/geocode/route.js:98-109` |
| **OWASP** | A10:2021 — Server-Side Request Forgery |
| **CWE** | CWE-918 |

**Beschreibung:** Der `resolve-url` Action-Handler führt einen serverseitigen `fetch()` auf eine vom Benutzer bereitgestellte URL aus, ohne jegliche Einschränkung auf Ziel-Domains oder Protokolle.

**Proof of Concept:**
```bash
# Interne Metadata-Abfrage (Cloud-Umgebung)
curl -b "session_token=VALID" \
  "https://app.example.com/api/geocode?action=resolve-url&url=http://169.254.169.254/latest/meta-data/"

# Lokale Dienste scannen
curl -b "session_token=VALID" \
  "https://app.example.com/api/geocode?action=resolve-url&url=http://localhost:3000/api/health"

# Interne Netzwerk-Enumeration
curl -b "session_token=VALID" \
  "https://app.example.com/api/geocode?action=resolve-url&url=http://192.168.1.1/"
```

**Impact:** Ein authentifizierter Angreifer kann beliebige HTTP-Requests vom Server ausführen — interne Dienste scannen, Cloud-Metadaten exfiltrieren, oder als Proxy für weitere Angriffe dienen.

---

### VULN-002 — Rate-Limiting Bypass via IP-Header-Spoofing

| Feld | Wert |
|---|---|
| **Schweregrad** | **High** |
| **Datei** | `lib/rateLimit.js:40-56` |
| **OWASP** | A07:2021 — Identification and Authentication Failures |
| **CWE** | CWE-346 |

**Beschreibung:** `getClientIP()` vertraut bedingungslos dem `X-Forwarded-For` Header. Ein Angreifer kann durch Spoofing dieser Header das Rate-Limiting für Auth-Endpunkte (Brute-Force) und alle anderen rate-limited Endpoints umgehen.

**Proof of Concept:**
```bash
# Brute-Force-Login mit wechselnden IPs
for i in $(seq 1 1000); do
  curl -X POST https://app.example.com/api/auth \
    -H "X-Forwarded-For: 10.0.0.$((i % 255))" \
    -H "Content-Type: application/json" \
    -d '{"username":"target","password":"attempt'$i'"}'
done
```

**Impact:** Vollständiger Bypass des Brute-Force-Schutzes, was zu Account-Übernahme via Credential-Stuffing führen kann.

---

### VULN-003 — Fehlende Sanitization in Activity-Erstellung

| Feld | Wert |
|---|---|
| **Schweregrad** | **High** |
| **Datei** | `app/api/activities/route.js:100-110` |
| **OWASP** | A03:2021 — Injection |
| **CWE** | CWE-20 |

**Beschreibung:** Beim Erstellen von Aktivitäten (`POST /api/activities`) wird zwar Zod-Validation durchgeführt, aber die `sanitizeActivityInput()` Funktion aus `lib/sanitize.js` wird NICHT aufgerufen. Die Daten gehen direkt an die DB.

```javascript
// activities/route.js:100-110 — sanitizeActivityInput() wird NICHT aufgerufen
const activity = db.createActivity(user.id, {
    title: data.title,           // Nicht sanitized!
    description: data.description || '',  // Nicht sanitized!
    type: data.type || 'other',
    // ...
}, user.username);
```

Im Vergleich: `hotels/route.js:89` ruft korrekt `sanitizeHotelInput(parsed.data)` auf.

**Impact:** Überlange Strings, Steuerzeichen oder HTML können in die Datenbank gelangen und bei der Darstellung in Leaflet-Popups (die HTML-String-Interpolation nutzen) zu Stored XSS führen.

---

### VULN-004 — Stored XSS via Leaflet-Popup-HTML-Injection

| Feld | Wert |
|---|---|
| **Schweregrad** | **High** |
| **Datei** | `components/Map.jsx` (Popup-Konstruktion) |
| **OWASP** | A03:2021 — Injection |
| **CWE** | CWE-79 |

**Beschreibung:** Leaflet-Popups werden via String-Interpolation aufgebaut. Während `escapeHtml()` für Textinhalte verwendet wird, werden URL-Parameter wie `mapsUrl` direkt aus Koordinaten konstruiert, und die `escapeHtml()`-Funktion wird nicht in allen Popup-Kontexten konsistent angewandt. In Kombination mit VULN-003 (fehlende Backend-Sanitization) könnten manipulierte Titel über das Popup gerendert werden.

**Impact:** Stored XSS gegen alle Benutzer, die die Karte anzeigen (einschließlich aller Freunde des Angreifers).

---

### VULN-005 — Push-Subscription-Löschung ohne Owner-Check

| Feld | Wert |
|---|---|
| **Schweregrad** | **High** |
| **Datei** | `app/api/webpush/route.js:77-102`, `lib/db.js:901-903` |
| **OWASP** | A01:2021 — Broken Access Control |
| **CWE** | CWE-862 |

**Beschreibung:** Die `DELETE /api/webpush` Route akzeptiert einen `endpoint` Query-Parameter und löscht die Push-Subscription direkt, ohne zu prüfen, ob die Subscription dem authentifizierten Benutzer gehört.

```javascript
// webpush/route.js:96
db.deletePushSubscription(decodeURIComponent(endpoint));

// db.js:901-903
function deletePushSubscription(endpoint) {
  getDb().prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
}
// KEINE user_id Prüfung!
```

**Proof of Concept:**
```bash
# Beliebige Push-Subscription eines anderen Users deaktivieren
curl -X DELETE -b "session_token=VALID" \
  -H "X-CSRF-Token: VALID_TOKEN" \
  "https://app.example.com/api/webpush?endpoint=https%3A%2F%2Ffcm.googleapis.com%2F...victim-token..."
```

**Impact:** Ein authentifizierter Angreifer kann Push-Benachrichtigungen anderer Benutzer deaktivieren (Denial of Service für Notifications).

---

### VULN-006 — CSRF-Token-Inkonsistenz bei Registrierung

| Feld | Wert |
|---|---|
| **Schweregrad** | **Medium** |
| **Datei** | `app/api/auth/route.js:217` |
| **OWASP** | A07:2021 — Identification and Authentication Failures |
| **CWE** | CWE-352 |

**Beschreibung:** Bei der Registrierung (Zeile 217) wird `generateCSRFToken()` OHNE `sessionToken` aufgerufen, was einen zufälligen (nicht HMAC-basierten) Token erzeugt. Die Validierung in `checkCSRF()` berechnet aber den HMAC und vergleicht. Der Random-Token matched niemals.

```javascript
// auth/route.js:217 — Token wird OHNE session.token generiert
const csrfToken = generateCSRFToken();  // Fallback: random bytes

// csrf.js:28 — ohne sessionToken → random bytes statt HMAC
function generateCSRFToken(sessionToken) {
    if (!sessionToken) return crypto.randomBytes(32).toString('hex');
    return crypto.createHmac('sha256', SECRET).update(sessionToken).digest('hex');
}
```

**Impact:** Nach Registrierung funktioniert der CSRF-Token bis zum nächsten GET-Request (der den Token per `checkAuth()` refresht) nicht korrekt, was zu 403-Fehlern bei der ersten Mutation führen kann.

---

### VULN-007 — Fehlende Rate-Limits auf CRUD-Endpoints

| Feld | Wert |
|---|---|
| **Schweregrad** | **Medium** |
| **Datei** | `app/api/hotels/route.js`, `app/api/activities/route.js`, `app/api/packing/route.js` |
| **OWASP** | API4:2023 — Unrestricted Resource Consumption |
| **CWE** | CWE-770 |

**Beschreibung:** Hotels, Activities, Packing-Items, Export, Import, WebPush und User-Delete haben kein Rate-Limiting. Ein Angreifer mit gültiger Session kann unbegrenzt Requests senden.

**Impact:** DoS via Resource-Exhaustion (CPU, Disk-I/O, Speicher).

---

### VULN-008 — Keine Obergrenze für Custom Packing Items

| Feld | Wert |
|---|---|
| **Schweregrad** | **Medium** |
| **Datei** | `lib/db.js:775-780`, `app/api/packing/route.js:63-75` |
| **OWASP** | API4:2023 — Unrestricted Resource Consumption |
| **CWE** | CWE-770 |

**Beschreibung:** `addCustomPackingItem()` hat keine Begrenzung für die Anzahl benutzerdefinierter Einträge. Ein Angreifer kann tausende Items erstellen.

**Impact:** SQLite-Storage-Exhaustion, langsame Queries bei Packlisten-Abruf.

---

### VULN-009 — Socket.io Payload ohne Schema-Validierung

| Feld | Wert |
|---|---|
| **Schweregrad** | **Medium** |
| **Datei** | `server.js:126-181` |
| **OWASP** | API8:2023 — Security Misconfiguration |
| **CWE** | CWE-20 |

**Beschreibung:** Das `data-changed` Socket-Event akzeptiert beliebige `type`, `action` und `title` Werte ohne Whitelist-Validierung. Diese Werte werden an Freunde weitergebroadcastet und in Push-Notifications verwendet.

**Impact:** Manipulierte Push-Notification-Inhalte, Datenintegritätsprobleme.

---

### VULN-010 — CSP erlaubt `unsafe-inline` für Scripts

| Feld | Wert |
|---|---|
| **Schweregrad** | **Medium** |
| **Datei** | `next.config.js:31` |
| **OWASP** | A05:2021 — Security Misconfiguration |
| **CWE** | CWE-693 |

**Beschreibung:** Die Production-CSP enthält `script-src 'self' 'unsafe-inline'`. Dies schwächt die XSS-Schutzwirkung der CSP erheblich, da Inline-Scripts erlaubt sind.

**Impact:** Bei einer XSS-Schwachstelle kann der Angreifer beliebige Inline-Scripts ausführen, da die CSP dies nicht blockiert.

---

### VULN-011 — Share-Target ohne CSRF-Schutz

| Feld | Wert |
|---|---|
| **Schweregrad** | **Low** |
| **Datei** | `app/api/share-target/route.js:7` |
| **OWASP** | A01:2021 — Broken Access Control |
| **CWE** | CWE-352 |

**Beschreibung:** Der Share-Target-Endpoint akzeptiert POST-Requests ohne CSRF-Validierung. Da die Route nur Redirects durchführt und keine Daten mutiert, ist der Impact gering.

**Impact:** Begrenzt — nur Redirect-Manipulation möglich.

---

### VULN-012 — Weather/Currency ohne Authentifizierung

| Feld | Wert |
|---|---|
| **Schweregrad** | **Low** |
| **Datei** | `app/api/weather/route.js`, `app/api/currency/route.js` |
| **OWASP** | API2:2023 — Broken Authentication |
| **CWE** | CWE-306 |

**Beschreibung:** Weather und Currency Endpoints erfordern keine Authentifizierung. Currency hat zudem kein Rate-Limiting. Diese Endpoints können als offene Proxies missbraucht werden.

**Impact:** API-Key-Kosten-Amplifikation bei OpenWeatherMap, DoS-Vektor.

---

## Phase 3: Remediation-Plan

| Prio | VULN-ID | Fix | Typ |
|---|---|---|---|
| **P0** | VULN-001 | SSRF: URL-Whitelist für `resolve-url` | Quick Win |
| **P0** | VULN-002 | Rate-Limit: IP-Header nur bei Trusted Proxy | Quick Win |
| **P0** | VULN-005 | Push-Delete: Owner-Check hinzufügen | Quick Win |
| **P1** | VULN-003 | Activity-Sanitization aktivieren | Quick Win |
| **P1** | VULN-006 | CSRF-Token bei Registrierung korrekt generieren | Quick Win |
| **P1** | VULN-009 | Socket-Payload Whitelist-Validierung | Quick Win |
| **P2** | VULN-007 | Rate-Limiting auf alle CRUD-Endpoints | Strategisch |
| **P2** | VULN-008 | Max Custom Packing Items Limit | Quick Win |
| **P2** | VULN-010 | CSP Nonce statt unsafe-inline | Strategisch |
| **P3** | VULN-004 | Leaflet-Popup escapeHtml Hardening | Quick Win |
| **P3** | VULN-011 | Share-Target CSRF evaluieren | Quick Win |
| **P3** | VULN-012 | Auth für Weather/Currency evaluieren | Quick Win |

---

## Phase 4: Fix-Implementierung

Siehe die entsprechenden Code-Änderungen im Commit.
