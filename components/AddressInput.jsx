'use client';

import { useState, useEffect, useRef } from 'react';
import { MapPin, Search, Loader2, X, Check } from 'lucide-react';

export default function AddressInput({
    value = '',
    onChange,
    onCoordinatesChange,
    placeholder = 'Adresse eingeben oder einfügen...',
    className = '',
    disabled = false,
    entityName = '',
}) {
    const [inputValue, setInputValue] = useState(value);
    const [suggestions, setSuggestions] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedAddress, setSelectedAddress] = useState(null);
    const [geocodeStatus, setGeocodeStatus] = useState(null); // 'success', 'error', null
    const inputRef = useRef(null);
    const suggestionsRef = useRef(null);
    const debounceRef = useRef(null);

    // Update input when value prop changes
    useEffect(() => {
        if (value !== inputValue) {
            setInputValue(value);
        }
    }, [value]);

    // Close suggestions when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                inputRef.current &&
                !inputRef.current.contains(event.target) &&
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Fetch autocomplete suggestions
    const fetchSuggestions = async (query) => {
        if (!query || query.length < 3) {
            setSuggestions([]);
            return;
        }

        setIsLoading(true);
        try {
            const nameParam = entityName ? `&name=${encodeURIComponent(entityName)}` : '';
            const response = await fetch(
                `/api/geocode?action=autocomplete&address=${encodeURIComponent(query)}${nameParam}`
            );
            const data = await response.json();

            if (data.suggestions) {
                setSuggestions(data.suggestions);
                setShowSuggestions(true);
            }
        } catch (error) {
            console.error('Autocomplete error:', error);
            setSuggestions([]);
        } finally {
            setIsLoading(false);
        }
    };

    // Geocode the current address
    const geocodeAddress = async (address) => {
        if (!address || address.length < 5) {
            setGeocodeStatus(null);
            onCoordinatesChange?.(null, null);
            return;
        }

        setIsLoading(true);
        setGeocodeStatus(null);

        try {
            const nameParam = entityName ? `&name=${encodeURIComponent(entityName)}` : '';
            const response = await fetch(
                `/api/geocode?address=${encodeURIComponent(address)}${nameParam}`
            );
            const data = await response.json();

            if (data.found) {
                setGeocodeStatus('success');
                setSelectedAddress(data.display_name);
                onCoordinatesChange?.(data.lat, data.lon);
            } else {
                setGeocodeStatus('error');
                onCoordinatesChange?.(null, null);
            }
        } catch (error) {
            console.error('Geocode error:', error);
            setGeocodeStatus('error');
            onCoordinatesChange?.(null, null);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle input change with debounced autocomplete
    const handleInputChange = (e) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange?.(newValue);
        setGeocodeStatus(null);
        setSelectedAddress(null);

        // Clear previous debounce
        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        // Debounce autocomplete fetch
        debounceRef.current = setTimeout(() => {
            fetchSuggestions(newValue);
        }, 300);
    };

    // Handle suggestion selection
    const handleSelectSuggestion = (suggestion) => {
        setInputValue(suggestion.display_name);
        onChange?.(suggestion.display_name);
        onCoordinatesChange?.(suggestion.lat, suggestion.lon);
        setSelectedAddress(suggestion.display_name);
        setGeocodeStatus('success');
        setSuggestions([]);
        setShowSuggestions(false);
    };

    // Handle blur - geocode if no suggestion was selected
    const handleBlur = () => {
        // Delay to allow suggestion click to register
        setTimeout(() => {
            if (inputValue && !selectedAddress) {
                geocodeAddress(inputValue);
            }
            setShowSuggestions(false);
        }, 200);
    };

    // Clear input
    const handleClear = () => {
        setInputValue('');
        onChange?.('');
        onCoordinatesChange?.(null, null);
        setSelectedAddress(null);
        setGeocodeStatus(null);
        setSuggestions([]);
        inputRef.current?.focus();
    };

    // Smart Paste: Intercept Google Maps URLs
    const handlePaste = async (e) => {
        const pastedText = e.clipboardData.getData('text');
        if (!pastedText) return;

        // Check if it's a Google Maps URL
        if (pastedText.includes('google.com/maps') || pastedText.includes('maps.app.goo.gl') || pastedText.includes('goo.gl/maps')) {
            e.preventDefault(); // Prevent normal pasting

            let urlToProcess = pastedText.trim();

            // For short URLs, resolve via server-side API first
            if (urlToProcess.includes('maps.app.goo.gl') || urlToProcess.includes('goo.gl/maps')) {
                setGeocodeStatus('loading');
                try {
                    const res = await fetch(`/api/geocode?action=resolve-url&url=${encodeURIComponent(urlToProcess)}`);
                    const data = await res.json();
                    if (data.resolvedUrl && data.resolvedUrl !== urlToProcess) {
                        urlToProcess = data.resolvedUrl;
                    }
                } catch (err) {
                    console.warn('Short URL resolution failed, trying raw URL', err);
                }
            }

            let extractedName = null;
            let extractedLat = null;
            let extractedLon = null;

            try {
                // 1. Try /@lat,lon pattern (most common Google Maps format)
                const coordsMatch = urlToProcess.match(/@(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                if (coordsMatch) {
                    extractedLat = parseFloat(coordsMatch[1]);
                    extractedLon = parseFloat(coordsMatch[2]);
                }

                // 2. Try !3dlat!4dlon pattern (Google Maps embed URLs)
                if (!extractedLat) {
                    const embedMatch = urlToProcess.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
                    if (embedMatch) {
                        extractedLat = parseFloat(embedMatch[1]);
                        extractedLon = parseFloat(embedMatch[2]);
                    }
                }

                // 3. Try query parameter ?q=lat,lon
                if (!extractedLat) {
                    const qMatch = urlToProcess.match(/[?&]q=(-?\d+\.?\d*),(-?\d+\.?\d*)/);
                    if (qMatch) {
                        extractedLat = parseFloat(qMatch[1]);
                        extractedLon = parseFloat(qMatch[2]);
                    }
                }

                // 4. Try to extract Place Name: /place/Tokyo+Tower/
                const placeMatch = urlToProcess.match(/\/place\/([^/@]+)/);
                if (placeMatch) {
                    extractedName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
                }

                if (extractedName) {
                    setInputValue(extractedName);
                    onChange?.(extractedName);
                    setSelectedAddress(extractedName);

                    if (extractedLat && extractedLon) {
                        onCoordinatesChange?.(extractedLat, extractedLon);
                        setGeocodeStatus('success');
                    } else {
                        // Fallback to geocoding the extracted name
                        geocodeAddress(extractedName);
                    }
                } else if (extractedLat && extractedLon) {
                    // Just coordinates, no name found — do reverse geocode for display name
                    const coordString = `${extractedLat.toFixed(6)}, ${extractedLon.toFixed(6)}`;
                    setInputValue(coordString);
                    onChange?.(coordString);
                    setSelectedAddress(coordString);
                    onCoordinatesChange?.(extractedLat, extractedLon);
                    setGeocodeStatus('success');
                } else {
                    // Could not extract anything useful, paste as-is and try geocoding
                    setInputValue(pastedText);
                    onChange?.(pastedText);
                    setGeocodeStatus(null);
                }
            } catch (err) {
                console.error("Error parsing pasted maps link", err);
                setInputValue(pastedText);
                onChange?.(pastedText);
                setGeocodeStatus(null);
            }
        }
    };

    return (
        <div className={`relative ${className}`}>
            <div className="relative">
                {/* Input Field */}
                <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ios-gray-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={inputValue}
                        onChange={handleInputChange}
                        onFocus={() => inputValue.length >= 3 && setShowSuggestions(true)}
                        onBlur={handleBlur}
                        onPaste={handlePaste}
                        placeholder={placeholder}
                        disabled={disabled}
                        className="input-ios pl-10 pr-20"
                    />

                    {/* Status indicators */}
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
                        {isLoading && (
                            <Loader2 className="w-4 h-4 text-ios-gray-400 animate-spin" />
                        )}
                        {geocodeStatus === 'success' && !isLoading && (
                            <Check className="w-4 h-4 text-ios-green" />
                        )}
                        {geocodeStatus === 'error' && !isLoading && (
                            <span className="text-xs text-ios-red">Nicht gefunden</span>
                        )}
                        {inputValue && (
                            <button
                                type="button"
                                onClick={handleClear}
                                className="p-1 hover:bg-ios-gray-200 dark:hover:bg-ios-gray-700 rounded-full transition-colors"
                            >
                                <X className="w-4 h-4 text-ios-gray-400" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                    <div
                        ref={suggestionsRef}
                        className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-ios-gray-900 
                                 rounded-ios-lg shadow-ios-lg border border-ios-gray-200 dark:border-ios-gray-700
                                 max-h-[200px] overflow-y-auto z-50"
                    >
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                type="button"
                                onClick={() => handleSelectSuggestion(suggestion)}
                                className="w-full px-4 py-3 text-left text-sm text-ios-gray-700 dark:text-ios-gray-300
                                         hover:bg-ios-gray-50 dark:hover:bg-ios-gray-800 
                                         border-b border-ios-gray-100 dark:border-ios-gray-800 last:border-b-0
                                         transition-colors"
                            >
                                <div className="flex items-start gap-2">
                                    <MapPin className="w-4 h-4 text-ios-gray-400 mt-0.5 flex-shrink-0" />
                                    <span className="line-clamp-2">{suggestion.display_name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Helper text */}
            <p className="mt-1 text-xs text-ios-gray-500">
                Adresse eingeben oder aus Google Maps kopieren und einfügen
            </p>
        </div>
    );
}
