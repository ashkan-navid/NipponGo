/**
 * Haptic feedback utilities
 * Uses navigator.vibrate() where available (Android).
 * On iOS Safari: no vibration API support — CSS active:scale-95 serves as tactile substitute.
 * All functions are no-ops when API is unavailable.
 */

const canVibrate = typeof navigator !== 'undefined' && 'vibrate' in navigator;

export function hapticLight() {
    if (canVibrate) navigator.vibrate(10);
}

export function hapticMedium() {
    if (canVibrate) navigator.vibrate(25);
}

export function hapticSuccess() {
    if (canVibrate) navigator.vibrate([10, 30, 10]);
}

export function hapticError() {
    if (canVibrate) navigator.vibrate([30, 50, 30]);
}
