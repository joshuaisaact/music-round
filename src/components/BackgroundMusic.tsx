import { useEffect } from "react";
import { startBackgroundMusic, stopBackgroundMusic } from "@/lib/audio";

/**
 * Background music player that starts on mount and stops on unmount
 * Also displays track attribution in bottom right corner
 */
export const BackgroundMusic = () => {
  useEffect(() => {
    // Try to start music immediately
    startBackgroundMusic("/game-plan.mp3", 0.3);

    // If autoplay is blocked, start on first user interaction
    const handleFirstInteraction = () => {
      startBackgroundMusic("/game-plan.mp3", 0.3);
      // Remove listeners after first interaction
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
    };

    document.addEventListener("click", handleFirstInteraction);
    document.addEventListener("keydown", handleFirstInteraction);

    return () => {
      document.removeEventListener("click", handleFirstInteraction);
      document.removeEventListener("keydown", handleFirstInteraction);
      // Don't stop music on unmount - let it continue across page navigation
    };
  }, []);

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <p className="pixel-text text-white text-xs opacity-70">
        Game Plan by Bad Snacks
      </p>
    </div>
  );
};
