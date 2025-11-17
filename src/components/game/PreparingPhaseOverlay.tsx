import type { Doc } from "../../../convex/_generated/dataModel";

interface PreparingPhaseOverlayProps {
  isActive: boolean;
  currentRoundNumber: number;
  previousRound: Doc<"rounds"> | null | undefined;
  timeRemaining: number | null;
}

export function PreparingPhaseOverlay({
  isActive,
  currentRoundNumber,
  previousRound,
  timeRemaining,
}: PreparingPhaseOverlayProps) {
  if (!isActive) return null;

  return (
    <div className="fixed inset-0 bg-sky-400 z-40">
      {/* Previous round info at top */}
      {previousRound && (
        <div className="flex justify-center pt-8 px-4">
          <div className="bg-white border-4 border-sky-900 p-4 max-w-2xl w-full">
            <article className="flex gap-4">
              <div className="flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="pixel-text text-sky-900 text-sm font-bold mb-2">
                    SONG {currentRoundNumber - 1}
                  </h3>
                  <div className="space-y-2">
                    <p className="pixel-text text-sky-900 text-xl md:text-2xl font-bold">
                      {previousRound.songData.correctTitle.toUpperCase()}
                    </p>
                    <p className="pixel-text text-sky-700 text-lg md:text-xl">
                      {previousRound.songData.correctArtist.toUpperCase()}
                    </p>
                  </div>
                </div>
              </div>

              {previousRound.songData.albumArt && (
                <div className="flex flex-col items-end gap-2">
                  <img
                    src={previousRound.songData.albumArt}
                    alt={`Album art for ${previousRound.songData.correctTitle} by ${previousRound.songData.correctArtist}`}
                    className="w-24 h-24 border-4 border-sky-900"
                  />
                </div>
              )}
            </article>
          </div>
        </div>
      )}

      {/* Countdown centered */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="pixel-text text-white text-2xl md:text-3xl">
            ROUND {currentRoundNumber}
          </p>
          {timeRemaining !== null && (
            <p className="pixel-text text-white text-6xl md:text-8xl mt-12">
              {timeRemaining}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
