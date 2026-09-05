/**
 * Synthesized Web Audio API Sound Effects Engine.
 * Ultra-low latency, zero external asset dependencies, crystal-clear sounds.
 * Automatically unlocks AudioContext on first user interaction gesture.
 */

let sharedAudioCtx: AudioContext | null = null;
let isUnlocked = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!sharedAudioCtx) {
    const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioCtxClass) {
      sharedAudioCtx = new AudioCtxClass();
    }
  }
  return sharedAudioCtx;
}

// Auto-unlock AudioContext on first user interaction gesture (touch, click, pointerdown)
export function initAudioUnlock() {
  if (typeof window === 'undefined' || isUnlocked) return;

  const unlock = () => {
    const ctx = getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') {
        ctx.resume().then(() => {
          isUnlocked = true;
        }).catch(() => {});
      } else {
        isUnlocked = true;
      }
    }
    window.removeEventListener('pointerdown', unlock);
    window.removeEventListener('touchstart', unlock);
    window.removeEventListener('keydown', unlock);
  };

  window.addEventListener('pointerdown', unlock, { once: true, passive: true });
  window.addEventListener('touchstart', unlock, { once: true, passive: true });
  window.addEventListener('keydown', unlock, { once: true, passive: true });
}

export function isSoundMuted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('almaestro_sound_muted') === 'true';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('almaestro_sound_muted', muted ? 'true' : 'false');
  } catch {}
}

/**
 * 🔊 Play a soft, premium button click / tab pop
 */
export function playPopClick() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    const now = ctx.currentTime;
    osc.frequency.setValueAtTime(600, now);
    osc.frequency.exponentialRampToValueAtTime(850, now + 0.05);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.05);
  } catch {}
}

/**
 * 🎵 Play a rich, satisfying 2-tone chime for Attendance Success
 */
export function playSuccessChime() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    // Note 1: E5 (659.25 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(659.25, now);
    gain1.gain.setValueAtTime(0.18, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.18);

    // Note 2: B5 (987.77 Hz) - slight delay
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(987.77, now + 0.1);
    gain2.gain.setValueAtTime(0.22, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.35);
  } catch {}
}

/**
 * 🏆 Play an achievement / full grade fanfare (3 uplifting chords)
 */
export function playAchievementFanfare() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;
    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6

    notes.forEach((freq, idx) => {
      const startTime = now + idx * 0.08;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      const duration = idx === notes.length - 1 ? 0.45 : 0.15;
      gain.gain.setValueAtTime(0.15, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + duration);
    });
  } catch {}
}

/**
 * ⚠️ Play a gentle double-pulse warning tone
 */
export function playWarningTone() {
  if (isSoundMuted()) return;
  try {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();

    const now = ctx.currentTime;

    [0, 0.12].forEach((delay) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(340, now + delay);
      osc.frequency.exponentialRampToValueAtTime(280, now + delay + 0.09);

      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.09);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + delay);
      osc.stop(now + delay + 0.09);
    });
  } catch {}
}

export const soundFX = {
  playSuccessChime,
  playWarningTone,
  playAchievementFanfare,
  playPopClick,
  isSoundMuted,
  setSoundMuted,
};

export default soundFX;
