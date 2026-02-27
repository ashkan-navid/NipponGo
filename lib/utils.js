export function capitalizeUsername(username) {
    if (!username) return '';
    return username.charAt(0).toUpperCase() + username.slice(1);
}

export function getRelativeTimeDe(timestamp) {
    if (!timestamp) return '';

    // Accept either unix timestamp (seconds), ms timestamp, or date string
    const timeMs = typeof timestamp === 'number' && timestamp < 1e12
        ? timestamp * 1000
        : new Date(timestamp).getTime();

    const now = Date.now();
    const diffInSeconds = Math.floor((now - timeMs) / 1000);

    if (diffInSeconds < 60) {
        return 'vor < 1 Minute';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);

    if (diffInMinutes === 1) {
        return 'vor 1 Minute';
    }
    if (diffInMinutes < 60) {
        return `vor ${diffInMinutes} Minuten`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours === 1) {
        return 'vor 1 Stunde';
    }
    if (diffInHours < 24) {
        return `vor ${diffInHours} Stunden`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays === 1) {
        return 'vor 1 Tag';
    }
    return `vor ${diffInDays} Tagen`;
}
