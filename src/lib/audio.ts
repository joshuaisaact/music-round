// Sound enabled state (persisted in localStorage)
const SOUND_ENABLED_KEY = "soundEffectsEnabled";

// Global background music audio element
let backgroundMusic: HTMLAudioElement | null = null;

function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true; // Default to enabled during SSR
  const stored = localStorage.getItem(SOUND_ENABLED_KEY);
  return stored === null ? true : stored === "true"; // Default to enabled
}

function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return; // Skip during SSR
  localStorage.setItem(SOUND_ENABLED_KEY, enabled.toString());

  // Control background music
  if (backgroundMusic) {
    if (enabled) {
      backgroundMusic.play().catch(console.warn);
    } else {
      backgroundMusic.pause();
    }
  }

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
  if (typeof window === 'undefined') return; // Skip during SSR
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

/**
 * Start background music
 * @param musicPath - Path to the music file relative to the public directory
 * @param volume - Volume level between 0 and 1 (default: 0.3)
 */
export function startBackgroundMusic(musicPath: string, volume: number = 0.3): void {
  if (typeof window === 'undefined') return; // Skip during SSR

  // Stop any existing music
  stopBackgroundMusic();

  try {
    backgroundMusic = new Audio(musicPath);
    backgroundMusic.loop = true;
    backgroundMusic.volume = Math.max(0, Math.min(1, volume));

    // Only play if sound is enabled
    if (isSoundEnabled()) {
      backgroundMusic.play().catch((error) => {
        console.warn("Failed to play background music:", error);
      });
    }
  } catch (error) {
    console.warn("Failed to create background music:", error);
  }
}

/**
 * Stop background music
 */
export function stopBackgroundMusic(): void {
  if (backgroundMusic) {
    backgroundMusic.pause();
    backgroundMusic = null;
  }
}
