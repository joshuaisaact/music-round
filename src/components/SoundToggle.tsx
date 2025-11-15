import { useState, useEffect } from "react";
import { toggleSound, getSoundEnabled } from "@/lib/audio";
import { ClientOnly } from "./ClientOnly";
import { Volume2Icon, VolumeXIcon } from "raster-react";

/**
 * A floating button that toggles sound effects on/off
 * Appears in the bottom left corner of every page
 */
export const SoundToggle = () => {
  const [soundEnabled, setSoundEnabled] = useState(getSoundEnabled());
  const [showMessage, setShowMessage] = useState(false);

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

    // Show message
    setShowMessage(true);
    setTimeout(() => setShowMessage(false), 2000);
  };

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-4">
      <button
        onClick={handleToggle}
        className="p-3 bg-transparent hover:opacity-80 transition-opacity focus:outline-none focus:ring-4 focus:ring-yellow-400 cursor-pointer"
        aria-label={soundEnabled ? "Mute sound effects" : "Unmute sound effects"}
        title={soundEnabled ? "Sound effects on" : "Sound effects off"}
      >
        <ClientOnly>
          {soundEnabled ? (
            <Volume2Icon size={32} color="#ffffff" />
          ) : (
            <VolumeXIcon size={32} color="#ffffff" />
          )}
        </ClientOnly>
      </button>

      {/* Message notification */}
      {showMessage && (
        <p className="pixel-text text-white text-2xl uppercase whitespace-nowrap">
          SOUND EFFECTS {soundEnabled ? "ON" : "OFF"}
        </p>
      )}
    </div>
  );
};
