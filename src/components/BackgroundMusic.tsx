import { useEffect } from "react";
import { startBackgroundMusic, stopBackgroundMusic } from "@/lib/audio";

/**
 * Background music player that starts on mount and stops on unmount
 * Also displays track attribution in bottom right corner
 */
export const BackgroundMusic = () => {
  useEffect(() => {
    startBackgroundMusic("/game-plan.mp3", 0.3);

    return () => {
      stopBackgroundMusic();
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
