// Sound enabled state (persisted in localStorage)
const SOUND_ENABLED_KEY = "soundEffectsEnabled";

function isSoundEnabled(): boolean {
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "true"; // Default to enabled
}

function setSoundEnabled(enabled: boolean): void {
  localStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());
  // Dispatch event so components can react to changes
  window.dispatchEvent(new CustomEvent("soundToggle", { detail: { enabled } }));
}

/**
 * Toggle sound effects on/off
 * @returns New enabled state
 */
export function toggleSound(): boolean {
  const newState = !isSoundEnabled();
  setSoundEnabled(newState);
  return newState;
}

/**
 * Get current sound enabled state
 */
export function getSoundEnabled(): boolean {
  return isSoundEnabled();
}

/**
 * Play a sound effect
 * @param soundPath - Path to the sound file relative to the public directory
 * @param volume - Volume level between 0 and 1 (default: 1)
 */
export function playSound(soundPath: string, volume: number = 1): void {
  if (!isSoundEnabled()) return;

  try {
    const audio = new Audio(soundPath);
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.play().catch((error) => {
      // Silently fail if sound can't play (e.g., user hasn't interacted with page yet)
      console.warn("Failed to play sound:", error);
    });
  } catch (error) {
    console.warn("Failed to create audio:", error);
  }
}

// Track which click sound to play next
let clickSoundIndex = 0;

/**
 * Play alternating typing click sounds
 * @param volume - Volume level between 0 and 1 (default: 0.2)
 */
export function playTypingSound(volume: number = 0.2): void {
  const sounds = ["/sounds/click1.ogg", "/sounds/click2.ogg"];
  playSound(sounds[clickSoundIndex], volume);
  clickSoundIndex = (clickSoundIndex + 1) % sounds.length;
}
