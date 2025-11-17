import { PixelButton, PixelInput, HintDisplay } from "@/components";
import type { Doc } from "../../../convex/_generated/dataModel";

interface AnswerFormProps {
  currentRound: Doc<"rounds">;
  currentPlayer: Doc<"players">;
  roundAnswers: Doc<"answers">[] | undefined;
  phase: string;
  artistGuess: string;
  titleGuess: string;
  setArtistGuess: (value: string) => void;
  setTitleGuess: (value: string) => void;
  artistLocked: boolean;
  titleLocked: boolean;
  isFullyLocked: boolean;
  shakeArtist: boolean;
  shakeTitle: boolean;
  revealedArtistLetters: { index: number; letter: string }[];
  revealedTitleLetters: { index: number; letter: string }[];
  hintsRemaining: number | null;
  error: string;
  artistInputRef: React.RefObject<HTMLInputElement>;
  titleInputRef: React.RefObject<HTMLInputElement>;
  onSubmit: () => void;
  onUseHint: () => void;
}

export function AnswerForm({
  currentRound,
  currentPlayer,
  roundAnswers,
  phase,
  artistGuess,
  titleGuess,
  setArtistGuess,
  setTitleGuess,
  artistLocked,
  titleLocked,
  isFullyLocked,
  shakeArtist,
  shakeTitle,
  revealedArtistLetters,
  revealedTitleLetters,
  hintsRemaining,
  error,
  artistInputRef,
  titleInputRef,
  onSubmit,
  onUseHint,
}: AnswerFormProps) {
  return (
    <div key={currentRound._id} className="bg-white border-4 border-sky-900 p-6">
      <style>
        {`
          @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-10px); }
            75% { transform: translateX(10px); }
          }
          .shake {
            animation: shake 0.3s ease-in-out;
          }
        `}
      </style>

      <div className="space-y-6">
        <div className={shakeArtist ? "shake" : ""}>
          {revealedArtistLetters.length > 0 && !artistLocked && (
            <div className="mb-2 bg-yellow-50 border-2 border-yellow-600 p-2">
              <HintDisplay
                text={currentRound.songData.correctArtist}
                revealedLetters={revealedArtistLetters}
              />
            </div>
          )}
          <PixelInput
            ref={artistInputRef}
            type="text"
            label="ARTIST NAME"
            placeholder="WHO IS THE ARTIST?"
            value={artistGuess}
            onChange={(e) => !artistLocked && setArtistGuess(e.target.value)}
            onEnterPress={!isFullyLocked ? onSubmit : undefined}
            className={`w-full ${
              artistLocked
                ? "!border-green-600 !border-4"
                : shakeArtist
                  ? "!border-red-600 !border-4"
                  : ""
            }`}
            disabled={artistLocked}
            aria-label="Artist name"
            aria-describedby={artistLocked ? "artist-correct" : undefined}
            autoFocus
          />
          {artistLocked && (
            <p id="artist-correct" className="pixel-text text-green-700 text-xs mt-1 font-bold" role="status">
              CORRECT!
            </p>
          )}
        </div>

        <div className={shakeTitle ? "shake" : ""}>
          {revealedTitleLetters.length > 0 && !titleLocked && (
            <div className="mb-2 bg-yellow-50 border-2 border-yellow-600 p-2">
              <HintDisplay
                text={currentRound.songData.correctTitle}
                revealedLetters={revealedTitleLetters}
              />
            </div>
          )}
          <PixelInput
            ref={titleInputRef}
            type="text"
            label="SONG TITLE"
            placeholder="WHAT IS THE SONG?"
            value={titleGuess}
            onChange={(e) => !titleLocked && setTitleGuess(e.target.value)}
            onEnterPress={!isFullyLocked ? onSubmit : undefined}
            className={`w-full ${
              titleLocked
                ? "!border-green-600 !border-4"
                : shakeTitle
                  ? "!border-red-600 !border-4"
                  : ""
            }`}
            disabled={titleLocked}
            aria-label="Song title"
            aria-describedby={titleLocked ? "title-correct" : error ? "answer-error" : undefined}
          />
          {titleLocked && (
            <p id="title-correct" className="pixel-text text-green-700 text-xs mt-1 font-bold" role="status">
              CORRECT!
            </p>
          )}
        </div>

        {!isFullyLocked && (
          <>
            <PixelButton
              onClick={onSubmit}
              className="w-full"
              disabled={phase !== "active"}
              aria-label={artistLocked || titleLocked ? "Try again with another guess" : "Submit your answer"}
            >
              {artistLocked || titleLocked ? "TRY AGAIN" : "SUBMIT ANSWER"}
            </PixelButton>
            <PixelButton
              onClick={onUseHint}
              className="w-full"
              disabled={phase !== "active" || hintsRemaining === 0}
              aria-label={`Use hint (${hintsRemaining} remaining)`}
            >
              <span className="flex items-center justify-center gap-2">
                <img src="/light-bulb.svg" alt="" width="20" height="20" aria-hidden="true" />
                {hintsRemaining === 0 ? "OUT OF HINTS!" : `HINT (${hintsRemaining})`}
              </span>
            </PixelButton>
          </>
        )}

        {error && (
          <div
            id="answer-error"
            role="alert"
            className={`pixel-text text-sm p-3 border-2 ${
              error.includes("correct")
                ? "bg-blue-50 border-blue-600 text-blue-900"
                : "bg-red-50 border-red-600 text-red-900"
            }`}
          >
            {error}
          </div>
        )}

        {/* Show stats when fully locked */}
        {isFullyLocked && roundAnswers && (
          <div className="bg-green-100 border-4 border-green-600 p-6 text-center">
            {(() => {
              const myAnswer = roundAnswers.find((a) => a.playerId === currentPlayer._id);
              const points = myAnswer?.points || 0;
              const message = points >= 900 ? "INCREDIBLE!" : points >= 700 ? "GREAT!" : points >= 500 ? "NICE!" : "GOT IT!";

              return (
                <div className="space-y-3">
                  <p className="pixel-text text-green-600 text-sm font-bold">
                    {message}
                  </p>
                  <p className="pixel-text text-green-900 text-4xl md:text-5xl font-bold">
                    {points}
                  </p>
                  <p className="pixel-text text-green-700 text-xs">
                    POINTS EARNED
                  </p>
                </div>
              );
            })()}
          </div>
        )}
      </div>
    </div>
  );
}
