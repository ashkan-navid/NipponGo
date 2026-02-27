'use client';

import { useEffect, useRef, useState, useMemo, useCallback } from 'react';
import { Filter, X, LocateFixed } from 'lucide-react';
import useToastStore from '../store/toastStore';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';

// Dynamically import Leaflet to avoid SSR issues
let L = null;
if (typeof window !== 'undefined') {
    L = require('leaflet');
    // CSS is now imported globally in globals.css for Turbopack compatibility
}

// Escape HTML to prevent XSS in Leaflet popups
function escapeHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// Activity type definitions for filtering
const ACTIVITY_TYPES = [
    { value: 'temple', label: '⛩️ Tempel/Schrein' },
    { value: 'restaurant', label: '🍜 Restaurant' },
    { value: 'shopping', label: '🛍️ Shopping' },
    { value: 'park', label: '🌸 Park/Garten' },
    { value: 'museum', label: '🏛️ Museum' },
    { value: 'entertainment', label: '🎮 Unterhaltung' },
    { value: 'landmark', label: '🗼 Sehenswürdigkeit' },
    { value: 'other', label: '📍 Sonstiges' },
];

// Custom marker icons
const createMarkerIcon = (color, size = 32) => {
    if (!L) return null;
    return L.divIcon({
        html: `
      <div style="
        width: ${size}px; 
        height: ${size}px; 
        background: ${color}; 
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      ">
        <div style="
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          transform: rotate(45deg);
        ">
          <svg width="${size * 0.5}" height="${size * 0.5}" viewBox="0 0 24 24" fill="white" stroke="none">
            <circle cx="12" cy="12" r="5"/>
          </svg>
        </div>
      </div>
    `,
        className: 'custom-marker',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
    });
};



export default function MapComponent({ hotels = [], activities = [], focusLocation, showWeather = true, showLocateButton = true, autoLocate = false }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markersRef = useRef([]);
    const userMarkerRef = useRef(null);

    const [isMapReady, setIsMapReady] = useState(false);
    const [isLocating, setIsLocating] = useState(false);
    const [showFilterPopup, setShowFilterPopup] = useState(false);
    const [activeFilter, setActiveFilter] = useState(null);
    const [weather, setWeather] = useState(null);
    const addToast = useToastStore((s) => s.addToast);

    const { isAuthenticated, user } = useAuthStore();
    const { isDarkMode } = useThemeStore();

    // Fetch weather based on first hotel or default (Tokyo)
    useEffect(() => {
        let cancelled = false;

        // Use first hotel with coordinates, or default to Tokyo
        const firstHotelWithCoords = hotels.find(h => (h.latitude ?? h.lat) && (h.longitude ?? h.lon));
        const lat = firstHotelWithCoords ? (firstHotelWithCoords.latitude ?? firstHotelWithCoords.lat) : 35.6762;
        const lon = firstHotelWithCoords ? (firstHotelWithCoords.longitude ?? firstHotelWithCoords.lon) : 139.6503;

        const fetchWeather = async () => {
            try {
                const res = await fetch(`/api/weather?lat=${lat}&lon=${lon}`);
                if (!res.ok) return;
                const data = await res.json();
                if (!cancelled && data.temp !== null && data.temp !== undefined) {
                    setWeather(data);
                }
            } catch {
                // Silently ignore weather errors
            }
        };

        fetchWeather();
        const interval = setInterval(fetchWeather, 10 * 60 * 1000);

        return () => {
            cancelled = true;
            clearInterval(interval);
        };
    }, [hotels.length]);

    // Calculate category counts
    const categoryCounts = useMemo(() => {
        const counts = {
            hotels: hotels.filter(h => (h.latitude ?? h.lat) && (h.longitude ?? h.lon)).length,
        };

        ACTIVITY_TYPES.forEach(type => {
            counts[type.value] = activities.filter(a =>
                a.type === type.value &&
                (a.latitude ?? a.lat) &&
                (a.longitude ?? a.lon)
            ).length;
        });

        return counts;
    }, [hotels, activities]);

    // Check if any filter is active
    const hasActiveFilter = activeFilter !== null;

    // Initialize map
    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || !L) return;

        // Default to Tokyo
        const defaultCenter = [35.6762, 139.6503];

        mapInstanceRef.current = L.map(mapRef.current, {
            center: defaultCenter,
            zoom: 12,
            zoomControl: true,
        });

        // Position zoom control at bottom right
        mapInstanceRef.current.zoomControl.setPosition('bottomright');

        // Add OpenStreetMap tiles
        L.tileLayer('https://tile.openstreetmap.de/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors',
            maxZoom: 19,
        }).addTo(mapInstanceRef.current);

        setIsMapReady(true);

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    // Pan to focus location when set (from "show on map" in activities)
    useEffect(() => {
        if (!isMapReady || !focusLocation || !mapInstanceRef.current) return;
        mapInstanceRef.current.setView([focusLocation.lat, focusLocation.lon], 16, { animate: true });
    }, [isMapReady, focusLocation]);

    // Helper functions for filter styling
    const getFilterButtonClass = (typeValue) => {
        const baseClass = 'w-full flex items-center justify-between px-4 py-3 text-left text-sm transition-colors disabled:opacity-40 disabled:cursor-not-allowed';
        const activeClass = 'bg-ios-blue/10 text-ios-blue';
        const inactiveClass = 'text-ios-gray-700 dark:text-ios-gray-300 hover:bg-ios-gray-50 dark:hover:bg-ios-gray-800';

        return `${baseClass} ${activeFilter === typeValue ? activeClass : inactiveClass}`;
    };

    const getBadgeClass = (count) => {
        const baseClass = 'text-xs font-medium px-2 py-0.5 rounded-full';
        const activeClass = 'bg-ios-indigo/20 text-ios-indigo';
        const inactiveClass = 'bg-ios-gray-200 dark:bg-ios-gray-700 text-ios-gray-500';

        return `${baseClass} ${count > 0 ? activeClass : inactiveClass}`;
    };



    // Stable identity keys so the effect re-runs when the data actually changes
    const hotelIds = useMemo(() => hotels.map(h => h.id).join(','), [hotels]);
    const activityIds = useMemo(() => activities.map(a => a.id).join(','), [activities]);

    // Update hotel and activity markers (with filtering)
    useEffect(() => {
        if (!isMapReady || !L) return;
        if (!mapInstanceRef.current) return;

        // Clear old markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Helper to validate coordinates
        const isValidCoord = (lat, lon) => {
            return lat !== null && lat !== undefined &&
                lon !== null && lon !== undefined &&
                !isNaN(parseFloat(lat)) && !isNaN(parseFloat(lon));
        };

        // Helper to format date
        const formatDate = (dateStr) => {
            if (!dateStr) return '';
            return new Date(dateStr).toLocaleDateString('de-DE', {
                day: '2-digit', month: '2-digit', year: 'numeric'
            });
        };

        // Detect dark mode for popup styling
        const dark = document.documentElement.classList.contains('dark');
        const popupText = dark ? '#f5f5f7' : '#1c1c1e';
        const popupSubtext = dark ? '#a1a1a6' : '#3a3a3c';
        const popupBg = dark ? '#2c2c2e' : '#f2f2f7';

        // Add hotel markers (if not filtered out)
        if (activeFilter === null || activeFilter === 'hotels') {
            hotels.forEach(hotel => {
                const lat = hotel.latitude ?? hotel.lat;
                const lon = hotel.longitude ?? hotel.lon;

                if (!isValidCoord(lat, lon)) return;

                const marker = L.marker([parseFloat(lat), parseFloat(lon)], {
                    icon: createMarkerIcon('#FF9500', 36),
                }).addTo(mapInstanceRef.current);

                const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
                marker.bindPopup(`
                    <div style="font-family: -apple-system, system-ui, sans-serif; min-width: 240px; padding: 4px;">
                        <h3 style="margin: 0 0 8px; font-size: 16px; font-weight: 700; color: ${popupText};">${escapeHtml(hotel.name)}</h3>

                        ${hotel.address ? `
                        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                            <span style="font-size: 16px;">📍</span>
                            <span style="font-size: 13px; color: ${popupSubtext}; line-height: 1.4;">${escapeHtml(hotel.address)}</span>
                        </div>` : ''}

                        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
                            <span style="font-size: 16px;">📅</span>
                            <span style="font-size: 13px; color: ${popupSubtext}; font-weight: 500;">
                                ${formatDate(hotel.check_in_date || hotel.check_in)} - ${formatDate(hotel.check_out_date || hotel.check_out)}
                            </span>
                        </div>

                        ${hotel.notes ? `
                        <div style="margin-bottom: 12px; padding: 10px; background: ${popupBg}; border-radius: 8px;">
                            <p style="margin: 0; font-size: 13px; color: ${popupSubtext}; font-style: italic; white-space: pre-wrap;">"${escapeHtml(hotel.notes)}"</p>
                        </div>` : ''}

                        <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
                           style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px;
                                  background: #007AFF; color: white; border-radius: 10px; text-decoration: none;
                                  font-size: 14px; font-weight: 600; box-sizing: border-box;">
                            🧭 Route starten
                        </a>
                    </div>
                `);

                markersRef.current.push(marker);
            });
        }

        // Add activity markers (filtered by type if filter is active)
        const activitiesToShow = activeFilter === null
            ? activities
            : activeFilter === 'hotels'
                ? []
                : activities.filter(a => a.type === activeFilter);

        activitiesToShow.forEach(activity => {
            const lat = activity.latitude ?? activity.lat;
            const lon = activity.longitude ?? activity.lon;

            if (!isValidCoord(lat, lon)) return;

            const typeInfo = ACTIVITY_TYPES.find(t => t.value === activity.type) || { label: 'Aktivität', icon: '📍' };
            const typeName = typeInfo.label.split(' ').slice(1).join(' ') || typeInfo.label;
            const isCompleted = !!activity.completed;
            const markerColor = isCompleted ? '#8E8E93' : '#5856D6';

            const marker = L.marker([parseFloat(lat), parseFloat(lon)], {
                icon: createMarkerIcon(markerColor, 32),
                opacity: isCompleted ? 0.5 : 1,
            }).addTo(mapInstanceRef.current);

            const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lon}`;
            marker.bindPopup(`
                <div style="font-family: -apple-system, system-ui, sans-serif; min-width: 240px; padding: 4px;">
                    <div style="margin-bottom: 8px;">
                        <span style="display: inline-block; font-size: 11px; font-weight: 600; color: #5856D6; background: #5856D615; padding: 2px 8px; border-radius: 12px; margin-bottom: 4px;">
                            ${escapeHtml(typeName)}
                        </span>
                        <h3 style="margin: 0; font-size: 16px; font-weight: 700; color: ${popupText};">${escapeHtml(activity.title)}</h3>
                    </div>

                    ${activity.address ? `
                    <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 16px;">📍</span>
                        <span style="font-size: 13px; color: ${popupSubtext}; line-height: 1.4;">${escapeHtml(activity.address)}</span>
                    </div>` : ''}

                    ${activity.planned_date ? `
                    <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
                        <span style="font-size: 16px;">🕐</span>
                        <span style="font-size: 13px; color: ${popupSubtext}; font-weight: 500;">
                            ${formatDate(activity.planned_date)}
                        </span>
                    </div>` : ''}

                    ${activity.description || activity.notes ? `
                    <div style="margin-bottom: 12px; padding: 10px; background: ${popupBg}; border-radius: 8px;">
                        <p style="margin: 0; font-size: 13px; color: ${popupSubtext}; line-height: 1.5; white-space: pre-wrap;">${escapeHtml(activity.description || activity.notes)}</p>
                    </div>` : ''}

                    ${isCompleted ? `
                    <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 12px; padding: 8px 12px; background: #34C75920; border-radius: 8px;">
                        <span style="font-size: 14px;">✅</span>
                        <span style="font-size: 13px; font-weight: 600; color: #34C759;">Erledigt</span>
                    </div>` : ''}

                    <a href="${mapsUrl}" target="_blank" rel="noopener noreferrer"
                       style="display: flex; align-items: center; justify-content: center; gap: 6px; width: 100%; padding: 10px;
                              background: ${isCompleted ? '#8E8E93' : '#5856D6'}; color: white; border-radius: 10px; text-decoration: none;
                              font-size: 14px; font-weight: 600; box-sizing: border-box;">
                        🧭 Route starten
                    </a>
                </div>
            `);

            markersRef.current.push(marker);
        });
    }, [isMapReady, hotels, activities, activeFilter, hotelIds, activityIds, isDarkMode]);




    // Handle filter selection
    const handleFilterSelect = (filterValue) => {
        setActiveFilter(filterValue);
        setShowFilterPopup(false);
    };

    // Reset filter
    const resetFilter = () => {
        setActiveFilter(null);
    };

    // Get active filter label
    const getActiveFilterLabel = () => {
        if (activeFilter === 'hotels') return '🏨 Hotels';
        const type = ACTIVITY_TYPES.find(t => t.value === activeFilter);
        return type ? type.label : '';
    };

    // Locate user's current position
    const locateUser = useCallback((silent = false) => {
        if (!mapInstanceRef.current || !navigator.geolocation) {
            if (!silent) addToast('Standortermittlung nicht verfügbar', 'error');
            return;
        }

        setIsLocating(true);

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                // Remove previous user marker if exists
                if (userMarkerRef.current) {
                    mapInstanceRef.current.removeLayer(userMarkerRef.current);
                }

                // Create user marker (blue pulsing circle)
                if (L) {
                    const userIcon = L.divIcon({
                        html: `
                            <div style="
                                width: 20px;
                                height: 20px;
                                background: #007AFF;
                                border-radius: 50%;
                                border: 3px solid white;
                                box-shadow: 0 0 0 6px rgba(0, 122, 255, 0.3);
                                animation: pulse 2s infinite;
                            "></div>
                            <style>
                                @keyframes pulse {
                                    0%, 100% { box-shadow: 0 0 0 0 rgba(0, 122, 255, 0.7); }
                                    50% { box-shadow: 0 0 0 10px rgba(0, 122, 255, 0); }
                                }
                            </style>
                        `,
                        className: 'user-location-marker',
                        iconSize: [20, 20],
                        iconAnchor: [10, 10],
                    });

                    userMarkerRef.current = L.marker([latitude, longitude], { icon: userIcon })
                        .addTo(mapInstanceRef.current)
                        .bindPopup('📍 Dein Standort');
                }

                // Pan and zoom to user location
                mapInstanceRef.current.setView([latitude, longitude], 15);
                setIsLocating(false);
                if (!silent) addToast('Standort gefunden', 'success');
            },
            (error) => {
                setIsLocating(false);
                if (!silent) {
                    let message = 'Standort konnte nicht ermittelt werden';
                    if (error.code === error.PERMISSION_DENIED) {
                        message = 'Standortzugriff wurde verweigert';
                    }
                    addToast(message, 'error');
                }
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0,
            }
        );
    }, [addToast]);

    // Auto locate on mount if requested
    useEffect(() => {
        if (isMapReady && autoLocate) {
            locateUser(true); // silent = true so we don't spam toasts
        }
    }, [isMapReady, autoLocate, locateUser]);

    return (
        <div className="relative w-full h-full">
            {/* Map Container */}
            <div ref={mapRef} className="absolute inset-0" />



            {/* Legend and Filter (when authenticated) */}
            {isAuthenticated && (
                <div className="absolute top-4 left-4 z-10 space-y-2">
                    {/* Legend */}
                    <div className="bg-white/90 dark:bg-ios-gray-900/90
                            backdrop-blur-ios rounded-ios-lg p-3 shadow-ios text-xs space-y-2">
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-ios-orange" />
                            <span className="text-ios-gray-700 dark:text-ios-gray-300">Hotels</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-ios-indigo" />
                            <span className="text-ios-gray-700 dark:text-ios-gray-300">Aktivitäten</span>
                        </div>
                    </div>

                    {/* Filter Button */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setShowFilterPopup(!showFilterPopup)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-ios-lg shadow-ios text-sm font-medium
                                     transition-all active:scale-95 ${hasActiveFilter
                                    ? 'bg-ios-blue text-white'
                                    : 'bg-white/90 dark:bg-ios-gray-900/90 text-ios-gray-700 dark:text-ios-gray-300'
                                } backdrop-blur-ios`}
                        >
                            <Filter className="w-4 h-4" />
                            {hasActiveFilter ? getActiveFilterLabel() : 'Filter'}
                        </button>

                        {hasActiveFilter && (
                            <button
                                onClick={resetFilter}
                                className="w-8 h-8 flex items-center justify-center rounded-ios-lg bg-ios-red text-white
                                         shadow-ios transition-all active:scale-95"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Filter Popup */}
            {showFilterPopup && (
                <>
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 z-10"
                        onClick={() => setShowFilterPopup(false)}
                    />

                    {/* Popup */}
                    <div className="absolute top-[180px] left-4 z-20 w-64 bg-white dark:bg-ios-gray-900 
                                  rounded-ios-xl shadow-ios-lg overflow-hidden animate-fade-in">
                        <div className="p-3 border-b border-ios-gray-200 dark:border-ios-gray-800">
                            <h3 className="font-semibold text-ios-gray-950 dark:text-white">Karte filtern</h3>
                        </div>

                        <div className="max-h-[300px] overflow-y-auto">
                            {/* Show All Option */}
                            <button
                                onClick={() => handleFilterSelect(null)}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm
                                         transition-colors ${activeFilter === null
                                        ? 'bg-ios-blue/10 text-ios-blue'
                                        : 'text-ios-gray-700 dark:text-ios-gray-300 hover:bg-ios-gray-50 dark:hover:bg-ios-gray-800'
                                    }`}
                            >
                                <span>🗺️ Alle anzeigen</span>
                            </button>

                            {/* Hotels */}
                            <button
                                onClick={() => handleFilterSelect('hotels')}
                                disabled={categoryCounts.hotels === 0}
                                className={`w-full flex items-center justify-between px-4 py-3 text-left text-sm
                                         transition-colors disabled:opacity-40 disabled:cursor-not-allowed
                                         ${activeFilter === 'hotels'
                                        ? 'bg-ios-blue/10 text-ios-blue'
                                        : 'text-ios-gray-700 dark:text-ios-gray-300 hover:bg-ios-gray-50 dark:hover:bg-ios-gray-800'
                                    }`}
                            >
                                <span>🏨 Hotels</span>
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-ios-orange/20 text-ios-orange">
                                    {categoryCounts.hotels}
                                </span>
                            </button>

                            {/* Divider */}
                            <div className="px-4 py-2 text-xs font-medium text-ios-gray-500 bg-ios-gray-50 dark:bg-ios-gray-800">
                                Aktivitäten
                            </div>

                            {/* Activity Types */}
                            {ACTIVITY_TYPES.map(type => (
                                <button
                                    key={type.value}
                                    onClick={() => handleFilterSelect(type.value)}
                                    disabled={categoryCounts[type.value] === 0}
                                    className={getFilterButtonClass(type.value)}
                                >
                                    <span>{type.label}</span>
                                    <span className={getBadgeClass(categoryCounts[type.value])}>
                                        {categoryCounts[type.value]}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}

            {/* Bottom Right: Locate Button (above zoom controls) */}
            {showLocateButton && (
                <div className="absolute bottom-32 right-4 z-10">
                    <button
                        onClick={() => locateUser(false)}
                        disabled={isLocating}
                        className={`w-10 h-10 flex items-center justify-center rounded-ios-lg shadow-ios
                                 transition-all active:scale-95 ${isLocating
                                ? 'bg-ios-blue/50 text-white cursor-wait'
                                : 'bg-white/90 dark:bg-ios-gray-900/90 backdrop-blur-ios text-ios-blue dark:text-ios-blue hover:bg-ios-blue/10'
                            }`}
                        title="Meinen Standort anzeigen"
                    >
                        <LocateFixed className={`w-5 h-5 ${isLocating ? 'animate-pulse' : ''}`} />
                    </button>
                </div>
            )}

            {/* Top Right: Weather */}
            {showWeather && (
                <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                    {weather && weather.temp !== null && (
                        <div className="bg-ios-gray-100/95 dark:bg-ios-gray-800/95 backdrop-blur-ios
                                rounded-full px-3 py-1.5 shadow-ios flex items-center gap-1.5 text-sm font-medium
                                text-ios-gray-800 dark:text-ios-gray-200">
                            <img
                                src={`https://openweathermap.org/img/wn/${weather.icon}.png`}
                                alt={weather.description || 'Wetter'}
                                className="w-6 h-6 -my-1 drop-shadow-md dark:brightness-150 dark:contrast-125"
                            />
                            {weather.temp}°{weather.city ? ` · ${weather.city}` : ''}
                        </div>
                    )}
                </div>
            )}

            {/* Marker styles */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-marker {
                    background: transparent !important;
                    border: none !important;
                }
            `}} />
        </div>
    );
}
