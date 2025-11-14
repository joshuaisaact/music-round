import { useState, useEffect } from "react";
import { toggleSound, getSoundEnabled } from "@/lib/audio";
import { Volume2Icon, VolumeXIcon } from "raster-react";

/**
 * A floating button that toggles sound effects on/off
 * Appears in the bottom left corner of every page
 */
export const SoundToggle = () => {
  const [soundEnabled, setSoundEnabled] = useState(getSoundEnabled());

  useEffect(() => {
    // Listen for sound toggle events from other sources
    const handleSoundToggle = (event: CustomEvent<{ enabled: boolean }>) => {
      setSoundEnabled(event.detail.enabled);
    };

    window.addEventListener("soundToggle", handleSoundToggle as EventListener);
    return () => {
      window.removeEventListener("soundToggle", handleSoundToggle as EventListener);
    };
  }, []);

  const handleToggle = () => {
    const newState = toggleSound();
    setSoundEnabled(newState);
  };

  return (
    <button
      onClick={handleToggle}
      className="fixed bottom-4 left-4 z-50 p-3 bg-transparent hover:opacity-80 transition-opacity focus:outline-none focus:ring-4 focus:ring-yellow-400 cursor-pointer"
      aria-label={soundEnabled ? "Mute sound effects" : "Unmute sound effects"}
      title={soundEnabled ? "Sound effects on" : "Sound effects off"}
    >
      {soundEnabled ? (
        <Volume2Icon size={32} color="#ffffff" />
      ) : (
        <VolumeXIcon size={32} color="#ffffff" />
      )}
    </button>
  );
};
