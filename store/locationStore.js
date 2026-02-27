'use client';

import { create } from 'zustand';

const useLocationStore = create((set, get) => ({
    // Current user's location
    currentLocation: null,
    locationError: null,
    isWatching: false,
    watchId: null,

    // Set current location
    setCurrentLocation: (location) => set({
        currentLocation: location,
        locationError: null,
    }),

    // Set location error
    setLocationError: (error) => set({ locationError: error }),

    // Start watching location (for own position on map + weather)
    startWatchingLocation: () => {
        if (!navigator.geolocation) {
            set({ locationError: 'Geolocation is not supported' });
            return;
        }

        // First get immediate position
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                };
                set({ currentLocation: location, locationError: null });
            },
            (error) => {
                console.error('Geolocation error:', error);
                set({ locationError: error.message });
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 60000,
            }
        );

        // Then start watching
        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                const location = {
                    lat: position.coords.latitude,
                    lon: position.coords.longitude,
                    accuracy: position.coords.accuracy,
                    timestamp: position.timestamp,
                };
                set({ currentLocation: location, locationError: null, isWatching: true });
            },
            (error) => {
                console.error('Watch position error:', error);
                set({ locationError: error.message });
            },
            {
                enableHighAccuracy: true,
                timeout: 30000,
                maximumAge: 5000,
            }
        );

        set({ watchId, isWatching: true });
    },

    // Stop watching location
    stopWatchingLocation: () => {
        const { watchId } = get();
        if (watchId !== null) {
            navigator.geolocation.clearWatch(watchId);
            set({ watchId: null, isWatching: false });
        }
    },

}));

export default useLocationStore;
