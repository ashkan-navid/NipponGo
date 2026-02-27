# Changelog — NipponGo

Alle bedeutenden Änderungen an diesem Projekt werden in dieser Datei dokumentiert.

## v2.0.0 (2026-02-25)

### Neu (Phase 1-5 Erweiterungen)
- **Gamification & Utilities**: Japan-Quiz mit 30 Fragen und Tages-Budget-Tracker (Phase 5) integriert.
- **Visuelles Design**: Skeleton-Loading, Sakura-Hero-Animation, Konfetti-Feier bei Abschluss und neues "Schnellzugriff"-Design im Dashboard mit 8 kompakten Buttons (Phase 4 & 5).
- **Proaktive Erinnerungen**: Automatisierter Push-Scheduler für Abflüge, Check-ins, Aktivitäten, Regenwarnungen und Packlisten-Tipps (Phase 3).
- **Wetter-Vorhersage**: 5-Tage-Vorhersage API mit Dashboard-Widget (Phase 2).
- **Entdecken-Erweiterung**: 8 neue/erweiterte Kategorien inkl. Kanji-Guide, Notfall-Infos, ausführlicher Japan-Info, Etikette (Ryokan, Izakaya), Konbini/Arzt-Phrasen (Phase 1).
- **Favoritensystem**: Lokale Speicherlösung für Phrasebook-Favoriten.
- **Dashboard als Startseite**: Neues Dashboard mit Reise-Countdown, Tagesübersicht und "Wusstest du schon?" Widget.
- **Short-URL Auflösung**: Google Maps Kurzlinks (maps.app.goo.gl) werden serverseitig aufgelöst.
- **Erweiterte Koordinaten-Erkennung**: Zusätzliche Muster (!3d/!4d, ?q=) für Google Maps URLs.

### Verbessert
- **Geocoding**: POI-Suche als erste Strategie für gebäudegenaue Marker.
- **Tab-Struktur**: 5 Haupt-Tabs (Reiseplanung | Timeline | Dashboard | Packliste | Entdecken), Entdecken-Tab als Hub mit 8 Unterreitern.
- **Währungsrechner**: In den Entdecken-Tab integriert.
- **Onboarding**: Aktualisiert für neue Tab-Struktur mit Dashboard.

### Entfernt
- **Echtzeit-Standortfreigabe**: Benutzer-Marker, Online-Status und Standort-Broadcasting komplett entfernt.
- **Offline-Karten-Download**: Tile-Caching und zugehörige Download-Logik entfernt.
- **Standort-API**: `/api/users` PUT-Endpoint und zugehörige Datenbankfunktionen entfernt.

---

## v1.5.0 (2026-02-24)

### Neu
- **PWABuilder-Optimierungen**: Manifest erweitert mit Shortcuts, Share Target, Background Sync, File Handlers, Protocol Handlers
- **Flüge-Integration**: AeroDataBox Auto-Sync für Flugdaten mit Echtzeit-Status
- **Screenshots**: PWA-Manifest-Screenshots für bessere App-Store-Kompatibilität
- **Periodic Background Sync**: Automatische Datenaktualisierung im Hintergrund
- **Offline Background Sync**: Automatisches Wiederholen fehlgeschlagener Requests bei Netzwerkverfügbarkeit
- **Willkommens-Popup**: Einmaliger Welcome-Screen nach Registrierung mit direktem Zugang zum Onboarding
- **Changelog-System**: Versionsverwaltung mit detaillierter Änderungshistorie

### Verbessert
- **Geocoding**: Bessere Erkennung japanischer Adressen durch japanische Sprachpriorität und Land-Filter
- **Flugzeiten-Anzeige**: Korrekte und konsistente Darstellung von Flugzeiten in Timeline und Listen
- **Button-Positionierung**: Einheitliche vertikale Ausrichtung der Action-Buttons in allen Unterreitern

### Fehlerbehebungen
- Korrekte Anzeige von Flug-Uhrzeiten in der Timeline-Ansicht (keine Timezone-Verschiebung mehr)
- Konsistente Header-Strukturen in Hotels-, Flüge- und Aktivitäten-Listen

---

## v1.2.0 (2026-02-15)

### Neu
- **Flüge-Tab**: Verwaltung von Flugdaten mit automatischer Synchronisation
- **Timeline-Ansicht**: Chronologische Übersicht aller Reise-Events
- **Packliste**: Interaktive Japan-Reise-Checkliste mit Freunde-Synchronisation

### Verbessert
- **Offline-Karten**: Verbesserter Tile-Download mit Progress-Anzeige
- **Dark Mode**: Optimierte Farbpalette für bessere Lesbarkeit

---

## v1.0.0 (2026-01-10)

### Neu
- **Initiales Release**: Hotels- und Aktivitätenverwaltung
- **Interaktive Karte**: Leaflet-basierte Karte mit OpenStreetMap
- **Freunde-System**: Teilen von Reiseplänen mit anderen Nutzern
- **Phrasebook**: Japanische Reisephrasen mit Romaji
- **Knigge**: Japan-Etiquette-Guide
- **Währungsrechner**: Multi-Währung zu JPY
- **Push-Benachrichtigungen**: Web Push API Integration
- **PWA-Support**: Offline-First mit Service Worker
