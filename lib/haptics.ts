/**
 * Safe cross-platform Haptic Feedback Engine.
 * Handles Android vibration patterns and gracefully handles iOS (where navigator.vibrate is unsupported).
 */

export type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error' | 'selection';

export function triggerHaptic(type: HapticPattern = 'light'): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  // Check if vibration is enabled in preferences
  try {
    const isMuted = localStorage.getItem('almaestro_haptics_muted') === 'true';
    if (isMuted) return false;
  } catch {}

  if (!('vibrate' in navigator) || typeof navigator.vibrate !== 'function') {
    return false; // Safely ignore on iOS Safari
  }

  try {
    switch (type) {
      case 'selection':
      case 'light':
        return navigator.vibrate(15);
      case 'medium':
        return navigator.vibrate(35);
      case 'heavy':
        return navigator.vibrate(60);
      case 'success':
        return navigator.vibrate([25, 40, 35]);
      case 'warning':
        return navigator.vibrate([40, 50, 40]);
      case 'error':
        return navigator.vibrate([60, 50, 60, 50, 70]);
      default:
        return navigator.vibrate(25);
    }
  } catch {
    return false;
  }
}

export function setHapticsMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('almaestro_haptics_muted', muted ? 'true' : 'false');
  } catch {}
}

export function isHapticsMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('almaestro_haptics_muted') === 'true';
  } catch {
    return false;
  }
}
