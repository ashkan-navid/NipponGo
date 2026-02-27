'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

const useThemeStore = create(
    persist(
        (set, get) => ({
            isDarkMode: false,

            toggleDarkMode: () => {
                const newValue = !get().isDarkMode;
                set({ isDarkMode: newValue });

                // Update document class
                if (typeof document !== 'undefined') {
                    if (newValue) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            },

            setDarkMode: (value) => {
                set({ isDarkMode: value });

                if (typeof document !== 'undefined') {
                    if (value) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            },

            // Initialize theme on app load
            initializeTheme: () => {
                const { isDarkMode } = get();
                if (typeof document !== 'undefined') {
                    if (isDarkMode) {
                        document.documentElement.classList.add('dark');
                    } else {
                        document.documentElement.classList.remove('dark');
                    }
                }
            },
        }),
        {
            name: 'theme-storage',
        }
    )
);

export default useThemeStore;
